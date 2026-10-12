export type Result = "win" | "loss" | "pending" | "unknown";
export function roundResult(r: { timed_out_at?: string | null; completed_at?: string | null; server_outcome?: string | null; outcome?: string | null }): Result {
  if (r.timed_out_at) return "loss";
  if (!r.completed_at) return "pending";
  const outcome = r.server_outcome ?? r.outcome;
  if (outcome === "strong" || outcome === "supported") return "win";
  if (["weak", "insufficient", "criterion_mismatch"].includes(outcome ?? "")) return "loss";
  return "unknown";
}
export const resultLabel = (key: string) => ({ win: "كسب", loss: "خسر", pending: "—", unknown: "غير مسجلة" })[key] ?? "غير مسجلة";
export const completionRate = (finished: number, starts: number) => starts > 0 ? `${Math.round(finished / starts * 100)}%` : "—";