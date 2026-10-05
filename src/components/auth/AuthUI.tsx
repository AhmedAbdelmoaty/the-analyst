import "@/styles/auth.css";
import { ReactNode, useEffect, useRef, useState, ClipboardEvent, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ChevronDown, Eye, EyeOff, Search } from "lucide-react";
import * as Flags from "country-flag-icons/react/3x2";
import analystLockup from "@/assets/brand/the-analyst-lockup.png";
import { COUNTRIES } from "@/lib/phoneAuth";
import { useLandingAuth } from "@/components/auth/LandingContext";

export const AuthShell = ({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) => {
  const embedded = useLandingAuth();
  const card = <motion.section initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.32 }} className="w-full max-w-[430px] rounded-lg border border-border bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        {!embedded && <img src={analystLockup} alt="The Analyst" className="mx-auto mb-3 h-[68px] w-[105px] object-contain sm:h-[76px] sm:w-[118px]" />}
        <h2 className="text-center text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <div className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">{subtitle}</div>}
        <div className="mt-5">{children}</div>
      </motion.section>;
  if (embedded) return card;
  return (
  <div dir="rtl" className="auth-theme relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
    <div className="fixed inset-0" aria-hidden="true">

      <div className="absolute inset-0 bg-background/55" />
    </div>
    <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-5 sm:py-8">
      {card}
    </main>
  </div>
  );
};

const inputCls = "h-11 w-full rounded-md border border-border bg-input px-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive";

export const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-bold text-foreground">{label}</label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`${inputCls} ${props.className ?? ""}`} />
);

export const PasswordInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} dir="ltr" className={`${inputCls} pl-12 text-left`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
};

export const PhoneInput = ({ id, dial, onDial, value, onChange, invalid }: {
  id: string; dial: string; onDial: (d: string) => void; value: string; onChange: (v: string) => void; invalid?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0];
  const matches = COUNTRIES.filter((c) => `${c.name} ${c.dial} ${c.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  const SelectedFlag = Flags[selected.code as keyof typeof Flags];
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div ref={wrap} dir="ltr" className="relative flex h-11 rounded-md border border-border bg-input focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
      <button type="button" aria-label="اختيار الدولة" aria-expanded={open} aria-haspopup="listbox" onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex w-[103px] shrink-0 items-center justify-center gap-1 border-r border-border text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <SelectedFlag className="h-4 w-6 shrink-0" title={selected.name} /><span>+{dial}</span><ChevronDown className="h-3.5 w-3.5" />
      </button>
      <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" dir="ltr" value={value} aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)} placeholder="10 1234 5678"
        className="min-w-0 flex-1 rounded-r-md bg-transparent px-3 text-left text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none" />
      {open && <div className="absolute left-0 top-full z-30 mt-1 w-[min(20rem,calc(100vw-3rem))] rounded-md border border-border bg-card p-2 shadow-xl" dir="rtl">
        <div className="relative">
          <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن الدولة أو الرمز" aria-label="ابحث عن الدولة"
            className={`${inputCls} h-10 pr-8 text-sm`} />
        </div>
        <div role="listbox" aria-label="الدول" className="mt-1 max-h-44 overflow-y-auto">
          {matches.map((c) => { const Flag = Flags[c.code as keyof typeof Flags]; return <button key={c.code} type="button" role="option" aria-selected={c.dial === dial}
            onClick={() => { onDial(c.dial); setOpen(false); }}
            className="flex min-h-10 w-full items-center gap-2 rounded-sm px-2 text-right text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none">
            <Flag className="h-4 w-6 shrink-0" title={c.name} /><span className="flex-1">{c.name}</span><span dir="ltr" className="text-muted-foreground">+{c.dial}</span>
          </button>; })}
          {matches.length === 0 && <p className="p-3 text-sm text-muted-foreground">لا توجد نتائج.</p>}
        </div>
      </div>}
    </div>
  );
};

export const OtpInput = ({ value, onChange, disabled, onComplete }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; onComplete?: (v: string) => void;
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    return clean;
  };
  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, "");
    if (d.length > 1) { const c = set(value.slice(0, i) + d); refs.current[Math.min(c.length, 5)]?.focus(); return; }
    const arr = value.padEnd(6, " ").split("");
    arr[i] = d || " ";
    set(arr.join("").replace(/\s+$/, "").replace(/\s/g, ""));
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) { refs.current[i - 1]?.focus(); set(value.slice(0, i - 1)); e.preventDefault(); }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const c = set(e.clipboardData.getData("text"));
    refs.current[Math.min(c.length, 5)]?.focus();
  };
  return (
    <div dir="ltr" className="flex justify-center gap-1.5 sm:gap-2" role="group" aria-label="رمز التحقق">
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKey(i, e)} onPaste={handlePaste}
          onFocus={(e) => e.target.select()} disabled={disabled} inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`الرقم ${i + 1}`}
          className="h-12 w-full min-w-0 max-w-[3.25rem] rounded-md border border-border bg-input text-center text-xl font-bold text-foreground focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50" />
      ))}
    </div>
  );
};

export const ErrorBox = ({ children }: { children: ReactNode }) => (
  <motion.div role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{children}</span>
  </motion.div>
);
export const InfoBox = ({ children }: { children: ReactNode }) => (
  <div role="status" className="text-center text-sm leading-relaxed text-muted-foreground">{children}</div>
);
export const PrimaryButton = ({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
  <button {...props} disabled={props.disabled || loading} aria-busy={loading}
    className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-base font-bold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50">
    {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /><span>جارٍ المعالجة...</span></> : children}
  </button>
);
export const LinkButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" {...props} className={`min-h-10 rounded-sm px-1 text-sm font-bold text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground disabled:no-underline ${props.className ?? ""}`}>
    {children}
  </button>
);
