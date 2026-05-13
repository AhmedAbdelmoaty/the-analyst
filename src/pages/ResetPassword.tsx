import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      // No recovery token — redirect
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          className="text-center space-y-4 p-6 rounded-xl bg-card/80 backdrop-blur-md border border-border"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <CheckCircle className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-foreground font-bold text-lg">تم تغيير كلمة المرور!</h3>
          <p className="text-muted-foreground text-sm">جاري تحويلك...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm space-y-6"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">إعادة تعيين كلمة المرور</h1>
          <p className="text-muted-foreground text-sm mt-2">اكتب كلمة المرور الجديدة</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-xl bg-card/80 backdrop-blur-md border border-border space-y-4">
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              required
              minLength={6}
              dir="ltr"
              className="w-full pr-10 pl-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              required
              minLength={6}
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
              "تغيير كلمة المرور"
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
