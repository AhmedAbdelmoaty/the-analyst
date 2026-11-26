import { expect, test } from "bun:test";
import { EVENT_DEPARTMENTS, validRegistrationEmail } from "../src/features/profile/eventRegistration";
import { SIGNUP_FALLBACK_AFTER_S, signupFallbackRetryAfter } from "../supabase/functions/phone-auth/signupFallback";

test("event registration offers only the three approved departments in order", () => {
  expect(EVENT_DEPARTMENTS.map(([id]) => id)).toEqual(["ld_training", "human_resources", "other"]);
  expect(EVENT_DEPARTMENTS).toHaveLength(3);
});
test("registration requires a valid email", () => {
  expect(validRegistrationEmail("ahmed@example.com")).toBe(true);
  expect(validRegistrationEmail("")).toBe(false);
  expect(validRegistrationEmail("ahmed@" )).toBe(false);
});import { readFileSync } from "node:fs";
const fn = readFileSync("supabase/functions/phone-auth/index.ts", "utf8");
const page = readFileSync("src/pages/PlayerAuth.tsx", "utf8");
test("password rule is only 8+ characters of any kind (00000000 allowed)", () => {
  expect(fn).toContain("const passwordSchema = z.string().min(8);");
  expect(page).not.toMatch(/password\.length\s*<\s*(9|1\d)/);
});
test("a single name is enough to sign up", () => {
  expect(fn).toContain('last_name: z.string().trim().max(50).optional().default("")');
  expect(page).not.toContain("اسمين على الأقل");
});

test("OTP fallback stays server-gated for exactly 45 seconds", () => {
  const createdAt = "2026-11-26T16:00:00.000Z";
  const now = Date.parse(createdAt);
  expect(SIGNUP_FALLBACK_AFTER_S).toBe(45);
  expect(signupFallbackRetryAfter(createdAt, now, false)).toBe(45);
  expect(signupFallbackRetryAfter(createdAt, now + 44_000, false)).toBe(1);
  expect(signupFallbackRetryAfter(createdAt, now + 45_000, false)).toBe(0);
});

test("a server-recorded provider failure allows immediate OTP fallback", () => {
  const createdAt = "2026-11-26T16:00:00.000Z";
  expect(signupFallbackRetryAfter(createdAt, Date.parse(createdAt), true)).toBe(0);
  expect(fn).toContain("signal: AbortSignal.timeout(8000)");
});

test("event signups allow a shared venue network without disabling abuse limits", () => {
  expect(fn).toContain("signupPerIpHour: 5000");
  expect(fn).toContain("sendPerIpHour: 5000");
  expect(fn).toContain('countEvents("signup", "ip", ip, 3600_000)) >= LIMITS.signupPerIpHour');
  expect(fn).toContain("fallbackPerPhoneHour: 10");
});

test("signup refuses to leave an account when registration details were not saved", () => {
  expect(fn).toContain('return fail("profile_save_failed")');
  expect(fn).toContain("deleteUser(created.user.id)");
  expect(page).not.toContain('supabase.from("profiles").update(patch)');
});
