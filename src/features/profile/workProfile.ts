export const DEPARTMENTS = [
  ["sales", "Sales"], ["marketing", "Marketing"], ["finance", "Finance"], ["accounting", "Accounting"],
  ["human_resources", "Human Resources"], ["operations", "Operations"], ["it_data_bi", "IT / Data / BI"],
  ["customer_service", "Customer Service"], ["supply_chain_logistics", "Supply Chain & Logistics"], ["procurement", "Procurement"],
  ["business_development", "Business Development"], ["project_management", "Project Management"], ["general_management", "General Management"],
  ["legal", "Legal"], ["other", "Other"],
] as const;
export const INDUSTRIES = [
  ["real_estate_construction", "Real Estate & Construction"], ["education_training", "Education & Training"],
  ["banking_financial_services", "Banking & Financial Services"], ["technology_telecom", "Technology & Telecom"],
  ["retail_ecommerce", "Retail & E-commerce"], ["manufacturing", "Manufacturing"], ["healthcare_pharmaceuticals", "Healthcare & Pharmaceuticals"],
  ["consulting_professional_services", "Consulting & Professional Services"], ["hospitality_tourism", "Hospitality & Tourism"],
  ["transportation_logistics", "Transportation & Logistics"], ["energy_utilities", "Energy & Utilities"], ["media_advertising", "Media & Advertising"],
  ["government_public_sector", "Government & Public Sector"], ["other", "Other"],
] as const;
export type WorkProfile = { department: string | null; department_other: string | null; industry: string | null; industry_other: string | null };
export type EditableProfile = WorkProfile & { first_name?: string | null; last_name?: string | null; display_name?: string | null; gender?: "male" | "female" | null; avatar_choice?: string | null; work_details_prompt_dismissed_at?: string | null };
const depIds = new Set<string>(DEPARTMENTS.map(([id]) => id));
const indIds = new Set<string>(INDUSTRIES.map(([id]) => id));
export const OTHER_MAX_LENGTH = 80;
const WORK_PROFILE_COLUMN_NAMES = /\b(department|department_other|industry|industry_other|work_details_prompt_dismissed_at)\b/i;
export function isWorkProfileSchemaUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  const code = typeof value.code === "string" ? value.code : "";
  const message = typeof value.message === "string" ? value.message : "";
  const missingColumn = (code === "PGRST204" || code === "42703") && WORK_PROFILE_COLUMN_NAMES.test(message);
  const missingPrivilege = code === "42501" && /permission denied/i.test(message) && WORK_PROFILE_COLUMN_NAMES.test(message);
  return missingColumn || missingPrivilege;
}
const clean = (value: string | null | undefined) => (value ?? "").trim().replace(/\s+/g, " ");
export function validateWorkProfile(value: WorkProfile): { value: WorkProfile; errors: Partial<Record<keyof WorkProfile, string>> } {
  const department = depIds.has(value.department ?? "") ? value.department : null;
  const industry = indIds.has(value.industry ?? "") ? value.industry : null;
  const department_other = department === "other" ? clean(value.department_other) : "";
  const industry_other = industry === "other" ? clean(value.industry_other) : "";
  const errors: Partial<Record<keyof WorkProfile, string>> = {};
  if (!department) errors.department = "required";
  if (!industry) errors.industry = "required";
  if (department === "other" && !department_other) errors.department_other = "required";
  if (industry === "other" && !industry_other) errors.industry_other = "required";
  if (department_other.length > OTHER_MAX_LENGTH) errors.department_other = "too_long";
  if (industry_other.length > OTHER_MAX_LENGTH) errors.industry_other = "too_long";
  return { value: { department, department_other: department_other.slice(0, OTHER_MAX_LENGTH) || null, industry, industry_other: industry_other.slice(0, OTHER_MAX_LENGTH) || null }, errors };
}
export const hasWorkProfile = (p?: Partial<WorkProfile> | null) => !!(p?.department && p?.industry);
export function isIdentityProfileComplete(profile?: { first_name?: string | null; last_name?: string | null; gender?: string | null } | null) {
  return !!(profile?.first_name && profile.last_name && (profile.gender === "male" || profile.gender === "female"));
}

/** Builds only the self-editable profile columns; database RLS still scopes the actual update to auth.uid(). */
export function buildProfileUpdatePatch(current: Partial<EditableProfile> | null, input: Partial<EditableProfile>): { patch: Partial<EditableProfile>; error: string | null } {
  const patch: Partial<EditableProfile> = {};
  for (const key of ["first_name", "last_name", "display_name", "gender", "avatar_choice", "work_details_prompt_dismissed_at"] as const) {
    if (input[key] !== undefined) patch[key] = input[key] as never;
  }
  if (["department", "department_other", "industry", "industry_other"].some(key => key in input)) {
    const checked = validateWorkProfile({
      department: input.department !== undefined ? input.department : current?.department ?? null,
      department_other: input.department_other !== undefined ? input.department_other : current?.department_other ?? null,
      industry: input.industry !== undefined ? input.industry : current?.industry ?? null,
      industry_other: input.industry_other !== undefined ? input.industry_other : current?.industry_other ?? null,
    });
    if (Object.keys(checked.errors).length) return { patch: {}, error: "invalid_work_profile" };
    Object.assign(patch, checked.value);
  }
  return { patch, error: null };
}

