import { ReactNode, useRef, useState, ClipboardEvent, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import storeFrontImg from "@/assets/scenes/prism-building-exterior.webp";
import analystLockup from "@/assets/brand/the-analyst-lockup.png";
import { COUNTRIES } from "@/lib/phoneAuth";

export const AuthShell = ({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) => (
  <div dir="rtl" className="relative min-h-[100dvh] overflow-x-hidden bg-background">
    <div className="fixed inset-0">
      <img src={storeFrontImg} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/60" />
    </div>
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-8 sm:py-12">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>
        <div className="mb-5 flex justify-center">
          <img src={analystLockup} alt="The Analyst" className="h-14 w-auto rounded-md bg-[hsl(var(--imp-paper))] px-3 py-2 sm:h-16" />
        </div>
        <div className="rounded-2xl border border-border bg-card/90 p-5 shadow-2xl backdrop-blur-md sm:p-7">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</div>}
          <div className="mt-5">{children}</div>
        </div>
      </motion.div>
    </div>
  </div>
);

const inputCls =
  "h-12 w-full rounded-lg border border-border bg-input px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive";

export const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-bold text-foreground">{label}</label>
    {children}
    {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
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
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
        className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
};

export const PhoneInput = ({ id, dial, onDial, value, onChange, invalid }: {
  id: string; dial: string; onDial: (d: string) => void; value: string; onChange: (v: string) => void; invalid?: boolean;
}) => (
  <div dir="ltr" className="flex gap-2">
    <select
      aria-label="كود الدولة"
      value={dial}
      onChange={(e) => onDial(e.target.value)}
      className="h-12 w-[7.5rem] shrink-0 rounded-lg border border-border bg-input px-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.dial}>{c.flag} +{c.dial} {c.name}</option>
      ))}
    </select>
    <input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      dir="ltr"
      value={value}
      aria-invalid={invalid}
      onChange={(e) => onChange(e.target.value)}
      placeholder="10 1234 5678"
      className={`${inputCls} min-w-0 flex-1 text-left tracking-wide`}
    />
  </div>
);

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
    <div dir="ltr" className="flex justify-between gap-1.5 sm:gap-2" role="group" aria-label="كود التأكيد">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          aria-label={`رقم ${i + 1}`}
          className="h-12 w-full min-w-0 max-w-[3.25rem] rounded-lg border border-border bg-input text-center text-xl font-bold text-foreground focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:h-14"
        />
      ))}
    </div>
  );
};

export const ErrorBox = ({ children }: { children: ReactNode }) => (
  <motion.div role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive-foreground">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
    <span>{children}</span>
  </motion.div>
);

export const InfoBox = ({ children }: { children: ReactNode }) => (
  <div role="status" className="rounded-lg border border-border bg-muted/50 p-3 text-sm leading-relaxed text-foreground">{children}</div>
);

export const PrimaryButton = ({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
  <button
    {...props}
    disabled={props.disabled || loading}
    aria-busy={loading}
    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-bold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
  >
    {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : children}
  </button>
);

export const LinkButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    {...props}
    className={`min-h-[44px] rounded-md px-2 text-sm font-bold text-primary-foreground/90 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:no-underline ${props.className ?? ""}`}
  >
    {children}
  </button>
);
