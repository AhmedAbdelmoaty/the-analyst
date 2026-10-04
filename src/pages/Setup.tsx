import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";
import { AuthShell, ErrorBox, Field, LinkButton, PrimaryButton, TextInput } from "@/components/auth/AuthUI";

const Setup = () => {
  const { user, profile, loading: authLoading, updateProfile, isProfileComplete, signOut } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setFirstName((v) => v || profile.first_name || "");
      setLastName((v) => v || profile.last_name || "");
    }
  }, [profile]);

  useEffect(() => {
    if (isProfileComplete) navigate("/", { replace: true });
  }, [isProfileComplete, navigate]);

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace />;
  if (isProfileComplete) return null;

  const needsName = !profile?.first_name || !profile?.last_name;

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !gender || loading) return;
    setLoading(true); setError(null);
    const { error } = await updateProfile({
      first_name: firstName.trim().slice(0, 50),
      last_name: lastName.trim().slice(0, 50),
      gender,
      avatar_choice: gender === "male" ? "analyst" : "sara",
    });
    setLoading(false);
    if (error) setError("ماقدرناش نحفظ اختيارك. جرّب تاني.");
  };

  const characters = [
    { id: "male" as const, label: "محلل", image: analystImg },
    { id: "female" as const, label: "محللة", image: saraImg },
  ];

  return (
    <AuthShell title={profile?.first_name ? `أهلاً ${profile.first_name}` : "عرّفنا بنفسك"} subtitle="اختار شخصيتك قبل ما نبدأ المهمة">
      <div className="space-y-5">
        {needsName && (
          <div className="grid grid-cols-2 gap-3">
            <Field id="first" label="الاسم الأول">
              <TextInput id="first" dir="auto" maxLength={50} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field id="last" label="الاسم الأخير">
              <TextInput id="last" dir="auto" maxLength={50} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
        )}
        <div role="radiogroup" aria-label="اختار شخصيتك" className="flex justify-center gap-4">
          {characters.map((char) => (
            <motion.button
              key={char.id}
              type="button"
              role="radio"
              aria-checked={gender === char.id}
              onClick={() => setGender(char.id)}
              className={`flex flex-1 flex-col items-center rounded-xl border-2 p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                gender === char.id ? "border-primary bg-primary/10 glow-primary" : "border-border bg-card hover:border-muted-foreground"
              }`}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className={`mb-2 h-24 w-24 overflow-hidden rounded-full border-2 ${gender === char.id ? "border-primary" : "border-border"}`}>
                <img src={char.image} alt="" className="h-full w-full object-cover" />
              </div>
              <span className={`text-sm font-bold ${gender === char.id ? "text-primary-foreground" : "text-muted-foreground"}`}>{char.label}</span>
            </motion.button>
          ))}
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryButton type="button" onClick={handleSubmit} loading={loading} disabled={!firstName.trim() || !lastName.trim() || !gender}>
          يلا نبدأ
        </PrimaryButton>
        <div className="text-center">
          <LinkButton className="text-muted-foreground" onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}>تسجيل الخروج</LinkButton>
        </div>
      </div>
    </AuthShell>
  );
};

export default Setup;
