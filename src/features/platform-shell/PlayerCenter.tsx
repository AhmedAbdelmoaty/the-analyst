import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings2, ChevronDown, LogOut, ArrowLeft, Check } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstall } from '@/contexts/InstallContext';
import type { GameAccessSnapshot } from '@/features/entitlement/useGameAccess';
import WorkProfileFields from '@/features/profile/WorkProfileFields';
import { validateWorkProfile, type WorkProfile } from '@/features/profile/workProfile';
import analystImg from '@/assets/characters/analyst.webp';
import saraImg from '@/assets/characters/sara.webp';
import AudioControls from '@/features/platform-audio/AudioControls';
import { platformAudio } from '@/features/platform-audio/mixer';

export function ProfileEditor({ onSaved }: { onSaved: () => void }) {
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

export default function PlayerCenter(_props: { snapshot: GameAccessSnapshot | null }) {
  const { profile, signOut } = useAuth();
  const { available, standalone, install, guidance } = useInstall();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return <Dialog.Root open={open} onOpenChange={value => { setOpen(value); if (value) platformAudio.play('panel'); }}>
    <Dialog.Trigger asChild><button className="player-trigger" aria-label="الإعدادات"><Settings2 className="h-5 w-5" /><span>{profile?.first_name}<small>الإعدادات</small></span><ChevronDown className="h-4 w-4" /></button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="player-overlay" /><Dialog.Content dir="rtl" className="platform player-center"><Dialog.Close className="platform-icon player-close" aria-label="إغلاق الإعدادات"><X /></Dialog.Close>
      <div className="!text-right"><Dialog.Title data-player-title className="flex items-center gap-2 !text-xl"><Settings2 className="h-5 w-5" />الإعدادات</Dialog.Title><Dialog.Description className="sr-only">إعدادات الصوت وتسجيل الخروج.</Dialog.Description></div>
      <section className="player-section" data-audio-settings><h3>الصوت والعرض</h3><AudioControls /></section>
      {!standalone && (available || guidance) && <section className="player-section"><h3>تثبيت التطبيق</h3>{available ? <button className="platform-button mt-3 w-full" onClick={() => void install()}>تثبيت التطبيق</button> : <p className="platform-muted">{guidance}</p>}</section>}
      <Link className="platform-button w-full" to="/">عن The Analyst<ArrowLeft /></Link>
      <button className="platform-button w-full" onClick={async () => { await signOut(); navigate('/'); }}><LogOut />تسجيل الخروج</button>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
