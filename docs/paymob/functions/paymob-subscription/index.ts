import { adminClient, body, config, failure, identity, json, uuid } from "../_shared/runtime.ts";
import { entitledAt } from "../_shared/domain.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const db = adminClient(); const user = await identity(req, db); const settings = config(); const input = await body(req);
    if (input.orderId !== undefined && !uuid(input.orderId)) throw new Error("invalid_order");
    let orderState = null;
    if (input.orderId) {
      const { data: order, error } = await db.from("payment_orders").select("status").eq("id", input.orderId).eq("user_id", user.id).eq("environment", settings.environment).maybeSingle();
      if (error) throw new Error("read_failed");
      if (!order) return json({ error: "not_found" }, 404);
      orderState = order.status;
    }
    const { data: entitlement, error } = await db.from("annual_entitlements").select("starts_at,expires_at,revoked_at").eq("user_id", user.id).eq("environment", settings.environment).is("revoked_at", null).order("expires_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("read_failed");
    const snapshot = entitlement ? { tier: "annual", status: entitledAt(entitlement.starts_at, entitlement.expires_at, entitlement.revoked_at, new Date()) ? "active" : "expired", expiresAt: entitlement.expires_at }
      : orderState === "pending" ? { tier: "annual", status: "pending", expiresAt: null } : orderState === "failed" ? { tier: "annual", status: "failed", expiresAt: null } : null;
    return json({ snapshot, orderState });
  } catch (error) { return failure(error); }
}
Deno.serve(handler);