/** Cairo calendar dates (YYYY-MM-DD) for the dashboard filters. */
const FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" });
export const cairoToday = (now = new Date()) => FMT.format(now);
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export type Preset = "today" | "7" | "30" | "custom";
export function presetRange(p: Preset, now = new Date()): { from: string; to: string } {
  const t = cairoToday(now);
  if (p === "today") return { from: t, to: t };
  if (p === "7") return { from: addDays(t, -6), to: t };
  return { from: addDays(t, -29), to: t };
}
