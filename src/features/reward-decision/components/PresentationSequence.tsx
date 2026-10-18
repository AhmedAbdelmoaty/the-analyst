import { useEffect, useRef } from 'react';
import { ARGUMENTS, DOCUMENTS, TEAMS } from '../data/case';
import type { FinalReport } from '../engine/model';
import { ActionButton } from './Ui';

/** Boardroom reference timings; visual only, after the controller has saved submission. */
export function PresentationSequence({ report, paused, onComplete, playSound }: { report: FinalReport; paused: boolean; onComplete: () => void; playSound?: (type: 'stamp' | 'reveal') => void }) {
  const remaining = useRef(2100);
  const stamped = useRef(false);
  const done = useRef(false);
  useEffect(() => {
    if (paused || done.current) return;
    const start = performance.now();
    const finish = window.setTimeout(() => { done.current = true; onComplete(); }, remaining.current);
    const stamp = stamped.current ? undefined : window.setTimeout(() => { stamped.current = true; playSound?.('stamp'); }, Math.max(0, remaining.current - 550));
    return () => { remaining.current = Math.max(0, remaining.current - (performance.now() - start)); clearTimeout(finish); clearTimeout(stamp); };
  }, [paused, onComplete, playSound]);
  return <div className={`rd-presentation-sequence ${paused ? 'rd-paused' : ''}`} role="dialog" aria-modal="true" aria-label="تقديم التوصية">
    <ActionButton variant="secondary" disabled={paused} onClick={onComplete}>تخطي العرض</ActionButton>
    <div className="rd-presentation-table">
      <div className="rd-presentation-team-card"><small>التوصية النهائية</small><strong>{TEAMS[report.teamId].name}</strong></div>
      <div className="rd-presentation-stack rd-presentation-stack-docs"><article><span>المستند المرجعي</span><strong>{DOCUMENTS[report.documentId].title}</strong></article></div>
      <div className="rd-presentation-stack rd-presentation-stack-insights">{report.arguments.map((id, index) => <article key={index}><span>الحجة {index + 1}</span><strong>{ARGUMENTS[id].text}</strong></article>)}</div>
      <div className="rd-presentation-stamp">تم تقديم التوصية</div>
    </div>
  </div>;
}