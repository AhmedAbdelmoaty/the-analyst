import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import analystImg from '@/assets/characters/analyst.webp';
import saraImg from '@/assets/characters/sara.webp';
import { ErrorBox } from '@/components/auth/AuthUI';
import { destinationForPlan, takePlanIntent } from '@/features/subscription/planIntent';
import { journeyDestination } from '@/features/discovery/journey';
import { onboardingFor, finishOnboarding } from '@/features/discovery/onboarding';
import WorkProfileFields from '@/features/profile/WorkProfileFields';
import { isWorkProfileSchemaUnavailable, validateWorkProfile, type WorkProfile } from '@/features/profile/workProfile';
import PlatformHeader from '@/features/platform-shell/PlatformHeader';
import PlayerCenter from '@/features/platform-shell/PlayerCenter';
import { platformAudio } from '@/features/platform-audio/mixer';

const characters = [
  { id: 'male' as const, label: 'محلل', image: analystImg },
  { id: 'female' as const, label: 'محللة', image: saraImg },
];
export default function Setup() {
  const { user, profile, loading: authLoading, updateProfile, isProfileComplete, signOut } = useAuth();
  const navigate = useNavigate();
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [work, setWork] = useState<WorkProfile>({ department: null, department_other: null, industry: null, industry_other: null });
  const [workErrors, setWorkErrors] = useState<Partial<Record<keyof WorkProfile, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkpoint = user ? onboardingFor(user.id) : null;
  useEffect(() => {
    if (!profile) return;
    setGender(v => v || profile.gender || null);
    setWork(v => ({ department: v.department || profile.department || null, department_other: v.department_other || profile.department_other || null, industry: v.industry || profile.industry || null, industry_other: v.industry_other || profile.industry_other || null }));
  }, [profile]);
  // Successful saves navigate below. Returning completed accounts skip character setup.
  useEffect(() => {
    if (!authLoading && user && isProfileComplete && !saving && checkpoint?.stage !== 'plans') {
      navigate(finishOnboarding(user.id) ?? journeyDestination(true, destinationForPlan(takePlanIntent(), true)), { replace: true });
    }
  }, [authLoading, user, isProfileComplete, saving, checkpoint?.stage, navigate]);
  if (authLoading) return <div className="platform grid min-h-screen place-items-center" role="status">جاري التحميل...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (checkpoint?.stage === 'plans') return <Navigate to="/plans" replace />;
  const needsName = !profile?.first_name || !profile?.last_name;
  const canStart = Boolean(profile?.first_name?.trim() && profile?.last_name?.trim() && gender);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !canStart) return;
    const checked = validateWorkProfile(work); setWorkErrors(checked.errors);
    if (Object.keys(checked.errors).length) { platformAudio.play('locked'); return; }
    setSaving(true); setError(null);
    const identity = { gender, avatar_choice: gender === 'male' ? 'analyst' : 'sara' };
    let result = await updateProfile({ ...identity, ...checked.value });
    if (result.error && isWorkProfileSchemaUnavailable(result.error)) result = await updateProfile(identity);
    if (result.error) { setError('ماقدرناش نحفظ اختيارك. بياناتك موجودة هنا؛ جرّب تاني.'); setSaving(false); return; }
    platformAudio.play('success');
    navigate(finishOnboarding(user.id) ?? journeyDestination(true, destinationForPlan(takePlanIntent(), true)), { replace: true });
  };
  return <div className="platform setup-world" dir="rtl"><div className="platform-container">
    <PlatformHeader>{needsName && <PlayerCenter snapshot={null} />}<button className="platform-button" onClick={async () => { await signOut(); navigate('/'); }}>تسجيل الخروج</button></PlatformHeader>
    <main className="setup-stage">
      <div className="platform-heading"><p className="platform-kicker">حكايتك تبدأ بشخصيتك</p><h1>{profile?.first_name ? `يلا يا ${profile.first_name}، اختار شخصيتك` : 'اختار شخصيتك'}</h1><p className="platform-muted">نفس المغامرات، بطريقتك أنت. جهّز هويتك وخلّينا نبدأ.</p></div>
      <div className="setup-grid">
        <div><div role="radiogroup" aria-label="اختار شخصيتك" className="avatar-gallery">
          {characters.map((character, index) => <button key={character.id} type="button" role="radio" aria-label={character.label} aria-checked={gender === character.id} className="avatar-option" onClick={() => { setGender(character.id); platformAudio.unlock(); platformAudio.play('avatar'); }} onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); setGender(characters[1 - index].id); (event.currentTarget.parentElement?.children[1 - index] as HTMLElement)?.focus(); }
          }}><img src={character.image} alt="" /><span className="avatar-caption"><strong>{character.label}</strong><span>{gender === character.id ? '✓ دي شخصيتك' : 'اختار الشخصية'}</span></span></button>)}
        </div><p className="platform-muted mt-4 text-center">الشخصية اختيارك. مهاراتك بتظهر في قراراتك.</p></div>
        <form className="setup-form" onSubmit={submit}>
          <div><h2>خلّينا نتعرّف عليك</h2><p className="platform-muted">القسم وقطاع العمل بيساعدونا نفهم جمهور التجربة.</p></div>
          {needsName ? <p className="platform-note" role="status">بيانات الاسم ناقصة في حسابك. افتح مركز اللاعب بالأعلى لإكمالها، وبعدها اختار شخصيتك.</p> : <p className="flex items-center gap-2 text-sm font-bold"><Check className="h-4 w-4 text-teal-700" />{profile.first_name} {profile.last_name}</p>}
          <WorkProfileFields localized value={work} onChange={setWork} errors={workErrors} />
          {error && <ErrorBox>{error}</ErrorBox>}
          <button type="submit" className="platform-button primary mt-2" disabled={!canStart || saving}>{saving ? 'جاري حفظ اختيارك...' : 'ابدأ مغامرتك'}<ArrowLeft /></button>
          <p className="platform-muted text-center">تقدر تعدّل بياناتك بعدين من مركز اللاعب.</p>
        </form>
      </div>
    </main>
  </div></div>;
}
