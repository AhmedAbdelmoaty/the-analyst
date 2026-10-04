import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const HMAC_SECRET = Deno.env.get("OTP_HMAC_SECRET")!;
const CHAKRA_TOKEN = Deno.env.get("CHAKRA_ACCESS_TOKEN")!;

const CHAKRA_PLUGIN_ID = "176a71cc-6f86-4e29-b2cf-ec39b75c9dff";
const CHAKRA_SENDER_ID = "972655752602773";
const CHAKRA_TEMPLATE = "analyst_verification";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_S = 60;
const RESET_TTL_MS = 10 * 60 * 1000;
const LIMITS = {
  sendPerPhoneHour: 5,
  sendPerIpHour: 60,
  verifyPerIpHour: 150,
  verifyPerPhoneHour: 15,
};

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fail = (error: string, extra: Record<string, unknown> = {}) => json({ ok: false, error, ...extra });

const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/);
const passwordSchema = z.string().min(8).max(72);
const codeSchema = z.string().regex(/^\d{6}$/);
const nameSchema = z.string().trim().min(1).max(50);

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(HMAC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const codeHmac = (purpose: string, userId: string, phone: string, code: string) => hmac(`otp:${purpose}:${userId}:${phone}:${code}`);

function randomCode(): string {
  // Rejection sampling for uniform 000000-999999
  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < 4294000000) return String(buf[0] % 1000000).padStart(6, "0");
  }
}
function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request): string {
  return (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);
}

async function countEvents(kind: string, field: "phone" | "ip", value: string, sinceMs: number) {
  const { count } = await admin.from("otp_rate_events").select("id", { count: "exact", head: true })
    .eq("kind", kind).eq(field, value).gte("created_at", new Date(Date.now() - sinceMs).toISOString());
  return count ?? 0;
}
const logEvent = (kind: string, phone: string | null, ip: string) => admin.from("otp_rate_events").insert({ kind, phone, ip });

async function findUser(phone: string): Promise<{ id: string; phone_confirmed: boolean } | null> {
  const { data, error } = await admin.rpc("auth_user_by_phone", { _phone: phone });
  if (error) throw new Error("lookup_failed");
  return (data && data[0]) || null;
}

/** Checks password for a phone account. Returns 'unconfirmed' | 'confirmed' | 'bad'. Never creates a lasting session. */
async function checkPassword(phone: string, password: string): Promise<"unconfirmed" | "confirmed" | "bad"> {
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ phone, password });
  if (!error) {
    if (data.session) await anon.auth.signOut({ scope: "local" }).catch(() => {});
    if (data.session?.access_token) await admin.auth.admin.signOut(data.session.access_token, "local").catch(() => {});
    return "confirmed";
  }
  const code = (error as { code?: string }).code;
  if (code === "phone_not_confirmed" || /phone not confirmed/i.test(error.message)) return "unconfirmed";
  return "bad";
}

async function sendWhatsApp(phone: string, code: string): Promise<boolean> {
  const recipient = phone.replace(/^\+/, "");
  try {
    const res = await fetch(
      `https://api.chakrahq.com/v1/ext/plugin/whatsapp/${CHAKRA_PLUGIN_ID}/phoneNumber/${recipient}/send-template-message`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${CHAKRA_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappPhoneNumberId: CHAKRA_SENDER_ID,
          templateName: CHAKRA_TEMPLATE,
          languageCode: "en",
          mapping: [{ schemaPropertyName: "1", schemaPropertyValue: code }],
        }),
      },
    );
    const ok = res.ok;
    // Log status only — never the body (it can echo the code)
    if (!ok) console.warn("whatsapp_send_failed status", res.status);
    await res.body?.cancel().catch(() => {});
    return ok;
  } catch {
    console.warn("whatsapp_send_failed network");
    return false;
  }
}

