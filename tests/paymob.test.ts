import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { calendarYearFrom, entitledAt, PAYMOB_ROLLOUT_APPROVED, priceForIdentity } from "../docs/paymob/functions/_shared/domain";
import { canonicalTransaction, checkoutUrl, fetchJson, matchesPayment, nextPaymentState, signatureFor, transactionState, verifyTransaction, type Transaction } from "../docs/paymob/functions/_shared/paymob";
import { PAYMENT_UI_ENABLED, initiateCheckout, readPaymentStatus, safeCheckoutUrl } from "../src/features/subscription/paymentApi";

const fixture: Transaction = {
  amount_cents: 40000, created_at: "2026-10-24T12:00:00Z", currency: "EGP", error_occured: false,
  has_parent_transaction: false, id: 100, integration_id: 200, is_3d_secure: true, is_auth: false,
  is_capture: false, is_refunded: false, is_standalone_payment: true, is_voided: false,
  order: { id: 300 }, owner: 400, pending: false, source_data: { pan: "2346", sub_type: "MasterCard", type: "card" }, success: true,
};
// Public synthetic fixture, NOT a merchant secret.
const fixtureKey = "public-synthetic-test-fixture-only";
const canonical = "400002026-10-24T12:00:00ZEGPfalsefalse100200truefalsefalsefalsetruefalse300400false2346MasterCardcardtrue";

describe("server pricing", () => {
  it("eligible confirmed Egyptian mobile costs exactly 40000 minor units", () => {
    for (const phone of ["+201012345678", "201112345678", "201212345678", "201512345678"])
      expect(priceForIdentity({ id: "synthetic", phone, phone_confirmed_at: "2026-10-24" })).toBe(40000);
  });
  it("others cost exactly 120000 minor units", () => {
    for (const phone of ["+966501234567", "201312345678", "01012345678", "+201012345678x"])
      expect(priceForIdentity({ id: "synthetic", phone, phone_confirmed_at: "2026-10-24" })).toBe(120000);
    expect(priceForIdentity({ id: "synthetic", phone: "201012345678" })).toBe(120000);
  });
  it("rejects absent identity", () => expect(() => priceForIdentity({ id: "" })).toThrow("unauthorized"));
});
describe("official POST HMAC", () => {
  it("uses exact 20-field canonical order and SHA512 independently", async () => {
    expect(canonicalTransaction(fixture)).toBe(canonical);
    const independentlyCalculated = createHmac("sha512", fixtureKey).update(canonical).digest("hex");
    expect(await signatureFor(fixture, fixtureKey)).toBe(independentlyCalculated);
    expect(await verifyTransaction(fixture, independentlyCalculated, fixtureKey)).toBe(true);
  });
  it("rejects forged and changed signatures", async () => {
    const hmac = await signatureFor(fixture, fixtureKey);
    expect(await verifyTransaction(fixture, "0".repeat(128), fixtureKey)).toBe(false);
    expect(await verifyTransaction({ ...fixture, amount_cents: 120000 }, hmac, fixtureKey)).toBe(false);
    expect(await verifyTransaction(fixture, "", fixtureKey)).toBe(false);
  });
  it("fails closed for missing fields and string booleans", async () => {
    expect(await verifyTransaction({ ...fixture, pending: "false" }, "0".repeat(128), fixtureKey)).toBe(false);
    expect(() => canonicalTransaction({ ...fixture, owner: null })).toThrow();
  });
  it("ignores unsigned reference for binding", () => {
    const expected = { providerOrderId: 300, amount: 40000, currency: "EGP", integrations: [200] };
    expect(matchesPayment(fixture, expected)).toBe(true);
    expect(matchesPayment(fixture, { ...expected, amount: 120000 })).toBe(false);
    expect(matchesPayment(fixture, { ...expected, currency: "USD" })).toBe(false);
    expect(matchesPayment(fixture, { ...expected, providerOrderId: 999 })).toBe(false);
    expect(matchesPayment(fixture, { ...expected, integrations: [999] })).toBe(false);
  });
});
describe("payment outcomes", () => {
  it("confirmed standalone payment is paid", () => expect(transactionState(fixture)).toBe("paid"));
  it("pending never grants access", () => expect(transactionState({ ...fixture, pending: true })).toBe("pending"));
  it("failure never grants access", () => expect(transactionState({ ...fixture, success: false })).toBe("failed"));
  it("refund revokes, void revokes", () => {
    expect(transactionState({ ...fixture, is_refunded: true })).toBe("refunded");
    expect(transactionState({ ...fixture, is_voided: true })).toBe("voided");
  });
  it("authorization and child/capture operations require review", () => {
    for (const key of ["is_auth", "has_parent_transaction", "is_capture"]) expect(transactionState({ ...fixture, [key]: true })).toBe("review");
  });
  it("repeated and delayed events do not regress success or undo refund", () => {
    expect(nextPaymentState("paid", "paid")).toBe("paid");
    expect(nextPaymentState("paid", "pending")).toBe("paid");
    expect(nextPaymentState("paid", "failed")).toBe("paid");
    expect(nextPaymentState("refunded", "paid")).toBe("refunded");
    expect(nextPaymentState("failed", "paid")).toBe("paid");
  });
});
describe("annual duration and disabled rollout", () => {
  it("12 calendar months clamps leap-day expiry", () => {
    expect(calendarYearFrom("2024-02-29T12:30:00Z")).toBe("2025-02-28T12:30:00.000Z");
    expect(calendarYearFrom("2026-10-24T12:00:00Z")).toBe("2027-10-24T12:00:00.000Z");
  });
  it("expiry boundary and revocation deny entitlement", () => {
    expect(entitledAt("2026-10-24", "2027-10-24", null, new Date("2027-10-23"))).toBe(true);
    expect(entitledAt("2026-10-24", "2027-10-24", null, new Date("2027-10-24"))).toBe(false);
    expect(entitledAt("2026-10-24", "2027-10-24", "2026-11-01", new Date("2027-01-01"))).toBe(false);
  });
  it("does not contact cloud or provider while disabled", async () => {
    expect(PAYMOB_ROLLOUT_APPROVED).toBe(false); expect(PAYMENT_UI_ENABLED).toBe(false);
    await expect(initiateCheckout("synthetic", { email: "", city: "", street: "", country: "" })).rejects.toThrow("payment_disabled");
    await expect(readPaymentStatus()).rejects.toThrow("payment_disabled");
  });
  it("uses only the current official Egypt checkout origin", () => {
    expect(new URL(safeCheckoutUrl(checkoutUrl("public-fixture", "checkout-fixture"))).origin).toBe("https://eg.checkout.paymob.com");
    expect(() => safeCheckoutUrl("https://evil.example/")).toThrow();
    expect(() => safeCheckoutUrl("https://accept.paymob.com/unifiedcheckout/")).toThrow();
  });
  it("network failure and provider errors remain errors", async () => {
    await expect(fetchJson("https://synthetic.invalid", {}, async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    await expect(fetchJson("https://synthetic.invalid", {}, async () => new Response("", { status: 503 }))).rejects.toThrow("provider_unavailable");
  });
});