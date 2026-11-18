import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, Sparkles, X } from 'lucide-react';
import { StarRating } from './GameFeedback';
import type { GameId } from '@/features/discovery/catalog';

interface PostGameRatingProps {
  gameId: GameId;
  children: ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
}

/** A deliberate post-results step: never covers gameplay or appears before the player asks to finish. */
export function PostGameRating({ gameId, children, triggerClassName = 'gf-endflow-trigger', triggerLabel = 'إنهاء الجولة' }: PostGameRatingProps) {
  const [open, setOpen] = useState(false);
  const [rated, setRated] = useState(false);
  const [complete, setComplete] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openRating = () => {
    setRated(false);
    setComplete(false);
    setOpen(true);
  };

  return <>
    <button type="button" className={triggerClassName} onClick={openRating}>
      <Sparkles aria-hidden="true" />
      {triggerLabel}
      <ChevronLeft aria-hidden="true" />
    </button>
    {open && createPortal(
      <div className="gf-endflow" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="gf-endflow-title">
        <div className="gf-endflow-orb gf-endflow-orb-one" aria-hidden="true" />
        <div className="gf-endflow-orb gf-endflow-orb-two" aria-hidden="true" />
        <section className={`gf-endflow-card ${complete ? 'is-complete' : ''}`}>
          <button ref={closeButton} type="button" className="gf-endflow-close" onClick={() => setOpen(false)} aria-label="العودة إلى النتيجة"><X /></button>
          {!complete ? <>
            <div className="gf-endflow-badge"><Sparkles aria-hidden="true" /> الجولة اكتملت</div>
            <h2 id="gf-endflow-title">رأيك آخر خطوة</h2>
            <p className="gf-endflow-lead">قيّم التجربة براحتك، أو تخطَّ الخطوة وكمل.</p>
            <StarRating gameId={gameId} onRated={() => setRated(true)} />
            <div className="gf-endflow-step-actions">
              <button type="button" className="gf-endflow-primary" disabled={!rated} onClick={() => setComplete(true)}>{rated ? 'متابعة' : 'اختار تقييمك'}<ChevronLeft aria-hidden="true" /></button>
              <button type="button" className="gf-endflow-skip" onClick={() => setComplete(true)}>تخطي الآن</button>
            </div>
          </> : <>
            <div className="gf-endflow-check" aria-hidden="true"><Check /></div>
            <span className="gf-endflow-kicker">{rated ? 'شكرًا — تقييمك وصل' : 'تمام، نكمل الجولة'}</span>
            <h2 id="gf-endflow-title">تحب تعمل إيه دلوقتي؟</h2>
            <p className="gf-endflow-lead">اختار ترجع للتجربة أو تستكشف لعبة تانية.</p>
            <div className="gf-endflow-destinations">{children}</div>
          </>}
          <div className="gf-endflow-progress" aria-label={complete ? 'الخطوة الثانية من اثنتين' : 'الخطوة الأولى من اثنتين'}><i className="is-active" /><i className={complete ? 'is-active' : ''} /></div>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
