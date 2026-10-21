import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, ChevronLeft, ChevronRight, ClipboardList, HelpCircle } from 'lucide-react';
import { QUESTIONS, QUESTION_ORDER, TEAMS, TOOLS, TOOL_ORDER, type QuestionId, type ToolId } from '../data/case';
import { toolValue } from '../engine/statistics';
import type { Answers } from '../engine/model';
import { Histogram, OVERLAY, TEAM_SIDE } from './AnalysisRoom';

const PAGE_LABEL = ['السؤال الأول', 'السؤال التاني'];

/** Deduction notebook (Reference 2). Neutral selection only: no correctness cue before submission. */
export function DeductionNotebook({ answers, order, page, used, locked, onAnswer, onPage, onCharts, onReview, playSound }: {
  answers: Answers; order: Record<QuestionId, string[]>; page: 0 | 1; used: ToolId[]; locked: boolean;
  onAnswer: (q: QuestionId, id: string) => void; onPage: (p: 0 | 1) => void; onCharts: () => void; onReview: () => void;
  playSound?: (s: 'pageFlip' | 'click' | 'penWrite') => void;
}) {
  const qid = QUESTION_ORDER[page];
  const q = QUESTIONS[qid];
  const byId = Object.fromEntries(q.choices.map(c => [c.id, c]));
  const complete = Boolean(answers.center && answers.spread);
  const shownTools = TOOL_ORDER.filter(t => used.includes(t));
  const go = (p: 0 | 1) => { if (p === page) return; playSound?.('pageFlip'); onPage(p); };
  return <div className="rd2-notebook" data-testid="rd-notebook">
    <aside className="rd2-nb-left" aria-label="ملخص المؤشرات">
      <span className="rd2-ribbon rd2-ribbon-lg"><BarChart3 aria-hidden="true" />ملخص المؤشرات</span>
      {TEAM_SIDE.map(team => <section key={team} className={`rd2-nb-team rd2-tint-${team}`}>
        <h4>{TEAMS[team].name}</h4>
        <Histogram team={team} visible={[]} compact animateIn={false} />
        <div className="rd2-nb-stats">{shownTools.length ? shownTools.map(t => <span key={t} style={{ '--ov': OVERLAY[t] } as CSSProperties}><small>{TOOLS[t].title}</small><b dir="ltr">{toolValue(t, team).replace(' نقطة مئوية', '')}</b></span>) : <em>القيم بتظهر هنا للأدوات اللي شغّلتها.</em>}</div>
      </section>)}
    </aside>
    <div className="rd2-rings" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
    <section className="rd2-nb-right">
      <p className="rd2-nb-intro">مش المطلوب تعرف الرقم كام وبس… المطلوب تفهم بيقول إيه.</p>
      <div className="rd2-nb-steps" role="tablist" aria-label="أسئلة الدفتر">{QUESTION_ORDER.map((id, i) => <button key={id} role="tab" aria-selected={page === i} className={`${page === i ? 'is-on' : ''} ${answers[id] ? 'is-done' : ''}`} onClick={() => go(i as 0 | 1)}><b>{i + 1}</b><span>{QUESTIONS[id].title}</span></button>)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={qid} className="rd2-nb-page" initial={{ opacity: 0, rotateY: -14, x: -24 }} animate={{ opacity: 1, rotateY: 0, x: 0 }} exit={{ opacity: 0, rotateY: 14, x: 24 }} transition={{ duration: .32 }}>
          <span className="rd2-nb-chip">{PAGE_LABEL[page]}</span>
          <h3>{q.title}</h3>
          <div className="rd2-nb-question"><HelpCircle aria-hidden="true" /><p>{q.prompt}</p></div>
          <div className="rd2-choices" role="radiogroup" aria-label={q.title}>{order[qid].map(id => { const c = byId[id]; const sel = answers[qid] === id; return <motion.button key={id} type="button" role="radio" aria-checked={sel} data-choice={id} disabled={locked} className={`rd2-choice ${sel ? 'is-selected' : ''}`} whileTap={{ scale: .985 }} animate={sel ? { x: -4 } : { x: 0 }} onClick={() => { playSound?.('penWrite'); onAnswer(qid, id); }}><span className="rd2-radio" aria-hidden="true" /><span>{c.text}</span></motion.button>; })}</div>
        </motion.div>
      </AnimatePresence>
      <footer className="rd2-nb-actions">
        <button className="rd2-btn rd2-btn-paper" onClick={onCharts}><BarChart3 aria-hidden="true" />الرجوع للرسم البياني</button>
        {page === 0
          ? <button className="rd2-btn rd2-btn-gold rd2-btn-lg" onClick={() => go(1)}>التالي<ChevronLeft aria-hidden="true" /></button>
          : <>
            <button className="rd2-btn rd2-btn-paper" onClick={() => go(0)}><ChevronRight aria-hidden="true" />السؤال الأول</button>
            <button className="rd2-btn rd2-btn-gold rd2-btn-lg" disabled={!complete} onClick={() => { playSound?.('click'); onReview(); }}><ClipboardList aria-hidden="true" />مراجعة الاستنتاجات</button>
          </>}
      </footer>
    </section>
  </div>;
}
