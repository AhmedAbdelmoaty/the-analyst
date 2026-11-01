import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, Zap, Shield, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import analystImg from "@/assets/characters/analyst.webp";
import saraImg from "@/assets/characters/sara.webp";
import { ErrorBox } from "@/components/auth/AuthUI";
import { destinationForPlan, takePlanIntent } from "@/features/subscription/planIntent";
import { journeyDestination } from "@/features/discovery/journey";
import WorkProfileFields from "@/features/profile/WorkProfileFields";
import { hasWorkProfile, isWorkProfileSchemaUnavailable, validateWorkProfile, type WorkProfile } from "@/features/profile/workProfile";
import { sfx } from "@/features/arena/sfx";
import "@/features/arena/arena.css";

const Setup = () => {
  const { user, profile, loading: authLoading, updateProfile, isProfileComplete, signOut } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [work, setWork] = useState<WorkProfile>({ department: null, department_other: null, industry: null, industry_other: null });
  const [workErrors, setWorkErrors] = useState<Partial<Record<keyof WorkProfile, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(sfx.isMuted());
  const [flash, setFlash] = useState(0);
  const navigate = useNavigate();

  const sparks = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 37) % 100}%`, size: 4 + ((i * 7) % 8), dur: 7 + ((i * 5) % 9), delay: -((i * 3) % 10),
  })), []);

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

  if (authLoading) return <div className="arena min-h-screen" />;
  if (!user) return <Navigate to="/" replace />;
  if (isProfileComplete && hasWorkProfile(profile)) return null;

  const needsName = !profile?.first_name || !profile?.last_name;
  const progress = [
    !needsName || (firstName.trim() && lastName.trim()),
    isProfileComplete || gender,
    work.department,
    work.industry,
  ].filter(Boolean).length;

  const pick = (id: "male" | "female") => {
    if (isProfileComplete) return;
    setGender(id);
    setFlash((f) => f + 1);
    sfx.play("lock");
  };

  const handleWork = (next: WorkProfile) => {
    if (next.department !== work.department || next.industry !== work.industry) sfx.play("select");
    setWork(next);
  };

  const handleSubmit = async () => {
    if (loading || (!isProfileComplete && (!firstName.trim() || !lastName.trim() || !gender))) return;
    const checked = validateWorkProfile(work);
    setWorkErrors(checked.errors);
    if (Object.keys(checked.errors).length) { sfx.play("error"); return; }
    sfx.play("launch");
    setLoading(true); setError(null);
    const identity = isProfileComplete ? {} : {
      first_name: firstName.trim().slice(0, 50), last_name: lastName.trim().slice(0, 50), gender, avatar_choice: gender === "male" ? "analyst" : "sara",
    };
    const { error } = await updateProfile({ ...identity, ...checked.value });
    if (error && isWorkProfileSchemaUnavailable(error) && !isProfileComplete) {
      // Work columns may not be deployed yet: save identity only so players are never trapped here.
      const fallback = await updateProfile(identity);
      setLoading(false);
      if (!fallback.error) {
        navigate(journeyDestination(true, destinationForPlan(takePlanIntent(), true)), { replace: true });
        return;
      }
      sfx.play("error");
      setError("ماقدرناش نحفظ اختيارك. جرّب تاني.");
      return;
    }
    setLoading(false);
    if (error) {
      sfx.play("error");
      setError(isWorkProfileSchemaUnavailable(error)
        ? "حفظ بيانات القسم والقطاع غير مفعّل حاليًا. استخدم «تخطي الآن» للدخول للألعاب."
        : "ماقدرناش نحفظ اختيارك. جرّب تاني.");
    }
  };

  const characters = [
    { id: "male" as const, label: "محلل", tag: "تكتيكي", image: analystImg, stats: [["تركيز", 90], ["سرعة", 75], ["دقة", 85]] as const },
    { id: "female" as const, label: "محللة", tag: "استراتيجية", image: saraImg, stats: [["تركيز", 85], ["سرعة", 80], ["دقة", 90]] as const },
  ];
  const canStart = isProfileComplete || (firstName.trim() && lastName.trim() && gender);

  return (
    <div dir="rtl" className="arena relative min-h-screen overflow-hidden px-4 py-6">
      <div className="arena-grid pointer-events-none absolute inset-0" />
      {sparks.map((s, i) => (
        <span key={i} className="arena-spark" style={{ left: s.left, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
      ))}
      <AnimatePresence>
        {flash > 0 && (
          <motion.div key={flash} className="pointer-events-none fixed inset-0 z-50" style={{ background: "hsl(var(--arena-gold))" }}
            initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} />
        )}
      </AnimatePresence>

      <button type="button" aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
        onClick={() => { const v = !muted; sfx.setMuted(v); setMuted(v); if (!v) sfx.play("select"); }}
        className="arena-chip absolute left-4 top-4 z-10 !p-2">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="relative mx-auto max-w-xl">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="mb-5 text-center">
          <span className="arena-chip mb-2"><Zap className="h-3.5 w-3.5" /> المرحلة ١ · جهّز بطلك</span>
          <h1 className="arena-title arena-flame-text text-5xl leading-tight sm:text-6xl">
            {profile?.first_name ? `يلا يا ${profile.first_name}!` : "اختار بطلك"}
          </h1>
          <div className="mx-auto mt-3 flex max-w-xs items-center gap-2">
            <Star className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--arena-gold))", fill: "hsl(var(--arena-gold))" }} />
            <div className="arena-xp flex-1"><span style={{ width: `${(progress / 4) * 100}%` }} /></div>
            <span className="arena-title text-lg text-primary-foreground" style={{ textShadow: "0 2px 0 hsl(var(--arena-ink))" }}>{progress}/4</span>
          </div>
        </motion.div>

        <div className="arena-panel space-y-5 rounded-3xl p-5">
          {needsName && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-sm font-bold">الاسم الأول</span>
                <input className="arena-input" dir="auto" maxLength={50} value={firstName} onFocus={() => sfx.play("tick")} onChange={(e) => setFirstName(e.target.value)} /></label>
              <label className="block"><span className="mb-1 block text-sm font-bold">الاسم الأخير</span>
                <input className="arena-input" dir="auto" maxLength={50} value={lastName} onFocus={() => sfx.play("tick")} onChange={(e) => setLastName(e.target.value)} /></label>
            </div>
          )}

          <div role="radiogroup" aria-label="اختار شخصيتك" className="grid grid-cols-2 gap-4">
            {characters.map((char, idx) => {
              const on = gender === char.id;
              return (
                <motion.button key={char.id} type="button" role="radio" aria-checked={on} disabled={isProfileComplete && !on}
                  onMouseEnter={() => sfx.play("hover")} onClick={() => pick(char.id)}
                  initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1, scale: on ? 1.04 : 1 }}
                  transition={{ delay: 0.1 + idx * 0.1, type: "spring", bounce: 0.5 }} whileTap={{ scale: 0.95 }}
                  className="arena-hero p-3 text-right focus:outline-none focus-visible:ring-4 focus-visible:ring-ring">
                  <span className="arena-chip absolute right-2 top-2 z-10 !text-[0.65rem]"><Shield className="h-3 w-3" />{char.tag}</span>
                  <div className="relative mx-auto mt-5 aspect-square w-full max-w-[9rem] overflow-hidden rounded-2xl border-[3px]" style={{ borderColor: "hsl(var(--arena-ink))", background: "hsl(var(--arena-card))" }}>
                    <img src={char.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="arena-title mt-2 text-center text-2xl">{char.label}</div>
                  <div className="mt-1 space-y-1">
                    {char.stats.map(([name, v]) => (
                      <div key={name} className="flex items-center gap-2 text-[0.7rem] font-bold">
                        <span className="w-9">{name}</span>
                        <div className="arena-xp !h-2 flex-1"><span style={{ width: `${v}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  {on && <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="arena-title mt-2 text-center text-lg text-primary-foreground" style={{ textShadow: "0 2px 0 hsl(var(--arena-ink))" }}>✔ جاهز!</motion.div>}
                </motion.button>
              );
            })}
          </div>

          <WorkProfileFields value={work} onChange={handleWork} errors={workErrors} />
          {error && <ErrorBox>{error}</ErrorBox>}

          <motion.button type="button" onClick={handleSubmit} onMouseEnter={() => canStart && sfx.play("hover")} disabled={!canStart || loading}
            whileHover={canStart ? { scale: 1.03 } : undefined} className="arena-btn w-full py-3 text-3xl">
            {loading ? "جاري التحميل..." : "▶ يلا نبدأ"}
          </motion.button>

          <div className="flex items-center justify-center gap-5 text-sm font-bold">
            {isProfileComplete && <button type="button" className="underline" onClick={() => navigate(journeyDestination(true), { replace: true })}>تخطي الآن</button>}
            <button type="button" className="opacity-70 hover:opacity-100" onClick={async () => { await signOut(); navigate("/", { replace: true }); }}>تسجيل الخروج</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
