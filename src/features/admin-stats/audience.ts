import { DEPARTMENTS, INDUSTRIES } from "@/features/profile/workProfile";

export type AudienceFilters = { country: string; gender: string; department: string; industry: string };
export const EMPTY_AUDIENCE_FILTERS: AudienceFilters = { country: "", gender: "", department: "", industry: "" };

export function userReportArgs(base: Record<string, unknown>, filters: AudienceFilters, search: string | null, sort: { key: string; dir: "asc" | "desc" }, limit: number, offset: number) {
  return { ...base, _search: search || null, _sort: sort.key, _dir: sort.dir, _limit: limit, _offset: offset,
    _country: filters.country || null, _gender: filters.gender || null, _department: filters.department || null, _industry: filters.industry || null };
}

export function audienceRows(distribution: Record<string, number> | null | undefined) {
  const entries = Object.entries(distribution ?? {}).sort(([a, av], [b, bv]) => bv - av || a.localeCompare(b));
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return entries.map(([key, count]) => ({ key, count, percent: total ? Math.round(count * 100 / total) : 0, total }));
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
export function audienceLabel(kind: "country" | "gender" | "department" | "industry", key: string) {
  if (key === "unknown") return "غير معروف / غير مقدّم";
  if (key === "ambiguous") return "رمز اتصال مشترك؛ البلد غير محسوم";
  if (kind === "country") return countryNames.of(key) ?? "غير معروف / غير مقدّم";
  if (kind === "gender") return key === "male" ? "ذكر (الشخصية المختارة)" : key === "female" ? "أنثى (الشخصية المختارة)" : key;
  if (kind === "department") return key.startsWith("other:") ? `Other: ${key.slice(6)}` : DEPARTMENTS.find(([id]) => id === key)?.[1] ?? key;
  if (kind === "industry") return key.startsWith("other:") ? `Other: ${key.slice(6)}` : INDUSTRIES.find(([id]) => id === key)?.[1] ?? key;
  return key;
}
