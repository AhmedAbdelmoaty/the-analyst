import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from "lucide-react";
import storeFrontImg from "@/assets/scenes/prism-building-exterior.webp";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signIn, signUp, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        // Let AuthRedirect handle the navigation after profile loads
        navigate("/");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSignupSuccess(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <img src={storeFrontImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/50" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          className="w-full max-w-sm"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">Data Analyst</h1>
            <p className="text-accent font-bold text-sm">محلل البيانات</p>
          </div>

          {signupSuccess ? (
            <motion.div
              className="p-6 rounded-xl bg-card/80 backdrop-blur-md border border-border text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="text-4xl mb-3">📧</div>
              <h3 className="text-foreground font-bold text-lg mb-2">تم التسجيل!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                تم إرسال رابط التأكيد على إيميلك. افتح الإيميل واضغط على الرابط عشان تفعّل حسابك.
              </p>
              <button
                onClick={() => { setSignupSuccess(false); setIsLogin(true); }}
                className="text-primary text-sm font-bold hover:underline"
              >
                الرجوع لتسجيل الدخول
              </button>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              className="p-6 rounded-xl bg-card/80 backdrop-blur-md border border-border space-y-4"
              layout
            >
              {/* Toggle */}
              <div className="flex rounded-lg bg-muted p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  دخول
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    !isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  تسجيل جديد
                </button>
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="البريد الإلكتروني"
                  required
                  dir="ltr"
                  className="w-full pr-10 pl-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  required
                  minLength={6}
                  dir="ltr"
                  className="w-full pr-10 pl-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 p-2 rounded-lg"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Forgot password link */}
              {isLogin && (
                <Link to="/forgot-password" className="text-primary text-xs hover:underline block text-left">
                  نسيت كلمة المرور؟
                </Link>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : isLogin ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    دخول
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    تسجيل
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
