export type Environment = "test" | "live";
export type PaymentState = "pending" | "paid" | "failed" | "refunded" | "voided" | "review";

/** Caller MUST supply identity obtained with Auth getUser(token), never a request body. */
export function priceForIdentity(user: { id: string; phone?: string | null; phone_confirmed_at?: string | null }) {
  if (!user.id) throw new Error("unauthorized");
  return user.phone_confirmed_at && /^\+?201[0125]\d{8}$/.test(user.phone ?? "") ? 40000 : 120000;
}

export function calendarYearFrom(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_date");
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString();
}

export function nextPaymentState(current: PaymentState, incoming: PaymentState): PaymentState {
  if (["refunded", "voided", "review"].includes(current)) return current;
  if (["refunded", "voided", "review"].includes(incoming)) return incoming;
  if (current === "paid" || incoming === "paid") return "paid";
  if (current === "failed" && incoming === "pending") return "failed";
  return incoming;
}

export function entitledAt(starts: string, expires: string, revoked: string | null, now: Date) {
  return !revoked && new Date(starts) <= now && now < new Date(expires);
}

/** Explicit source gate: credentials or browser flags alone cannot enable checkout. */
export const PAYMOB_ROLLOUT_APPROVED = true;