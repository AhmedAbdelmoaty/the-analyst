import { adminClient, body, config, failure, identity, json, requireBearer, uuid } from "../_shared/runtime.ts";
import { priceForIdentity } from "../_shared/domain.ts";
import { checkoutUrl, fetchJson } from "../_shared/paymob.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    requireBearer(req); const settings = config(); const db = adminClient(); const user = await identity(req, db);
    const input = await body(req);
    if (!uuid(input.requestKey) || Object.keys(input).some(key => !["requestKey", "billing"].includes(key))) throw new Error("invalid_body");
    const billing = input.billing as Record<string, unknown> | undefined;
    if (!billing || ["email", "city", "street", "country"].some(key => typeof billing[key] !== "string" || !String(billing[key]).trim() || String(billing[key]).length > 200)) throw new Error("invalid_billing");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(billing.email))) throw new Error("invalid_email");
    const first = String(user.user_metadata.first_name ?? "").trim(); const last = String(user.user_metadata.last_name ?? "").trim();
    if (!first || !last || first.length > 50 || last.length > 50 || !user.phone) throw new Error("billing_identity_incomplete");
    const amount = priceForIdentity(user);
    const { data: begun, error } = await db.rpc("payment_begin", { _uid: user.id, _environment: settings.environment, _amount: amount, _request: input.requestKey, _integrations: settings.ids });
    if (error || !begun) return json({ error: "payment_pending_or_unavailable" }, 409);
    // An uncertain previous POST is never automatically sent again; reconcile it first.
    if (begun.status !== "creating") return json({ error: "payment_pending", orderId: begun.orderId }, 409);
    // Acquire a single sending lease even when two identical client requests race.
    const { data: lease, error: leaseError } = await db.from("payment_attempts").update({ status: "sending" }).eq("id", begun.attemptId).eq("status", "creating").select("id").maybeSingle();
    if (leaseError || !lease) return json({ error: "payment_pending", orderId: begun.orderId }, 409);
    try {
      const result = await fetchJson("https://accept.paymob.com/v1/intention/", {
        method: "POST", headers: { Authorization: "Token " + settings.secret, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "EGP", payment_methods: settings.ids,
          items: [{ name: "The Analyst Annual", amount, quantity: 1 }],
          billing_data: { first_name: first, last_name: last, phone_number: user.phone, email: billing.email, city: billing.city, street: billing.street, country: billing.country },
          special_reference: begun.attemptId, notification_url: settings.webhookUrl,
          redirection_url: settings.appOrigin + "/subscription/return?order=" + begun.orderId }),
      });
      if (typeof result.id !== "string" || typeof result.client_secret !== "string" || !Number.isSafeInteger(result.intention_order_id)) throw new Error("invalid_provider_response");
      const { error: saved } = await db.from("payment_attempts").update({ provider_intention_id: result.id, provider_order_id: result.intention_order_id, status: "pending" }).eq("id", begun.attemptId);
      if (saved) throw new Error("binding_not_saved");
      return json({ orderId: begun.orderId, checkoutUrl: checkoutUrl(settings.publicKey, result.client_secret) });
    } catch {
      await db.from("payment_attempts").update({ status: "unknown" }).eq("id", begun.attemptId).eq("status", "sending");
      return json({ error: "payment_creation_unknown", orderId: begun.orderId }, 503);
    }
  } catch (error) { return failure(error); }
}
if (import.meta.main) Deno.serve(handler);