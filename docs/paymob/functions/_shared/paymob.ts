import { nextPaymentState, type PaymentState } from "./domain.ts";

export type Transaction = Record<string, unknown> & { order: { id: number }; source_data: { pan: string; sub_type: string; type: string } };
const fields = ["amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order.id", "owner", "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success"];
const numeric = new Set(["amount_cents", "id", "integration_id", "order.id", "owner"]);
const strings = new Set(["created_at", "currency", "source_data.pan", "source_data.sub_type", "source_data.type"]);
export function canonicalTransaction(input: unknown): string {
  if (!input || typeof input !== "object") throw new Error("invalid_transaction");
  const t = input as Record<string, unknown>;
  return fields.map(path => {
    const [root, child] = path.split(".");
    const nested = t[root];
    const value = child && nested && typeof nested === "object" ? (nested as Record<string, unknown>)[child] : child ? undefined : nested;
    if (numeric.has(path)) {
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("invalid_number");
    } else if (strings.has(path)) {
      if (typeof value !== "string" || value.length > 200) throw new Error("invalid_string");
    } else if (typeof value !== "boolean") throw new Error("invalid_boolean");
    return String(value);
  }).join("");
}
export async function signatureFor(t: unknown, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalTransaction(t)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export function timingSafeHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(a) || !/^[a-f0-9]{128}$/i.test(b)) return false;
  let difference = 0;
  for (let i = 0; i < 128; i++) difference |= a.toLowerCase().charCodeAt(i) ^ b.toLowerCase().charCodeAt(i);
  return difference === 0;
}
export async function verifyTransaction(t: unknown, hmac: string, secret: string) {
  try { return timingSafeHex(await signatureFor(t, secret), hmac); } catch { return false; }
}
export function transactionState(t: Transaction): PaymentState {
  canonicalTransaction(t);
  if (t.is_refunded === true) return "refunded";
  if (t.is_voided === true) return "voided";
  // Child operations / authorization-only are not evidence for full one-time settlement.
  if (t.has_parent_transaction === true || t.is_auth === true || t.is_capture === true || t.is_standalone_payment !== true) return "review";
  if (t.pending === true) return "pending";
  if (t.success === true && t.error_occured === false) return "paid";
  return "failed";
}
export function confirmedTime(t: Transaction): string {
  const input = String(t.created_at);
  // Paymob timestamps without suffix are treated as UTC only after merchant sandbox confirms this contract.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?$/.test(input)) throw new Error("invalid_time");
  const iso = /Z$|[+-]\d{2}:\d{2}$/.test(input) ? input : input + "Z";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_time");
  return date.toISOString();
}
export function matchesPayment(t: Transaction, expected: { providerOrderId: number; amount: number; currency: string; integrations: number[] }) {
  canonicalTransaction(t);
  return t.order.id === expected.providerOrderId && t.amount_cents === expected.amount && t.currency === expected.currency && expected.integrations.includes(Number(t.integration_id));
}
export function checkoutUrl(publicKey: string, clientSecret: string) {
  const url = new URL("https://eg.checkout.paymob.com/");
  url.searchParams.set("publicKey", publicKey); url.searchParams.set("clientSecret", clientSecret);
  return url.toString();
}
export async function fetchJson(url: string, options: RequestInit, fetcher: typeof fetch = fetch) {
  const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("provider_unavailable");
  return response.json();
}
export { nextPaymentState };