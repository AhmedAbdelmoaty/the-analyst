// TEMPORARY test helper — deleted after testing. Only works for test numbers +99900000xx (unassigned code, no real recipient).
import { createClient } from "npm:@supabase/supabase-js@2";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
async function hmac(d: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("OTP_HMAC_SECRET")!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(d)))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req) => {
  const b = await req.json();
  if (!/^\+99900000\d\d$/.test(b.phone ?? "")) return new Response("no", { status: 403 });
  if (b.op === "plant") {
    const { data: ch } = await admin.from("otp_challenges").select("id,user_id").eq("phone", b.phone).eq("purpose", b.purpose).order("created_at", { ascending: false }).limit(1).single();
    await admin.from("otp_challenges").update({ code_hmac: await hmac(`otp:${b.purpose}:${ch!.user_id}:${b.phone}:${b.code}`), ...(b.expire ? { expires_at: new Date(Date.now() - 1000).toISOString() } : {}) }).eq("id", ch!.id);
    return Response.json({ ok: true });
  }
  if (b.op === "age") {
    await admin.from("otp_rate_events").delete().like("phone", "+999%"); // bypass cooldown for testing
    await admin.from("otp_challenges").update({ created_at: new Date(Date.now() - 120000).toISOString() }).eq("phone", b.phone);
    return Response.json({ ok: true });
  }
  if (b.op === "cleanup") {
    const { data } = await admin.rpc("auth_user_by_phone", { _phone: b.phone });
    if (data?.[0]) await admin.auth.admin.deleteUser(data[0].id);
    await admin.from("otp_challenges").delete().eq("phone", b.phone);
    await admin.from("otp_rate_events").delete().eq("phone", b.phone);
    return Response.json({ ok: true, deleted: !!data?.[0] });
  }
  return new Response("bad", { status: 400 });
});
