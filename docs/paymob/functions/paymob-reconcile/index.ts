import { adminClient, body, config, failure, identity, inquireOrder, json, uuid } from "../_shared/runtime.ts";
import { canonicalTransaction, confirmedTime, matchesPayment, signatureFor, transactionState } from "../_shared/paymob.ts";

// Authenticated, owner-bound fallback; never accepts a transaction/provider ID from the browser.
export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const db = adminClient(); const user = await identity(req, db); const settings = config(); const input = await body(req);
    if (!uuid(input.orderId)) throw new Error("invalid_order");
    const { data: order, error } = await db.from("payment_orders").select("id,amount_minor,currency").eq("id", input.orderId).eq("user_id", user.id).eq("environment", settings.environment).maybeSingle();
    if (error) throw new Error("read_failed");
    if (!order) return json({ error: "not_found" }, 404);
    const { data: attempts, error: attemptsError } = await db.from("payment_attempts").select("id,provider_order_id,integration_ids,status").eq("order_id", order.id).eq("environment", settings.environment).order("created_at", { ascending: false }).limit(5);
    if (attemptsError) throw new Error("read_failed");
    for (const attempt of attempts ?? []) {
      // Lookup by signed saved provider order, or trusted reference for an uncertain create.
      const verified = await inquireOrder(settings, attempt.provider_order_id, attempt.id);
      canonicalTransaction(verified);
      if (attempt.provider_order_id === null) {
        if ((verified.order as unknown as { merchant_order_id?: string }).merchant_order_id !== attempt.id) throw new Error("reference_mismatch");
        const { error: saved } = await db.from("payment_attempts").update({ provider_order_id: verified.order.id }).eq("id", attempt.id).is("provider_order_id", null);
        if (saved) throw new Error("read_failed");
      }
      if (!matchesPayment(verified, { providerOrderId: attempt.provider_order_id ?? verified.order.id, amount: order.amount_minor, currency: order.currency, integrations: attempt.integration_ids })) throw new Error("payment_mismatch");
      const state = transactionState(verified);
      const { error: applied } = await db.rpc("payment_apply_event", { _environment: settings.environment, _fingerprint: await signatureFor(verified, settings.hmac), _transaction: verified.id, _provider_order: verified.order.id, _integration: verified.integration_id, _amount: verified.amount_cents, _currency: verified.currency, _state: state, _confirmed_at: state === "paid" ? confirmedTime(verified) : null });
      if (applied) throw new Error("read_failed");
    }
    return json({ checked: true });
  } catch (error) { return failure(error); }
}
Deno.serve(handler);