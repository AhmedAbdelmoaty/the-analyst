import { House, Pause, Settings } from 'lucide-react';

/** Shared platform actions; each game supplies lifecycle actions that it actually supports. */
export interface GameLifecycleControls {
  canPause: boolean;
  pause?: () => void;
  resume?: () => void;
  canRestart: boolean;
  restart?: () => void;
  saveBeforeExit: () => void;
  getProgressStatus: () => 'new' | 'resumable' | 'complete' | 'unavailable';
}

export function PlatformGameControls({ onHome, onPause, onSettings, canPause, canSettings = true }: { onHome: () => void; onPause?: () => void; onSettings?: () => void; canPause: boolean; canSettings?: boolean }) {
  const button = 'grid size-11 place-items-center rounded-lg border border-game-line bg-game-paper/95 text-game-ink shadow-md backdrop-blur-sm hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
  return <nav aria-label="التحكم في اللعبة" className="fixed z-50 flex gap-2" style={{ top: 'max(12px, env(safe-area-inset-top))', left: 'max(12px, env(safe-area-inset-left))' }} dir="rtl">
    <button type="button" className={button} onClick={onHome} aria-label="العودة إلى الألعاب" title="العودة إلى الألعاب"><House size={20} /></button>
    {canPause && onPause && <button type="button" className={button} onClick={onPause} aria-label="إيقاف مؤقت" title="إيقاف مؤقت"><Pause size={20} /></button>}
    {canSettings && onSettings && <button type="button" className={button} onClick={onSettings} aria-label="إعدادات اللعبة" title="إعدادات اللعبة"><Settings size={20} /></button>}
  </nav>;
}
