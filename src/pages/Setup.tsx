import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";
import { AuthShell, ErrorBox, Field, LinkButton, PrimaryButton, TextInput } from "@/components/auth/AuthUI";
import { destinationForPlan, takePlanIntent } from "@/features/subscription/planIntent";
import { journeyDestination } from "@/features/discovery/journey";
import WorkProfileFields from "@/features/profile/WorkProfileFields";
import { hasWorkProfile, isWorkProfileSchemaUnavailable, validateWorkProfile, type WorkProfile } from "@/features/profile/workProfile";

const Setup = () => {
  const { user, profile, loading: authLoading, updateProfile, isProfileComplete, signOut } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [work, setWork] = useState<WorkProfile>({ department: null, department_other: null, industry: null, industry_other: null });
  const [workErrors, setWorkErrors] = useState<Partial<Record<keyof WorkProfile, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setFirstName((v) => v || profile.first_name || "");
      setLastName((v) => v || profile.last_name || "");
      setGender((v) => v || profile.gender || null);
      setWork((v) => ({ department: v.department || profile.department || null, department_other: v.department_other || profile.department_other || null, industry: v.industry || profile.industry || null, industry_other: v.industry_other || profile.industry_other || null }));
    }
  }, [profile]);

  useEffect(() => {
    if (isProfileComplete && hasWorkProfile(profile)) navigate(journeyDestination(true, destinationForPlan(takePlanIntent(), true)), { replace: true });
  }, [isProfileComplete, profile, navigate]);

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;
  if (isProfileComplete && hasWorkProfile(profile)) return null;

  const needsName = !profile?.first_name || !profile?.last_name;

  const handleSubmit = async () => {
    if (loading || (!isProfileComplete && (!firstName.trim() || !lastName.trim() || !gender))) return;
    const checked = validateWorkProfile(work);
    setWorkErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    setLoading(true); setError(null);
    const identity = isProfileComplete ? {} : {
      first_name: firstName.trim().slice(0, 50), last_name: lastName.trim().slice(0, 50), gender, avatar_choice: gender === "male" ? "analyst" : "sara",
    };
    const { error } = await updateProfile({ ...identity, ...checked.value });
    if (error && isWorkProfileSchemaUnavailable(error) && !isProfileComplete) {
      // The additive work columns may not be deployed yet. Do not trap a returning
      // player in setup: save only the existing identity fields and invite later.
      const fallback = await updateProfile(identity);
      setLoading(false);
      if (!fallback.error) {
        navigate(journeyDestination(true, destinationForPlan(takePlanIntent(), true)), { replace: true });
        return;
      }
      setError("ماقدرناش نحفظ اختيارك. جرّب تاني.");
      return;
    }
    setLoading(false);
    if (error) setError(isWorkProfileSchemaUnavailable(error)
      ? "حفظ بيانات القسم والقطاع غير مفعّل حاليًا. استخدم «تخطي الآن» للدخول للألعاب."
      : "ماقدرناش نحفظ اختيارك. جرّب تاني.");
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
        <WorkProfileFields value={work} onChange={setWork} errors={workErrors} />
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryButton type="button" onClick={handleSubmit} loading={loading} disabled={!isProfileComplete && (!firstName.trim() || !lastName.trim() || !gender)}>
          يلا نبدأ
        </PrimaryButton>
        {isProfileComplete && <LinkButton className="w-full text-muted-foreground" onClick={() => navigate(journeyDestination(true), { replace: true })}>تخطي الآن</LinkButton>}
        <div className="text-center">
          <LinkButton className="text-muted-foreground" onClick={async () => { await signOut(); navigate("/", { replace: true }); }}>تسجيل الخروج</LinkButton>
        </div>
      </div>
    </AuthShell>
  );
};

export default Setup;
