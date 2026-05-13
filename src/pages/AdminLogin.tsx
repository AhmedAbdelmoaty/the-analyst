import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const { signIn, signUp, session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session && isAdmin) {
      navigate("/admin/board-9k2x", { replace: true });
    }
  }, [session, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === "signup") {
      setError("تم إنشاء الحساب. لازم admin يضيفلك صلاحية بعد كده.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm space-y-5"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-2" />
          <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground text-sm">دخول خاص بالأدمن فقط</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {error && (
            <p className="text-destructive text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "إنشاء حساب جديد" : "عندي حساب بالفعل"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
