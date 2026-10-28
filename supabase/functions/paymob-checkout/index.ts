import { adminClient, body, config, failure, identity, json, requireBearer, uuid } from "../_shared/runtime.ts";
import { priceForIdentity } from "../_shared/domain.ts";
import { checkoutUrl, fetchJson } from "../_shared/paymob.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    requireBearer(req); const settings = config(); const db = adminClient(); const user = await identity(req, db);
    const input = await body(req);
    if (!uuid(input.requestKey) || Object.keys(input).some(key => key !== "requestKey")) throw new Error("invalid_body");
    const first = String(user.user_metadata.first_name ?? "").trim(); const last = String(user.user_metadata.last_name ?? "").trim();
    if (!first || !last || first.length > 50 || last.length > 50 || !user.phone) throw new Error("billing_identity_incomplete");
    // Digital product: Paymob requires billing fields, so the server fills neutral values; the player types nothing here.
    const phone = user.phone.startsWith("+") ? user.phone : "+" + user.phone;
    const email = typeof user.email === "string" && user.email.includes("@") ? user.email : "customer@theanalystedu.com";
    const billingData = { first_name: first, last_name: last, phone_number: phone, email, country: "EG", city: "NA", state: "NA", street: "NA", building: "NA", floor: "NA", apartment: "NA", postal_code: "NA", shipping_method: "NA" };
    const amount = priceForIdentity(user);
    const { data: begun, error } = await db.rpc("payment_begin", { _uid: user.id, _environment: settings.environment, _amount: amount, _request: input.requestKey, _integrations: settings.ids });
    if (error || !begun) return json({ error: "payment_pending_or_unavailable" }, 409);
    // An uncertain previous POST is never automatically sent again; reconcile it first.
    if (begun.status !== "creating") return json({ error: "payment_pending", orderId: begun.orderId }, 409);
    // Acquire a single sending lease even when two identical client requests race.
    const { data: lease, error: leaseError } = await db.from("payment_attempts").update({ status: "sending" }).eq("id", begun.attemptId).eq("status", "creating").select("id").maybeSingle();
    if (leaseError || !lease) return json({ error: "payment_pending", orderId: begun.orderId }, 409);
    let response: Response;
    try {
      response = await fetch("https://accept.paymob.com/v1/intention/", {
        method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: "Token " + settings.secret, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "EGP", payment_methods: settings.ids,
          items: [{ name: "The Analyst Annual", amount, description: "Annual subscription", quantity: 1 }],
          billing_data: billingData,
          special_reference: begun.attemptId, notification_url: settings.webhookUrl,
          redirection_url: settings.appOrigin + "/subscription/return?order=" + begun.orderId }),
      });
    } catch {
      // Network/timeout: Paymob may have created it, so keep it for reconciliation.
      await db.from("payment_attempts").update({ status: "unknown" }).eq("id", begun.attemptId).eq("status", "sending");
      return json({ error: "payment_creation_unknown", orderId: begun.orderId }, 503);
    }
    if (!response.ok) {
      // An explicit provider rejection created nothing; release the attempt so the player can retry.
      console.error("paymob_intention_rejected", response.status, (await response.text()).slice(0, 1000));
      await db.from("payment_attempts").update({ status: "failed" }).eq("id", begun.attemptId).eq("status", "sending");
      await db.from("payment_orders").update({ status: "failed" }).eq("id", begun.orderId).eq("status", "pending");
      return json({ error: "payment_rejected" }, 502);
    }
    try {
      const result = await response.json();
      if (typeof result.id !== "string" || typeof result.client_secret !== "string" || !Number.isSafeInteger(result.intention_order_id)) throw new Error("invalid_provider_response");
      const { error: saved } = await db.from("payment_attempts").update({ provider_intention_id: result.id, provider_order_id: result.intention_order_id, status: "pending" }).eq("id", begun.attemptId);
      if (saved) throw new Error("binding_not_saved");
      return json({ orderId: begun.orderId, checkoutUrl: checkoutUrl(settings.publicKey, result.client_secret) });
    } catch (cause) {
      console.error("paymob_intention_unbound", cause instanceof Error ? cause.message : "unknown");
      await db.from("payment_attempts").update({ status: "unknown" }).eq("id", begun.attemptId).eq("status", "sending");
      return json({ error: "payment_creation_unknown", orderId: begun.orderId }, 503);
    }
  } catch (error) { console.error("paymob_checkout_error", error instanceof Error ? error.message : "unknown"); return failure(error); }
}
if (import.meta.main) Deno.serve(handler);