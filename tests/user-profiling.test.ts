import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { buildXlsx, safeText, toCsv } from "../src/lib/analytics/export";
import { audienceLabel, audienceRows, userReportArgs, EMPTY_AUDIENCE_FILTERS } from "../src/features/admin-stats/audience";
import { buildProfileUpdatePatch, countryFromPhone, DEPARTMENTS, INDUSTRIES, hasWorkProfile, isIdentityProfileComplete, isWorkProfileSchemaUnavailable, validateWorkProfile } from "../src/features/profile/workProfile";

const migration = readFileSync(new URL("../drizzle/migrations/0008_user_profiling_audience.sql", import.meta.url), "utf8");
const authMigration = readFileSync(new URL("../drizzle/migrations/0000_phone_otp_auth.sql", import.meta.url), "utf8");

describe("work profile", () => {
  it("exposes every requested stable department and industry choice", () => {
    expect(DEPARTMENTS.map(([id]) => id)).toHaveLength(15);
    expect(INDUSTRIES.map(([id]) => id)).toHaveLength(14);
    expect(DEPARTMENTS.at(-1)?.[0]).toBe("other");
    expect(INDUSTRIES.at(-1)?.[0]).toBe("other");
    expect(DEPARTMENTS.map(([id]) => id)).not.toContain("product");
    expect(DEPARTMENTS.map(([id]) => id)).not.toContain("administration");
    expect(DEPARTMENTS.map(([id]) => id)).not.toContain("not_currently_working");
    expect(INDUSTRIES.map(([id]) => id)).not.toContain("agriculture");
    expect(INDUSTRIES.map(([id]) => id)).not.toContain("nonprofit");
    expect(INDUSTRIES.map(([id]) => id)).not.toContain("not_applicable");
    expect(migration).not.toContain("not_currently_working");
    expect(migration).not.toContain("not_applicable");
  });
  it("requires both choices and custom text only for Other, normalizing and limiting it", () => {
    expect(Object.keys(validateWorkProfile({ department: null, department_other: null, industry: null, industry_other: null }).errors)).toEqual(["department", "industry"]);
    expect(validateWorkProfile({ department: "other", department_other: "  Sales  Team ", industry: "other", industry_other: "" }).value.department_other).toBe("Sales Team");
    expect(validateWorkProfile({ department: "other", department_other: "", industry: "other", industry_other: "x" }).errors.department_other).toBe("required");
    expect(validateWorkProfile({ department: "other", department_other: "x".repeat(81), industry: "other", industry_other: "y" }).errors.department_other).toBe("too_long");
    expect(validateWorkProfile({ department: "bad", department_other: null, industry: "other", industry_other: "Finance" }).errors.department).toBe("required");
  });
  it("keeps previously complete users eligible for game routes without work fields", () => {
    const existing = { first_name: "Synthetic", last_name: "Player", gender: "female" };
    expect(isIdentityProfileComplete(existing)).toBe(true);
    expect(hasWorkProfile(existing)).toBe(false);
    expect(isIdentityProfileComplete({ first_name: "Synthetic", last_name: "Player", gender: null })).toBe(false);
  });
  it("recognizes only missing work-profile columns as an old-backend schema mismatch", () => {
    expect(isWorkProfileSchemaUnavailable({ code: "PGRST204", message: "Could not find the 'department' column in the schema cache" })).toBe(true);
    expect(isWorkProfileSchemaUnavailable({ code: "42703", message: "column profiles.industry does not exist" })).toBe(true);
    expect(isWorkProfileSchemaUnavailable({ code: "42501", message: "permission denied for column department of relation profiles" })).toBe(true);
    expect(isWorkProfileSchemaUnavailable({ code: "PGRST116", message: "network error" })).toBe(false);
  });
  it("derives only unambiguous calling-code countries and handles missing or shared prefixes", () => {
    expect(countryFromPhone("+201001234567")).toBe("EG");
    expect(countryFromPhone("+442079460123")).toBe("GB");
    expect(countryFromPhone("+12025550123")).toBe("ambiguous");
    expect(countryFromPhone("+77015550123")).toBe("ambiguous");
    expect(countryFromPhone(null)).toBe("unknown");
    expect(countryFromPhone("01001234567")).toBe("unknown");
  });
  it("keeps updates to the explicit profile allowlist and rejects malformed work values", () => {
    const { patch, error } = buildProfileUpdatePatch(null, { first_name: "A", display_name: "A", department: "sales", department_other: null, industry: "technology_telecom", industry_other: null, phone: "+201000000000", role: "admin" } as never);
    expect(error).toBeNull();
    expect(Object.keys(patch).sort()).toEqual(["department", "department_other", "display_name", "first_name", "industry", "industry_other"]);
    expect(buildProfileUpdatePatch(null, { department: "other", industry: "unknown" } as never).error).toBe("invalid_work_profile");
  });
});

