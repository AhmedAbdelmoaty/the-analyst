import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, MailCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable";
import analystLockup from "@/assets/brand/the-analyst-lockup.png";

const translate = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "الإيميل أو كلمة السر غلط";
  if (m.includes("already registered")) return "الإيميل ده عامل حساب قبل كده — جرّب تدخل";
  if (m.includes("not confirmed")) return "لازم تأكد إيميلك الأول من اللينك اللي وصلك";
  if (m.includes("password")) return "كلمة السر لازم تكون 6 حروف على الأقل";
  if (m.includes("rate limit")) return "محاولات كتير — استنى شوية وجرّب تاني";
  return msg;
};

const inputCls =
  "w-full pr-10 pl-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = isLogin ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    if (error) setError(translate(error.message));
    else if (!isLogin) setSent(true);
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setError("حصلت مشكلة في الدخول بجوجل، جرّب تاني");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8" dir="rtl">
      <motion.div className="w-full max-w-sm space-y-6" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex flex-col items-center gap-2">
          <img src={analystLockup} alt="The Analyst" className="h-16 w-auto" />
          <p className="text-muted-foreground text-sm">سجّل دخولك عشان تبدأ المهمة</p>
        </div>

        {sent ? (
          <div className="p-6 rounded-xl bg-card border border-border text-center space-y-3">
            <MailCheck className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-foreground font-bold text-lg">افتح إيميلك</h2>
            <p className="text-muted-foreground text-sm">
              بعتنالك لينك تأكيد على <span dir="ltr" className="text-foreground">{email}</span>. دوس عليه وهتدخل اللعبة على طول.
            </p>
            <button onClick={() => { setSent(false); setIsLogin(true); }} className="text-primary text-sm font-bold">
              رجوع لتسجيل الدخول
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-card border border-border space-y-4">
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-foreground text-background font-bold text-sm hover:opacity-90 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              كمّل بحساب Google
            </button>

            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <div className="flex-1 h-px bg-border" /> أو بالإيميل <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="الإيميل" className={inputCls} />
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" required minLength={6} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isLogin ? "كلمة السر" : "اختار كلمة سر للعبة (6 حروف على الأقل)"} className={inputCls} />
              </div>
              {!isLogin && <p className="text-muted-foreground text-xs">كلمة السر دي خاصة باللعبة بس — متكتبش باسورد إيميلك.</p>}

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
                {loading ? "لحظة..." : isLogin ? "دخول" : "اعمل حساب"}
              </button>
            </form>

            {isLogin && (
              <Link to="/forgot-password" className="block text-center text-muted-foreground text-xs hover:text-foreground">
                نسيت كلمة السر؟
              </Link>
            )}
            <button onClick={() => { setIsLogin(!isLogin); setError(""); }} className="w-full text-center text-primary text-sm font-bold">
              {isLogin ? "معندكش حساب؟ اعمل حساب جديد" : "عندك حساب؟ سجّل دخول"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
