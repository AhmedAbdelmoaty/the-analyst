import { useEffect, useState } from 'react';
import { RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useSound } from '@/hooks/useSoundEffects';

export function PlayerSettingsPanel({ open, onClose, onResetProgress }: { open: boolean; onClose: () => void; onResetProgress: () => void }) {
  const { isSoundEnabled, setIsSoundEnabled } = useSound();
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!open) { setConfirmReset(false); return; }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4" dir="rtl" role="presentation" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-label="إعدادات اللعبة" onMouseDown={e => e.stopPropagation()} className="w-full max-w-sm rounded-xl border border-game-line bg-game-paper p-5 text-game-ink shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">إعدادات اللعبة</h2><button type="button" autoFocus aria-label="إغلاق الإعدادات" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><X /></button></div>
      <button type="button" aria-pressed={isSoundEnabled} onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="mb-3 flex min-h-11 w-full items-center gap-3 rounded-lg border border-game-line p-3 text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{isSoundEnabled ? <Volume2 /> : <VolumeX />} المؤثرات الصوتية: {isSoundEnabled ? 'مفعّلة' : 'متوقفة'}</button>
      <button type="button" onClick={() => { if (!confirmReset) { setConfirmReset(true); return; } onResetProgress(); onClose(); setConfirmReset(false); }} className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-game-line p-3 text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><RotateCcw />{confirmReset ? 'تأكيد بدء جولة جديدة وفقدان تقدم الجولة الحالية' : 'إعادة اللعبة من البداية'}</button>
    </section>
  </div>;
}
