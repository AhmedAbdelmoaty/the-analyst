import { adminClient, body, config, failure, inquire, json } from "../_shared/runtime.ts";
import { canonicalTransaction, confirmedTime, matchesPayment, signatureFor, transactionState, verifyTransaction, type Transaction } from "../_shared/paymob.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const settings = config(); const input = await body(req); const url = new URL(req.url);
    const signatures = url.searchParams.getAll("hmac");
    if (signatures.length !== 1 || !await verifyTransaction(input.obj, signatures[0], settings.hmac)) return json({ error: "invalid_signature" }, 401);
    const signed = input.obj as Transaction; canonicalTransaction(signed);
    const db = adminClient();
    const { data: attempt, error } = await db.from("payment_attempts").select("order_id,integration_ids").eq("environment", settings.environment).eq("provider_order_id", signed.order.id).maybeSingle();
    // Do not drop an early callback when creation hasn't committed its binding yet.
    if (error || !attempt) return json({ error: "binding_pending" }, 503);
    const { data: order, error: orderError } = await db.from("payment_orders").select("amount_minor,currency").eq("id", attempt.order_id).single();
    if (orderError || !order || !matchesPayment(signed, { providerOrderId: signed.order.id, amount: order.amount_minor, currency: order.currency, integrations: attempt.integration_ids })) return json({ error: "payment_mismatch" }, 409);
    // Re-read provider state: a delayed signed callback must not overwrite a later refund.
    // Never use unsigned extras, merchant_order_id or parent IDs to bind fulfillment.
    const verified = await inquire(settings, Number(signed.id)); canonicalTransaction(verified);
    if (verified.id !== signed.id || !matchesPayment(verified, { providerOrderId: signed.order.id, amount: order.amount_minor, currency: order.currency, integrations: attempt.integration_ids })) return json({ error: "payment_mismatch" }, 409);
    const state = transactionState(verified);
    const { data: outcome, error: applyError } = await db.rpc("payment_apply_event", {
      _environment: settings.environment, _fingerprint: await signatureFor(verified, settings.hmac),
      _transaction: verified.id, _provider_order: verified.order.id, _integration: verified.integration_id,
      _amount: verified.amount_cents, _currency: verified.currency, _state: state, _confirmed_at: state === "paid" ? confirmedTime(verified) : null,
    });
    if (applyError || ["unmatched", "mismatch", "unexpected"].includes(outcome)) return json({ error: "processing_pending" }, 503);
    return json({ received: true });
  } catch (error) { return failure(error); }
}
Deno.serve(handler);