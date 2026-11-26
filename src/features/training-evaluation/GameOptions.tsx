import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Home, Pause, Play, RotateCcw, Settings } from "lucide-react";
import { GameButton } from "./GameButton";
import "./options.css";

export function SettingsButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return <GameButton className={`te-settings ${className}`} aria-label="إعدادات اللعبة" title="إعدادات اللعبة" onClick={onClick}><Settings aria-hidden /></GameButton>;
}

export function GameOptions({ open, title = "إعدادات اللعبة", onResume, onHome, onRestart, onPause }: {
  open: boolean; title?: string; onResume: () => void; onHome: () => void; onRestart: () => void; onPause?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!open) setConfirm(false); }, [open]);
  return <Dialog.Root open={open}><Dialog.Portal><Dialog.Overlay className="te-options-overlay" />
    <Dialog.Content className="te-options" dir="rtl" aria-describedby={confirm ? "te-restart-description" : undefined} onEscapeKeyDown={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()}>
      <div className="te-options-symbol">{confirm ? <RotateCcw aria-hidden /> : <Settings aria-hidden />}</div>
      <Dialog.Title>{confirm ? "تبدأ اللعبة من الأول؟" : title}</Dialog.Title>
      {confirm ? <><Dialog.Description id="te-restart-description">تقدم الجولة الحالية هيتحذف، وهترجع لبداية اللعبة.</Dialog.Description>
        <div className="te-options-actions"><GameButton className="primary" onClick={() => { setConfirm(false); onRestart(); }}><RotateCcw />أيوه، ابدأ من الأول</GameButton><GameButton className="secondary" onClick={() => setConfirm(false)}>لا، ارجع للخيارات</GameButton></div>
      </> : <div className="te-options-actions">
        <GameButton className="primary" onClick={onResume}><Play />متابعة اللعب</GameButton>
        {onPause && <GameButton className="secondary" onClick={onPause}><Pause />إيقاف مؤقت</GameButton>}
        <GameButton className="secondary" onClick={onHome}><Home />العودة إلى الألعاب</GameButton>
        <GameButton className="secondary" onClick={() => setConfirm(true)}><RotateCcw />إعادة اللعبة من البداية</GameButton>
      </div>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}