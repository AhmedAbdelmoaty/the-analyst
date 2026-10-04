import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
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
  const [sendFailed, setSendFailed] = useState(false);
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
    if (r.ok && r.sent === false) { setSendFailed(true); setNotice(null); setError("تعذر إرسال رمز التحقق عبر واتساب. تحقق من الرقم وأعد المحاولة بعد انتهاء المهلة."); }
    else if (r.ok) { setSendFailed(false); setNotice(okNotice); }
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
        applySend(r, "أُرسل رمز التحقق عبر واتساب.");
        if (r.error === "cooldown") { setCooldown(r.retry_after ?? 60); setNotice("استخدم رمز التحقق السابق أو أعد الإرسال بعد انتهاء المهلة."); }
        return;
      }
      setError(errText(error));
    });
  };

  // ---------- Signup ----------
  const onSignup = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!phone) return setError(errText("invalid_phone"));
      if (editingFrom) {
        const r = await phoneAuth("change_phone", { phone: editingFrom, password, new_phone: phone });
        if (!r.ok) return setError(errText(r.error));
        setEditingFrom(null); setActivePhone(phone); setMode("verify");
        return applySend(r, "أُرسل رمز التحقق إلى الرقم الجديد عبر واتساب.");
      }
      if (!firstName.trim() || !lastName.trim()) return setError("أدخل الاسم الأول والأخير.");
      if (password.length < 8) return setError(errText("weak_password"));
      if (password !== confirm) return setError(errText("password_mismatch"));
      const r = await phoneAuth("signup", { first_name: firstName.trim(), last_name: lastName.trim(), phone, password });
      if (!r.ok) return setError(errText(r.error));
      setActivePhone(phone); setMode("verify");
      applySend(r, "أُرسل رمز التحقق عبر واتساب.");
    });
  };

  const verifyCode = (value: string) => run(async () => {
    if (value.length !== 6) return setError("أدخل رمز التحقق المكوّن من 6 أرقام.");
    const r = await phoneAuth("verify_signup", { phone: activePhone, code: value });
    if (!r.ok) {
      setCode("");
      const extra = r.error === "invalid_code" && r.remaining ? ` المحاولات المتبقية: ${r.remaining}.` : "";
      return setError(errText(r.error) + extra);
    }
    setNotice("تم تأكيد الرقم. جارٍ تسجيل الدخول...");
    const { error } = await signInWithPhone(activePhone, password);
    if (error) { setMode("login", "/login"); setNotice("تم تأكيد الرقم. سجّل الدخول بكلمة المرور."); }
  });

  const resendSignup = () => run(async () => {
    const r = await phoneAuth("send_signup_code", { phone: activePhone, password });
    if (!r.ok) { if (r.retry_after) setCooldown(r.retry_after); return setError(errText(r.error)); }
    setCode(""); applySend(r, "أُرسل رمز جديد عبر واتساب. انتهت صلاحية الرمز السابق.");
  });

  const editNumber = () => {
    setEditingFrom(activePhone);
    setConfirm(password);
    setMode("signup", "/signup");
    setNotice("غيّر الرقم لإرسال رمز تحقق جديد. لن تتغير كلمة المرور.");
  };

  // ---------- Recovery ----------
  const onForgot = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!phone) return setError(errText("invalid_phone"));
      const r = await phoneAuth("recovery_start", { phone });
      if (!r.ok && r.error !== "cooldown") return setError(errText(r.error));
      setActivePhone(phone); setMode("forgot_code");
      applySend(r, "إذا كان الرقم مسجلًا، فستصلك رسالة عبر واتساب.");
      if (r.error === "cooldown") { setCooldown(r.retry_after ?? 60); setNotice("استخدم الرمز السابق أو أعد الإرسال بعد انتهاء المهلة."); }
    });
  };

  const verifyRecovery = (value: string) => run(async () => {
    if (value.length !== 6) return setError("أدخل رمز التحقق المكوّن من 6 أرقام.");
    const r = await phoneAuth("recovery_verify", { phone: activePhone, code: value });
    if (!r.ok || !r.reset_token) {
      setCode("");
      const extra = r.error === "invalid_code" && r.remaining ? ` المحاولات المتبقية: ${r.remaining}.` : "";
      return setError(errText(r.error) + extra);
    }
    setResetToken(r.reset_token); setPassword(""); setConfirm("");
    setMode("forgot_new");
  });

  const resendRecovery = () => run(async () => {
    const r = await phoneAuth("recovery_start", { phone: activePhone });
    if (!r.ok) { if (r.retry_after) setCooldown(r.retry_after); return setError(errText(r.error)); }
    setCode(""); applySend(r, "أُرسل رمز جديد عبر واتساب. انتهت صلاحية الرمز السابق.");
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

  const resendLabel = cooldown > 0 ? `إعادة الإرسال خلال ${Math.floor(cooldown / 60).toString().padStart(2, "0")}:${(cooldown % 60).toString().padStart(2, "0")}` : "إعادة إرسال رمز التحقق";
  const messages = (
    <div className="space-y-2" aria-live="polite">
      {notice && <InfoBox>{notice}</InfoBox>}
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  );

  if (mode === "login") return (
    <AuthShell title="تسجيل الدخول">
      <form onSubmit={onLogin} className="space-y-3.5" noValidate>
        <Field id="phone" label="رقم واتساب"><PhoneInput id="phone" dial={dial} onDial={setDial} value={local} onChange={setLocal} /></Field>
        <Field id="password" label="كلمة المرور"><PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <div className="text-left"><LinkButton onClick={() => { setPassword(""); setMode("forgot", "/forgot-password"); }}>نسيت كلمة المرور؟</LinkButton></div>
        {messages}
        <PrimaryButton type="submit" loading={busy}>تسجيل الدخول</PrimaryButton>
        <p className="text-center text-sm text-muted-foreground">ليس لديك حساب؟ <LinkButton onClick={() => { setPassword(""); setMode("signup", "/signup"); }}>إنشاء حساب</LinkButton></p>
      </form>
    </AuthShell>
  );

  if (mode === "signup") return (
    <AuthShell title={editingFrom ? "تغيير الرقم" : "إنشاء حساب"}>
      <form onSubmit={onSignup} className="space-y-3" noValidate>
        {!editingFrom && <div className="grid grid-cols-2 gap-2.5">
          <Field id="first" label="الاسم الأول"><TextInput id="first" autoComplete="given-name" dir="auto" placeholder="الاسم الأول" maxLength={50} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field id="last" label="الاسم الأخير"><TextInput id="last" autoComplete="family-name" dir="auto" placeholder="الاسم الأخير" maxLength={50} value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>}
        <Field id="phone" label="رقم واتساب"><PhoneInput id="phone" dial={dial} onDial={setDial} value={local} onChange={setLocal} /></Field>
        {!editingFrom && <>
          <Field id="password" label="كلمة المرور"><PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field id="confirm" label="تأكيد كلمة المرور"><PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        </>}
        {messages}
        <PrimaryButton type="submit" loading={busy}>{editingFrom ? "إرسال رمز التحقق" : "إنشاء حساب"}</PrimaryButton>
        <p className="text-center text-sm text-muted-foreground">{editingFrom ? (
          <LinkButton onClick={() => { setLocal(""); setActivePhone(editingFrom); setEditingFrom(null); setMode("verify"); }}>العودة إلى التحقق</LinkButton>
        ) : (<>لديك حساب بالفعل؟ <LinkButton onClick={() => { setPassword(""); setConfirm(""); setMode("login", "/login"); }}>تسجيل الدخول</LinkButton></>)}</p>
      </form>
    </AuthShell>
  );

  if (mode === "verify" || mode === "forgot_code") {
    const isSignup = mode === "verify";
    return (
      <AuthShell title={isSignup ? "تأكيد رقم واتساب" : "التحقق من الحساب"} subtitle={<>
        {sendFailed ? "تعذر إرسال رمز التحقق إلى" : isSignup ? "أرسلنا رمز التحقق عبر واتساب إلى" : "إذا كان الرقم مسجلًا، يُرسل رمز التحقق عبر واتساب إلى"}<br />
        <bdi dir="ltr" className="font-semibold text-foreground">{maskPhone(activePhone)}</bdi>
        {!sendFailed && <span className="block text-xs">الرمز صالح لمدة 5 دقائق.</span>}
      </>}>
        <form onSubmit={(e) => { e.preventDefault(); (isSignup ? verifyCode : verifyRecovery)(code); }} className="space-y-3.5">
          <OtpInput value={code} onChange={setCode} disabled={busy} onComplete={(v) => (isSignup ? verifyCode : verifyRecovery)(v)} />
          {error && <ErrorBox>{error}</ErrorBox>}
          <PrimaryButton type="submit" loading={busy} disabled={code.length !== 6}>تأكيد</PrimaryButton>
          <div className="flex flex-col items-center">
            <LinkButton onClick={isSignup ? resendSignup : resendRecovery} disabled={cooldown > 0 || busy}>{resendLabel}</LinkButton>
            <LinkButton onClick={isSignup ? editNumber : () => setMode("forgot")} disabled={busy}>تغيير الرقم</LinkButton>
            <LinkButton className="text-muted-foreground" onClick={() => { setPassword(""); setMode("login", "/login"); }}>العودة إلى تسجيل الدخول</LinkButton>
          </div>
        </form>
      </AuthShell>
    );
  }

  if (mode === "forgot") return (
    <AuthShell title="استعادة كلمة المرور">
      <form onSubmit={onForgot} className="space-y-4" noValidate>
        <Field id="phone" label="رقم واتساب المسجل"><PhoneInput id="phone" dial={dial} onDial={setDial} value={local} onChange={setLocal} /></Field>
        {messages}
        <PrimaryButton type="submit" loading={busy}>إرسال رمز التحقق</PrimaryButton>
        <div className="text-center"><LinkButton onClick={() => setMode("login", "/login")}>العودة إلى تسجيل الدخول</LinkButton></div>
      </form>
    </AuthShell>
  );

  if (mode === "forgot_new") return (
    <AuthShell title="كلمة مرور جديدة">
      <form onSubmit={onNewPassword} className="space-y-4" noValidate>
        <Field id="password" label="كلمة المرور الجديدة"><PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field id="confirm" label="تأكيد كلمة المرور"><PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {messages}
        <PrimaryButton type="submit" loading={busy}>حفظ كلمة المرور</PrimaryButton>
      </form>
    </AuthShell>
  );

  return (
    <AuthShell title="تم تحديث كلمة المرور">
      <div className="space-y-7 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-primary" strokeWidth={1.5} />
        <PrimaryButton type="button" onClick={() => setMode("login", "/login")}>تسجيل الدخول</PrimaryButton>
      </div>
    </AuthShell>
  );
};

export default PlayerAuth;
