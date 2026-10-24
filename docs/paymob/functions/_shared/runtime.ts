import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PAYMOB_ROLLOUT_APPROVED, type Environment } from "./domain.ts";
import { fetchJson, type Transaction } from "./paymob.ts";

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error("configuration_missing");
  return value;
}
export function config() {
  if (!PAYMOB_ROLLOUT_APPROVED || Deno.env.get("PAYMOB_ENABLED") !== "true") throw new Error("payment_disabled");
  const environment = required("PAYMOB_ENVIRONMENT") as Environment;
  if (!["test", "live"].includes(environment)) throw new Error("invalid_environment");
  const prefix = "PAYMOB_" + environment.toUpperCase() + "_";
  const ids = required(prefix + "INTEGRATION_IDS").split(",").map(Number);
  if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error("invalid_integrations");
  const appUrl = new URL(required("PAYMOB_APP_ORIGIN"));
  const webhookUrl = new URL(required("PAYMOB_WEBHOOK_URL"));
  if (appUrl.protocol !== "https:" || webhookUrl.protocol !== "https:" || appUrl.username || webhookUrl.username || appUrl.password || webhookUrl.password) throw new Error("invalid_urls");
  return { environment, ids, utcConfirmed: Deno.env.get("PAYMOB_NAIVE_TIMESTAMP_UTC_VERIFIED") === "true", secret: required(prefix + "SECRET_KEY"), publicKey: required(prefix + "PUBLIC_KEY"), hmac: required(prefix + "HMAC_SECRET"), apiKey: required(prefix + "API_KEY"), appOrigin: appUrl.origin, webhookUrl: webhookUrl.toString() };
}
export function adminClient() {
  return createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
}
export function requireBearer(req: Request) {
  if (!req.headers.get("Authorization")?.startsWith("Bearer ")) throw new Error("unauthorized");
}
export async function identity(req: Request, db: ReturnType<typeof adminClient>) {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("unauthorized");
  const { data, error } = await db.auth.getUser(header.slice(7));
  if (error || !data.user) throw new Error("unauthorized");
  return data.user;
}
export async function body(req: Request): Promise<Record<string, unknown>> {
  if (Number(req.headers.get("Content-Length")) > 65536) throw new Error("invalid_body");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) { await reader.cancel(); throw new Error("invalid_body"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_body");
  return value;
}
export function uuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "unavailable";
  if (code === "unauthorized") return json({ error: "unauthorized" }, 401);
  if (code === "payment_disabled" || code === "configuration_missing") return json({ error: "payment_disabled" }, 503);
  if (["provider_unavailable", "read_failed"].includes(code)) return json({ error: "verification_pending" }, 503);
  return json({ error: "payment_unavailable" }, 400);
}
export async function inquire(configured: ReturnType<typeof config>, transactionId: number): Promise<Transaction> {
  const auth = await fetchJson("https://accept.paymob.com/api/auth/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: configured.apiKey }) });
  if (typeof auth.token !== "string") throw new Error("provider_unavailable");
  return fetchJson("https://accept.paymob.com/api/acceptance/transactions/" + transactionId, { headers: { Authorization: "Bearer " + auth.token } });
}

export async function inquireOrder(configured: ReturnType<typeof config>, providerOrderId: number | null, reference: string): Promise<Transaction> {
  const auth = await fetchJson("https://accept.paymob.com/api/auth/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: configured.apiKey }) });
  if (typeof auth.token !== "string") throw new Error("provider_unavailable");
  return fetchJson("https://accept.paymob.com/api/ecommerce/orders/transaction_inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auth_token: auth.token, ...(providerOrderId === null ? { merchant_order_id: reference } : { order_id: String(providerOrderId) }) }) });
}