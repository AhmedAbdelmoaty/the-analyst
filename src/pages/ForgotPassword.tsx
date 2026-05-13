import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm space-y-6"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">نسيت كلمة المرور</h1>
          <p className="text-muted-foreground text-sm mt-2">أدخل بريدك الإلكتروني وهنبعتلك رابط إعادة تعيين</p>
        </div>

        {sent ? (
          <motion.div
            className="p-6 rounded-xl bg-card/80 backdrop-blur-md border border-border text-center space-y-3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <CheckCircle className="w-12 h-12 text-primary mx-auto" />
            <h3 className="text-foreground font-bold text-lg">تم الإرسال!</h3>
            <p className="text-muted-foreground text-sm">افحص بريدك الإلكتروني واضغط على الرابط عشان تعيد تعيين كلمة المرور.</p>
            <Link to="/auth" className="text-primary text-sm font-bold hover:underline block mt-4">
              الرجوع لتسجيل الدخول
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 rounded-xl bg-card/80 backdrop-blur-md border border-border space-y-4">
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

            {error && (
              <p className="text-destructive text-xs bg-destructive/10 p-2 rounded-lg">{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  إرسال رابط إعادة التعيين
                </>
              )}
            </motion.button>

            <Link to="/auth" className="text-muted-foreground text-xs hover:text-foreground block text-center">
              الرجوع لتسجيل الدخول
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