// Country calling codes shared across countries are deliberately not resolved to a single country.
const CALLING_CODES: Record<string, string> = {
  "20":"EG","27":"ZA","30":"GR","31":"NL","32":"BE","33":"FR","34":"ES","36":"HU","39":"IT","40":"RO","41":"CH","43":"AT","44":"GB","45":"DK","46":"SE","47":"NO","48":"PL","49":"DE",
  "51":"PE","52":"MX","53":"CU","54":"AR","55":"BR","56":"CL","57":"CO","58":"VE","60":"MY","61":"AU","62":"ID","63":"PH","64":"NZ","65":"SG","66":"TH","81":"JP","82":"KR","84":"VN","86":"CN","90":"TR","91":"IN","92":"PK","93":"AF","94":"LK","95":"MM","98":"IR",
  "211":"SS","212":"MA","213":"DZ","216":"TN","218":"LY","220":"GM","221":"SN","222":"MR","223":"ML","224":"GN","225":"CI","226":"BF","227":"NE","228":"TG","229":"BJ","230":"MU","231":"LR","232":"SL","233":"GH","234":"NG","235":"TD","236":"CF","237":"CM","238":"CV","239":"ST","240":"GQ","241":"GA","242":"CG","243":"CD","244":"AO","245":"GW","246":"IO","248":"SC","249":"SD","250":"RW","251":"ET","252":"SO","253":"DJ","254":"KE","255":"TZ","256":"UG","257":"BI","258":"MZ","260":"ZM","261":"MG","262":"ambiguous","263":"ZW","264":"NA","265":"MW","266":"LS","267":"BW","268":"SZ","269":"KM","290":"SH","291":"ER","297":"AW","298":"FO","299":"GL",
  "350":"GI","351":"PT","352":"LU","353":"IE","354":"IS","355":"AL","356":"MT","357":"CY","358":"FI","359":"BG","370":"LT","371":"LV","372":"EE","373":"MD","374":"AM","375":"BY","376":"AD","377":"MC","378":"SM","380":"UA","381":"RS","382":"ME","383":"XK","385":"HR","386":"SI","387":"BA","389":"MK","420":"CZ","421":"SK","423":"LI",
  "500":"FK","501":"BZ","502":"GT","503":"SV","504":"HN","505":"NI","506":"CR","507":"PA","508":"PM","509":"HT","590":"GP","591":"BO","592":"GY","593":"EC","594":"GF","595":"PY","596":"MQ","597":"SR","598":"UY","599":"CW",
  "670":"TL","672":"NF","673":"BN","674":"NR","675":"PG","676":"TO","677":"SB","678":"VU","679":"FJ","680":"PW","681":"WF","682":"CK","683":"NU","685":"WS","686":"KI","687":"NC","688":"TV","689":"PF","690":"TK","691":"FM","692":"MH",
  "800":"ZZ","808":"ZZ","850":"KP","852":"HK","853":"MO","855":"KH","856":"LA","870":"ZZ","880":"BD","881":"ZZ","882":"ZZ","883":"ZZ","886":"TW","888":"ZZ","960":"MV","961":"LB","962":"JO","963":"SY","964":"IQ","965":"KW","966":"SA","967":"YE","968":"OM","970":"PS","971":"AE","972":"IL","973":"BH","974":"QA","975":"BT","976":"MN","977":"NP","979":"ZZ","992":"TJ","993":"TM","994":"AZ","995":"GE","996":"KG","998":"UZ",
};
export const KNOWN_COUNTRIES = [...new Set(Object.values(CALLING_CODES).filter(code => code !== "ZZ" && code !== "ambiguous"))].sort();
export function countryFromPhone(phone: string | null | undefined): string {
  const normalized = (phone ?? "").replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return "unknown";
  if (normalized.startsWith("+1") || normalized.startsWith("+7")) return "ambiguous";
  for (const code of Object.keys(CALLING_CODES).sort((a, b) => b.length - a.length)) {
    if (normalized.startsWith(`+${code}`)) return CALLING_CODES[code] === "ZZ" ? "ambiguous" : CALLING_CODES[code];
  }
  // Most calling codes start with a digit shared with a longer code; no unsupported guess is made.
  return "unknown";
}
