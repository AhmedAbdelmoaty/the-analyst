import { expect, test } from "bun:test";
import { EVENT_DEPARTMENTS, validRegistrationEmail } from "../src/features/profile/eventRegistration";

test("event registration offers only the three approved departments in order", () => {
  expect(EVENT_DEPARTMENTS.map(([id]) => id)).toEqual(["ld_training", "human_resources", "other"]);
  expect(EVENT_DEPARTMENTS).toHaveLength(3);
});
test("registration requires a valid email", () => {
  expect(validRegistrationEmail("ahmed@example.com")).toBe(true);
  expect(validRegistrationEmail("")).toBe(false);
  expect(validRegistrationEmail("ahmed@" )).toBe(false);
});import { readFileSync } from "node:fs";
const fn = readFileSync("supabase/functions/phone-auth/index.ts", "utf8");
const page = readFileSync("src/pages/PlayerAuth.tsx", "utf8");
test("password rule is only 8+ characters of any kind (00000000 allowed)", () => {
  expect(fn).toContain("const passwordSchema = z.string().min(8);");
  expect(page).not.toMatch(/password\.length\s*<\s*(9|1\d)/);
});
test("a single name is enough to sign up", () => {
  expect(fn).toContain('last_name: z.string().trim().max(50).optional().default("")');
  expect(page).not.toContain("اسمين على الأقل");
});
