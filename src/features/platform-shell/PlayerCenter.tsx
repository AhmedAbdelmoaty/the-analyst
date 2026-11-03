import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings2, ChevronDown, LogOut, ArrowLeft, Check } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { GameAccessSnapshot } from '@/features/entitlement/useGameAccess';
import WorkProfileFields from '@/features/profile/WorkProfileFields';
import { validateWorkProfile, type WorkProfile } from '@/features/profile/workProfile';
import analystImg from '@/assets/characters/analyst.webp';
import saraImg from '@/assets/characters/sara.webp';
import AudioControls from '@/features/platform-audio/AudioControls';
import { platformAudio } from '@/features/platform-audio/mixer';

function ProfileEditor({ onSaved }: { onSaved: () => void }) {
  const { profile, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender ?? 'male');
  const [work, setWork] = useState<WorkProfile>({ department: profile?.department ?? null, department_other: profile?.department_other ?? null, industry: profile?.industry ?? null, industry_other: profile?.industry_other ?? null });
  const [errors, setErrors] = useState<Partial<Record<keyof WorkProfile, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="player-editor" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const checked = validateWorkProfile(work); setErrors(checked.errors);
    if (Object.keys(checked.errors).length || !firstName.trim() || !lastName.trim()) return;
    setBusy(true); setError('');
    const result = await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), gender, avatar_choice: gender === 'female' ? 'sara' : 'analyst', ...checked.value });
    setBusy(false); if (result.error) setError('ماقدرناش نحفظ التعديلات. جرّب تاني.'); else { platformAudio.play('success'); onSaved(); }
  }}>
    <div className="grid grid-cols-2 gap-3"><label>الاسم الأول<input className="platform-input" required maxLength={50} value={firstName} onChange={e => setFirstName(e.target.value)} /></label><label>الاسم الأخير<input className="platform-input" required maxLength={50} value={lastName} onChange={e => setLastName(e.target.value)} /></label></div>
    <fieldset><legend className="mb-2 text-sm font-bold">شخصيتك</legend><div className="flex gap-3">{(['male', 'female'] as const).map(value => <label key={value} className="player-avatar-choice"><input type="radio" name="player-avatar" value={value} checked={gender === value} onChange={() => setGender(value)} /><img src={value === 'female' ? saraImg : analystImg} alt="" />{value === 'female' ? 'محللة' : 'محلل'}</label>)}</div></fieldset>
    <WorkProfileFields localized value={work} onChange={setWork} errors={errors} />
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    <button className="platform-button primary" disabled={busy}>{busy ? 'جاري الحفظ...' : 'حفظ التعديلات'}<Check /></button>
  </form>;
}

export default function PlayerCenter({ snapshot }: { snapshot: GameAccessSnapshot | null }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatar = profile?.avatar_choice === 'sara' || profile?.gender === 'female' ? saraImg : analystImg;
  const subscription = snapshot?.entitled === true ? 'الوصول السنوي متاح حسب التحقق الحالي' : snapshot?.entitled === false ? 'لا يوجد وصول سنوي فعّال حسب التحقق الحالي' : 'حالة الاشتراك تحتاج التحقق';
  return <Dialog.Root open={open} onOpenChange={value => { setOpen(value); if (value) platformAudio.play('panel'); if (!value) { setEditing(false); setSaved(false); } }}>
    <Dialog.Trigger asChild><button className="player-trigger" aria-label={`مركز اللاعب: ${profile?.first_name ?? ''}`}><img src={avatar} alt="" /><span>{profile?.first_name}<small>مركز اللاعب</small></span><ChevronDown className="h-4 w-4" /></button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="player-overlay" /><Dialog.Content dir="rtl" className="platform player-center"><Dialog.Close className="platform-icon player-close" aria-label="إغلاق مركز اللاعب"><X /></Dialog.Close>
      <div className="!text-right"><Dialog.Title data-player-title className="flex items-center gap-2 !text-xl"><Settings2 className="h-5 w-5" />مركز اللاعب</Dialog.Title><Dialog.Description data-player-description>هويتك، اشتراكك، وإعدادات تجربتك في مكان واحد.</Dialog.Description></div>
      <div className="player-identity"><img src={avatar} alt="شخصيتك الحالية" /><div><h2>{profile?.first_name} {profile?.last_name}</h2><p className="platform-muted">جاهز للحكاية الجاية؟</p></div></div>
      {saved && <p role="status" className="platform-note">✓ تعديلاتك اتحفظت.</p>}
      {editing ? <ProfileEditor onSaved={() => { setEditing(false); setSaved(true); }} /> : <button className="platform-button w-full" onClick={() => { setEditing(true); setSaved(false); }}>تعديل بياناتي<ArrowLeft /></button>}
      <section className="player-section"><h3>اشتراكي</h3><p className="platform-muted">{subscription}</p>{snapshot?.enforcement === false && <p className="platform-muted">كل الألعاب متاحة حاليًا أثناء التطوير.</p>}<Link className="platform-button mt-3 w-full" to="/subscription">تفاصيل الاشتراك<ArrowLeft /></Link></section>
      <section className="player-section" data-audio-settings><h3>الصوت والعرض</h3><AudioControls /></section>
      <button className="platform-button w-full" onClick={async () => { await signOut(); navigate('/'); }}><LogOut />تسجيل الخروج</button>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