/** Creates a fresh challenge (invalidating older ones) and sends it. Enforces cooldown and rate limits. */
async function issueChallenge(userId: string, phone: string, purpose: "signup" | "recovery", ip: string) {
  const { data: last } = await admin.from("otp_challenges").select("created_at")
    .eq("phone", phone).eq("purpose", purpose).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_S) return { ok: false as const, error: "cooldown", retry_after: Math.ceil(RESEND_COOLDOWN_S - elapsed) };
  }
  if ((await countEvents("send", "phone", phone, 3600_000)) >= LIMITS.sendPerPhoneHour) return { ok: false as const, error: "rate_limited" };
  if ((await countEvents("send", "ip", ip, 3600_000)) >= LIMITS.sendPerIpHour) return { ok: false as const, error: "rate_limited" };

  await admin.from("otp_challenges").update({ invalidated_at: new Date().toISOString() })
    .eq("phone", phone).eq("purpose", purpose).is("consumed_at", null).is("invalidated_at", null);

  const code = randomCode();
  const { error } = await admin.from("otp_challenges").insert({
    user_id: userId, phone, purpose,
    code_hmac: await codeHmac(purpose, userId, phone, code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
  if (error) return { ok: false as const, error: "server_error" };
  await logEvent("send", phone, ip);
  const sent = await sendWhatsApp(phone, code);
  return { ok: true as const, sent, cooldown: RESEND_COOLDOWN_S, expires_in: OTP_TTL_MS / 1000 };
}

async function verifyChallenge(phone: string, purpose: "signup" | "recovery", code: string, ip: string) {
  if ((await countEvents("verify", "ip", ip, 3600_000)) >= LIMITS.verifyPerIpHour) return { status: "rate_limited" as const };
  if ((await countEvents("verify", "phone", phone, 3600_000)) >= LIMITS.verifyPerPhoneHour) return { status: "rate_limited" as const };
  await logEvent("verify", phone, ip);
  const { data: ch } = await admin.from("otp_challenges").select("id, user_id")
    .eq("phone", phone).eq("purpose", purpose).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!ch) return { status: "no_challenge" as const };
  const { data, error } = await admin.rpc("otp_attempt", { _challenge_id: ch.id, _code_hmac: await codeHmac(purpose, ch.user_id, phone, code) });
  if (error || !data?.[0]) return { status: "server_error" as const };
  const r = data[0] as { status: string; user_id: string | null; remaining: number };
  return { status: r.status, user_id: r.user_id, remaining: r.remaining, challenge_id: ch.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed");
  const ip = clientIp(req);
  let body: any;
  try { body = await req.json(); } catch { return fail("invalid_input"); }

  try {
    switch (body?.action) {
      case "signup": {
        const p = z.object({ first_name: nameSchema, last_name: nameSchema, phone: phoneSchema, password: passwordSchema }).safeParse(body);
        if (!p.success) return fail("invalid_input");
        const { first_name, last_name, phone, password } = p.data;
        const existing = await findUser(phone);
        if (existing) return fail(existing.phone_confirmed ? "account_exists" : "account_pending");
        if ((await countEvents("signup", "ip", ip, 3600_000)) >= 50) return fail("rate_limited");
        await logEvent("signup", phone, ip);
        const { data: created, error } = await admin.auth.admin.createUser({
          phone, password, phone_confirm: false, user_metadata: { first_name, last_name },
        });
        if (error || !created.user) {
          console.warn("create_user_failed", error?.status, error?.message?.slice(0, 120));
          if (/already|exists|registered/i.test(error?.message ?? "")) return fail("account_exists");
          if (/password/i.test(error?.message ?? "")) return fail("weak_password");
          return fail("server_error");
        }
        await admin.from("profiles").update({ first_name, last_name, display_name: first_name, phone })
          .eq("user_id", created.user.id);
        const r = await issueChallenge(created.user.id, phone, "signup", ip);
        return json({ ok: true, sent: r.ok ? r.sent : false, cooldown: r.ok ? r.cooldown : RESEND_COOLDOWN_S, expires_in: OTP_TTL_MS / 1000 });
      }

      case "send_signup_code": {
        const p = z.object({ phone: phoneSchema, password: z.string().min(1).max(72) }).safeParse(body);
        if (!p.success) return fail("invalid_input");
        const user = await findUser(p.data.phone);
        if (!user) return fail("invalid_credentials");
        const pw = await checkPassword(p.data.phone, p.data.password);
        if (pw === "bad") return fail("invalid_credentials");
        if (pw === "confirmed" || user.phone_confirmed) return fail("already_verified");
        const r = await issueChallenge(user.id, p.data.phone, "signup", ip);
        return json(r);
      }

      case "change_phone": {
        const p = z.object({ phone: phoneSchema, password: z.string().min(1).max(72), new_phone: phoneSchema }).safeParse(body);
        if (!p.success) return fail("invalid_input");
        if (p.data.phone === p.data.new_phone) return fail("same_phone");
        const user = await findUser(p.data.phone);
        if (!user || user.phone_confirmed) return fail("invalid_credentials");
        if ((await checkPassword(p.data.phone, p.data.password)) !== "unconfirmed") return fail("invalid_credentials");
        if (await findUser(p.data.new_phone)) return fail("account_exists");
        const { error } = await admin.auth.admin.updateUserById(user.id, { phone: p.data.new_phone, phone_confirm: false });
        if (error) return fail("server_error");
        await admin.from("profiles").update({ phone: p.data.new_phone }).eq("user_id", user.id);
        await admin.from("otp_challenges").update({ invalidated_at: new Date().toISOString() })
          .eq("user_id", user.id).is("consumed_at", null).is("invalidated_at", null);
        const r = await issueChallenge(user.id, p.data.new_phone, "signup", ip);
        return json(r.ok ? r : { ok: true, sent: false, cooldown: RESEND_COOLDOWN_S, expires_in: OTP_TTL_MS / 1000 });
      }

      case "verify_signup": {
        const p = z.object({ phone: phoneSchema, code: codeSchema }).safeParse(body);
        if (!p.success) return fail("invalid_code");
        const r = await verifyChallenge(p.data.phone, "signup", p.data.code, ip);
        if (r.status !== "ok") return fail(r.status === "invalid" ? "invalid_code" : r.status, { remaining: (r as any).remaining });
        const user = await findUser(p.data.phone);
        if (!user || user.id !== r.user_id) return fail("server_error");
        const { error } = await admin.auth.admin.updateUserById(user.id, { phone_confirm: true });
        if (error) return fail("server_error");
        return json({ ok: true });
      }

      case "recovery_start": {
        const p = z.object({ phone: phoneSchema }).safeParse(body);
        if (!p.success) return fail("invalid_input");
        const user = await findUser(p.data.phone);
        if (!user) {
          // Same response shape as a real account to avoid number enumeration
          await logEvent("send", p.data.phone, ip);
          return json({ ok: true, sent: true, cooldown: RESEND_COOLDOWN_S, expires_in: OTP_TTL_MS / 1000 });
        }
        const r = await issueChallenge(user.id, p.data.phone, "recovery", ip);
        return json(r);
      }

      case "recovery_verify": {
        const p = z.object({ phone: phoneSchema, code: codeSchema }).safeParse(body);
        if (!p.success) return fail("invalid_code");
        const r = await verifyChallenge(p.data.phone, "recovery", p.data.code, ip);
        if (r.status === "no_challenge") return fail("invalid_code", { remaining: 4 });
        if (r.status !== "ok") return fail(r.status === "invalid" ? "invalid_code" : r.status, { remaining: (r as any).remaining });
        const token = randomToken();
        await admin.from("otp_challenges").update({
          reset_token_hmac: await hmac(`reset:${r.challenge_id}:${token}`),
          reset_expires_at: new Date(Date.now() + RESET_TTL_MS).toISOString(),
        }).eq("id", r.challenge_id!);
        return json({ ok: true, reset_token: `${r.challenge_id}.${token}` });
      }

      case "recovery_reset": {
        const p = z.object({ phone: phoneSchema, reset_token: z.string().max(200), password: passwordSchema }).safeParse(body);
        if (!p.success) return fail("invalid_input");
        const [cid, token] = p.data.reset_token.split(".");
        if (!cid || !token || !/^[0-9a-f-]{36}$/.test(cid)) return fail("reset_expired");
        // Atomic single-use consume
        const { data: row } = await admin.from("otp_challenges")
          .update({ reset_used_at: new Date().toISOString() })
          .eq("id", cid).eq("phone", p.data.phone).eq("purpose", "recovery")
          .eq("reset_token_hmac", await hmac(`reset:${cid}:${token}`))
          .is("reset_used_at", null).gt("reset_expires_at", new Date().toISOString())
          .select("user_id").maybeSingle();
        if (!row) return fail("reset_expired");
        // Owning the phone proves it, so it is also confirmed here
        const { error } = await admin.auth.admin.updateUserById(row.user_id, { password: p.data.password, phone_confirm: true });
        if (error) return fail(/password/i.test(error.message) ? "weak_password" : "server_error");
        return json({ ok: true });
      }

      default:
        return fail("invalid_input");
    }
  } catch (e) {
    console.warn("phone_auth_unhandled", e instanceof Error ? e.message.slice(0, 120) : "unknown");
    return fail("server_error");
  }
});
