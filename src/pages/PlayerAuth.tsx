import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AuthShell, ErrorBox, Field, InfoBox, LinkButton, OtpInput, PasswordInput, PhoneInput, PrimaryButton, TextInput,
} from "@/components/auth/AuthUI";
import { errText, maskPhone, phoneAuth, PhoneAuthResult, toE164 } from "@/lib/phoneAuth";

type Mode = "login" | "signup" | "verify" | "forgot" | "forgot_code" | "forgot_new" | "forgot_done";

const modeFromPath = (p: string): Mode =>
  p.startsWith("/signup") ? "signup" : p.startsWith("/forgot-password") ? "forgot" : "login";

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

const PlayerAuth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, isProfileComplete, signInWithPhone } = useAuth();

  const [mode, setModeState] = useState<Mode>(modeFromPath(location.pathname));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dial, setDial] = useState("20");
  const [local, setLocal] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [cooldown, setCooldown] = useCountdown();

  // Phone the current verification belongs to (and old phone when editing number)
  const [activePhone, setActivePhone] = useState("");
  const [editingFrom, setEditingFrom] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    if (!authLoading && user && mode !== "forgot_done") navigate(isProfileComplete ? "/" : "/setup", { replace: true });
  }, [authLoading, user, isProfileComplete, navigate, mode]);

  const setMode = (m: Mode, path?: string) => {
    setError(null); setNotice(null); setCode("");
    setModeState(m);
    if (path) navigate(path, { replace: true });
  };

  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await fn(); } finally { busyRef.current = false; setBusy(false); }
  };

  const applySend = (r: PhoneAuthResult, okNotice: string) => {
    setCooldown(r.retry_after ?? r.cooldown ?? 60);
    if (r.ok && r.sent === false) setNotice(null), setError("ماقدرناش نبعت رسالة الواتساب دلوقتي. استنى العداد وجرّب «ابعت كود جديد»، أو تأكد من الرقم.");
    else if (r.ok) setNotice(okNotice);
  };

  const phone = toE164(dial, local);

  // ---------- Login ----------
  const onLogin = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!phone) return setError(errText("invalid_phone"));
      const { error } = await signInWithPhone(phone, password);
      if (!error) return;
      if (error === "phone_not_confirmed") {
        const r = await phoneAuth("send_signup_code", { phone, password });
        setActivePhone(phone);
        setMode("verify");
        if (!r.ok && r.error !== "cooldown") return setError(errText(r.error));
        applySend(r, "حسابك لسه محتاج تأكيد. بعتنالك كود على واتساب.");
        if (r.error === "cooldown") setNotice("حسابك لسه محتاج تأكيد. استخدم آخر كود وصلك أو استنى وتطلب كود جديد.");
        return;
      }
      setError(errText(error));
    });
  };

  // ---------- Signup ----------
  const onSignup = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!firstName.trim() || !lastName.trim()) return setError("اكتب اسمك الأول والأخير.");
      if (!phone) return setError(errText("invalid_phone"));
      if (password.length < 8) return setError(errText("weak_password"));
      if (password !== confirm) return setError(errText("password_mismatch"));
      if (editingFrom) {
        const r = await phoneAuth("change_phone", { phone: editingFrom, password, new_phone: phone });
        if (!r.ok) return setError(errText(r.error));
        setEditingFrom(null); setActivePhone(phone); setMode("verify");
        return applySend(r, "بعتنا كود على الرقم الجديد.");
      }
      const r = await phoneAuth("signup", { first_name: firstName.trim(), last_name: lastName.trim(), phone, password });
      if (!r.ok) return setError(errText(r.error));
      setActivePhone(phone); setMode("verify");
      applySend(r, "بعتنالك كود على واتساب.");
    });
  };

  const verifyCode = (value: string) => run(async () => {
    if (value.length !== 6) return setError("اكتب الكود كامل (6 أرقام).");
    const r = await phoneAuth("verify_signup", { phone: activePhone, code: value });
    if (!r.ok) {
      setCode("");
      const extra = r.error === "invalid_code" && r.remaining ? ` باقي ${r.remaining} محاولات.` : "";
      return setError(errText(r.error) + extra);
    }
    setNotice("تم تأكيد رقمك ✓ بنسجّل دخولك…");
    const { error } = await signInWithPhone(activePhone, password);
    if (error) { setMode("login", "/login"); setNotice("تم تأكيد رقمك. سجّل دخول بكلمة السر."); }
  });

  const resendSignup = () => run(async () => {
    const r = await phoneAuth("send_signup_code", { phone: activePhone, password });
    if (!r.ok) { if (r.retry_after) setCooldown(r.retry_after); return setError(errText(r.error)); }
    setCode(""); applySend(r, "بعتنا كود جديد. الكود القديم مبقاش شغال.");
  });

  const editNumber = () => {
    setEditingFrom(activePhone);
    setConfirm(password);
    setMode("signup", "/signup");
    setNotice("عدّل الرقم ودوس «ابعت الكود». مش هنغيّر كلمة السر.");
  };

  // ---------- Recovery ----------
  const onForgot = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!phone) return setError(errText("invalid_phone"));
      const r = await phoneAuth("recovery_start", { phone });
      if (!r.ok && r.error !== "cooldown") return setError(errText(r.error));
      setActivePhone(phone); setMode("forgot_code");
      applySend(r, "لو الرقم ده عليه حساب، هيوصله كود على واتساب.");
      if (r.error === "cooldown") setNotice("لسه باعتين كود من شوية. استخدمه أو استنى العداد.");
    });
  };

  const verifyRecovery = (value: string) => run(async () => {
    if (value.length !== 6) return setError("اكتب الكود كامل (6 أرقام).");
    const r = await phoneAuth("recovery_verify", { phone: activePhone, code: value });
    if (!r.ok || !r.reset_token) {
      setCode("");
      const extra = r.error === "invalid_code" && r.remaining ? ` باقي ${r.remaining} محاولات.` : "";
      return setError(errText(r.error) + extra);
    }
    setResetToken(r.reset_token); setPassword(""); setConfirm("");
    setMode("forgot_new");
  });

  const resendRecovery = () => run(async () => {
    const r = await phoneAuth("recovery_start", { phone: activePhone });
    if (!r.ok) { if (r.retry_after) setCooldown(r.retry_after); return setError(errText(r.error)); }
    setCode(""); applySend(r, "بعتنا كود جديد. الكود القديم مبقاش شغال.");
  });

  const onNewPassword = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (password.length < 8) return setError(errText("weak_password"));
      if (password !== confirm) return setError(errText("password_mismatch"));
      const r = await phoneAuth("recovery_reset", { phone: activePhone, reset_token: resetToken, password });
      if (!r.ok) {
        if (r.error === "reset_expired") { setMode("forgot"); }
        return setError(errText(r.error));
      }
      setResetToken(""); setPassword(""); setConfirm("");
      setMode("forgot_done");
    });
  };

  const resendLabel = cooldown > 0 ? `ابعت كود جديد بعد ${cooldown} ث` : "ابعت كود جديد";
  const messages = (
    <div className="space-y-3" aria-live="polite">
      {notice && <InfoBox>{notice}</InfoBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  );

  if (mode === "login") return (
    <AuthShell title="تسجيل الدخول" subtitle="ادخل برقم الواتساب وكلمة السر عشان تكمّل القضية.">
      <form onSubmit={onLogin} className="space-y-4" noValidate>
        <Field id="phone" label="رقم الواتساب">
          <PhoneInput id="phone" dial={dial} onDial={setDial} value={local} onChange={setLocal} />
        </Field>
        <Field id="password" label="كلمة السر">
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="-mt-1 text-left">
          <LinkButton onClick={() => { setPassword(""); setMode("forgot", "/forgot-password"); }}>نسيت كلمة السر؟</LinkButton>
        </div>
        {messages}
        <PrimaryButton type="submit" loading={busy}>دخول</PrimaryButton>
        <p className="text-center text-sm text-muted-foreground">
          أول مرة هنا؟ <LinkButton onClick={() => { setPassword(""); setMode("signup", "/signup"); }}>اعمل حساب</LinkButton>
        </p>
      </form>
    </AuthShell>
  );

  if (mode === "signup") return (
    <AuthShell title={editingFrom ? "تعديل الرقم" : "حساب جديد"} subtitle="هنبعتلك كود تأكيد على واتساب للرقم اللي هتكتبه.">
      <form onSubmit={onSignup} className="space-y-4" noValidate>
        {!editingFrom && (
          <div className="grid grid-cols-2 gap-3">
            <Field id="first" label="الاسم الأول">
              <TextInput id="first" autoComplete="given-name" dir="auto" maxLength={50} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field id="last" label="الاسم الأخير">
              <TextInput id="last" autoComplete="family-name" dir="auto" maxLength={50} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
        )}
        <Field id="phone" label="رقم الواتساب" hint="الكود ده للتأكيد بس، ومش هنستخدم رقمك في رسايل دعاية.">
          <PhoneInput id="phone" dial={dial} onDial={setDial} value={local} onChange={setLocal} />
        </Field>
        {!editingFrom && (
          <>
            <Field id="password" label="كلمة السر" hint="8 حروف أو أرقام على الأقل.">
              <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field id="confirm" label="تأكيد كلمة السر">
              <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
          </>
        )}
        {messages}
        <PrimaryButton type="submit" loading={busy}>
          <MessageCircle className="h-5 w-5" /> ابعت الكود على واتساب
        </PrimaryButton>
        <p className="text-center text-sm text-muted-foreground">
          {editingFrom ? (
            <LinkButton onClick={() => { setLocal(""); setActivePhone(editingFrom); setEditingFrom(null); setMode("verify"); }}>رجوع لشاشة الكود</LinkButton>
          ) : (<>عندك حساب؟ <LinkButton onClick={() => { setPassword(""); setConfirm(""); setMode("login", "/login"); }}>سجّل دخول</LinkButton></>)}
        </p>
      </form>
    </AuthShell>
  );

  if (mode === "verify" || mode === "forgot_code") {
    const isSignup = mode === "verify";
    return (
      <AuthShell
        title={isSignup ? "أكّد رقمك" : "كود استرجاع الحساب"}
        subtitle={<>بعتنا كود من 6 أرقام على واتساب للرقم <bdi dir="ltr" className="font-bold text-foreground">{maskPhone(activePhone)}</bdi>. الكود صالح لمدة 5 دقايق.</>}
      >
        <form onSubmit={(e) => { e.preventDefault(); (isSignup ? verifyCode : verifyRecovery)(code); }} className="space-y-4">
          <OtpInput value={code} onChange={setCode} disabled={busy} onComplete={(v) => (isSignup ? verifyCode : verifyRecovery)(v)} />
          {messages}
          <PrimaryButton type="submit" loading={busy} disabled={code.length !== 6}>تأكيد</PrimaryButton>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <LinkButton onClick={isSignup ? resendSignup : resendRecovery} disabled={cooldown > 0 || busy}>{resendLabel}</LinkButton>
            {isSignup ? (
              <LinkButton onClick={editNumber} disabled={busy}>تعديل الرقم</LinkButton>
            ) : (
              <LinkButton onClick={() => setMode("forgot")} disabled={busy}>تغيير الرقم</LinkButton>
            )}
          </div>
          <div className="text-center">
            <LinkButton className="text-muted-foreground" onClick={() => { setPassword(""); setMode("login", "/login"); }}>رجوع لتسجيل الدخول</LinkButton>
          </div>
        </form>
      </AuthShell>
    );
  }

  if (mode === "forgot") return (
    <AuthShell title="نسيت كلمة السر" subtitle="اكتب رقم الواتساب المسجّل وهنبعتلك كود عشان تعمل كلمة سر جديدة.">
      <form onSubmit={onForgot} className="space-y-4" noValidate>
        <Field id="phone" label="رقم الواتساب">
          <PhoneInput id="phone" dial={dial} onDial={setDial} value={local} onChange={setLocal} />
        </Field>
        {messages}
        <PrimaryButton type="submit" loading={busy}><MessageCircle className="h-5 w-5" /> ابعت الكود</PrimaryButton>
        <div className="text-center">
          <LinkButton className="text-muted-foreground" onClick={() => setMode("login", "/login")}>رجوع لتسجيل الدخول</LinkButton>
        </div>
      </form>
    </AuthShell>
  );

  if (mode === "forgot_new") return (
    <AuthShell title="كلمة سر جديدة" subtitle="تم التأكد من الكود. اختار كلمة سر جديدة.">
      <form onSubmit={onNewPassword} className="space-y-4" noValidate>
        <Field id="password" label="كلمة السر الجديدة" hint="8 حروف أو أرقام على الأقل.">
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field id="confirm" label="تأكيد كلمة السر">
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {messages}
        <PrimaryButton type="submit" loading={busy}>حفظ كلمة السر</PrimaryButton>
      </form>
    </AuthShell>
  );

  return (
    <AuthShell title="تم تغيير كلمة السر">
      <div className="space-y-5 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <p className="text-sm text-muted-foreground">تقدر دلوقتي تدخل بكلمة السر الجديدة.</p>
        <PrimaryButton type="button" onClick={() => setMode("login", "/login")}>تسجيل الدخول</PrimaryButton>
      </div>
    </AuthShell>
  );
};

export default PlayerAuth;
