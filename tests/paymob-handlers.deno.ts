import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { handler as checkout } from "../docs/paymob/functions/paymob-checkout/index.ts";
import { handler as status } from "../docs/paymob/functions/paymob-subscription/index.ts";
import { handler as reconcile } from "../docs/paymob/functions/paymob-reconcile/index.ts";
import { handler as webhook } from "../docs/paymob/functions/paymob-webhook/index.ts";

describe("actual server handler disabled/authorization boundary", () => {
  for (const [name, handler] of [["checkout", checkout], ["status", status], ["reconcile", reconcile]] as const) {
    it(name + " rejects absent session before DB or provider", async () => {
      const response = await handler(new Request("https://synthetic.invalid", { method: "POST", body: "{}" }));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthorized" });
    });
    it(name + " remains disabled even with bearer header", async () => {
      const response = await handler(new Request("https://synthetic.invalid", { method: "POST", headers: { Authorization: "Bearer synthetic-only" }, body: "{}" }));
      expect(response.status).toBe(503);
    });
  }
  it("public webhook fails closed without contacting provider", async () => {
    const response = await webhook(new Request("https://synthetic.invalid", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
  });
});