import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInstall } from "@/contexts/InstallContext";
import { PrimaryButton, LinkButton } from "@/components/auth/AuthUI";
import analystLockup from "@/assets/brand/the-analyst-lockup.png";

export default function InstallPrompt() {
  const navigate = useNavigate();
  const { available, standalone, deferred, dismiss, install, guidance } = useInstall();
  const [busy, setBusy] = useState(false);
  const show = !standalone && !deferred && (available || !!guidance);
  return <div dir="rtl" className="auth-theme flex min-h-[100dvh] items-center justify-center bg-background px-5 py-8 text-foreground">
    <div className="w-full max-w-md rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm">
      <img src={analystLockup} alt="The Analyst" className="mx-auto mb-5 h-20 w-auto object-contain" />
      {show ? <>
        <h1 className="text-2xl font-bold">The Analyst على شاشتك الرئيسية</h1>
        <p className="mt-3 text-muted-foreground">افتح التجربة بسهولة في أي وقت.</p>
        {available ? <PrimaryButton disabled={busy} onClick={async () => { setBusy(true); await install(); setBusy(false); navigate('/play', {replace:true}); }}>تثبيت التطبيق</PrimaryButton> : <p className="mt-6 rounded-md bg-muted p-3 text-sm text-muted-foreground">{guidance}</p>}
        <LinkButton onClick={() => { dismiss(); navigate('/play', {replace:true}); }}>لاحقًا</LinkButton>
      </> : <PrimaryButton onClick={() => navigate('/play', {replace:true})}>متابعة اللعب</PrimaryButton>}
      <Link to="/" className="mt-5 block text-sm text-primary underline-offset-4 hover:underline">عن The Analyst</Link>
    </div>
  </div>;
}