describe("admin audience reporting", () => {
  it("includes server filters and preserves deterministic pagination for table and exports", () => {
    const filters = { country: "EG", gender: "female", department: "other", industry: "technology_telecom" };
    const page2 = userReportArgs({ _from: "2026-01-01", _to: "2026-01-31", _game: null, _include: false }, filters, "sam", { key: "created_at", dir: "desc" }, 25, 25);
    expect(page2).toMatchObject({ _country: "EG", _gender: "female", _department: "other", _industry: "technology_telecom", _limit: 25, _offset: 25, _search: "sam" });
    expect(userReportArgs({}, EMPTY_AUDIENCE_FILTERS, null, { key: "created_at", dir: "desc" }, 100000, 0)._offset).toBe(0);
  });
  it("renders unique account counts and percentages, including explicit missing categories", () => {
    expect(audienceRows({ EG: 2, unknown: 1 })).toEqual([{ key: "EG", count: 2, percent: 67, total: 3 }, { key: "unknown", count: 1, percent: 33, total: 3 }]);
    expect(audienceLabel("country", "unknown")).toContain("غير معروف");
    expect(audienceLabel("country", "ambiguous")).toContain("غير محسوم");
  });
  it("keeps the admin RPC protected, aggregates filtered unique accounts server-side, and returns profile details", () => {
    expect(migration).toContain("IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'");
    expect(migration).toContain("'audience',jsonb_build_object('total',audience.total");
    expect(migration).toContain("count(*) AS total");
    expect(migration).toContain("_country IS NULL OR coalesce(public.profile_country_from_phone(p.phone),'unknown') = _country");
    expect(migration).toContain("_gender IS NULL OR coalesce(p.gender,'unknown') = _gender");
    expect(migration).toContain("_department IS NULL OR coalesce(p.department,'unknown') = _department");
    expect(migration).toContain("_industry IS NULL OR coalesce(p.industry,'unknown') = _industry");
    expect(migration).toContain("_phone LIKE '+1%' OR _phone LIKE '+7%' THEN 'ambiguous'");
    expect(migration).toContain("LIMIT least(greatest(_limit,1),100000) OFFSET greatest(_offset,0)");
    expect(migration).toContain("'gender_choice',p.gender");
    expect(migration).toContain("'department_other',p.department_other");
    expect(authMigration).toContain("USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)");
    expect(migration).toContain("GRANT UPDATE (department, department_other, industry, industry_other, work_details_prompt_dismissed_at)");
    expect(migration).not.toMatch(/GRANT UPDATE \([^)]*\b(phone|user_id|role)\b/i);
  });
  it("neutralizes custom Other text in CSV and XLSX exports", async () => {
    const sheet = { name: "Users", columns: [{ key: "department_other", header: "Department Other", text: true }], rows: [{ department_other: "=HYPERLINK(\"bad\")" }] };
    expect(safeText("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(toCsv(sheet)).toContain("'=HYPERLINK(");
    const buffer = await buildXlsx([sheet]);
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const cell = workbook.getWorksheet("Users")!.getCell("A2");
    expect(cell.value).toBe("'=HYPERLINK(\"bad\")");
    expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
  });
});
