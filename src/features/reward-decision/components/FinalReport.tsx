import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Calendar, FileText, Send, Sigma, User } from 'lucide-react';
import { DOCUMENTS, QUESTIONS, QUESTION_ORDER, type DocumentId, type QuestionId } from '../data/case';
import { REQUIRED_DOCS, type Answers } from '../engine/model';

export const reportNumber = (runId: string) => `TR-${runId.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date()).replace(/-/g, '/');
const HEAD: Record<QuestionId, { title: string; Icon: typeof Sigma }> = { center: { title: 'الاستنتاج الأول — المركز', Icon: BarChart3 }, spread: { title: 'الاستنتاج التاني — التشتت', Icon: Sigma } };

/** Final report (Reference 3) — no team or score before submission. Sending is presentation after the frozen commit. */
export function FinalReport({ runId, answers, docs, sending, onReview, onSubmit, onSent, playSound }: {
  runId: string; answers: Answers; docs: DocumentId[]; sending: boolean;
  onReview: () => void; onSubmit: () => void; onSent: () => void; playSound?: (s: 'stamp' | 'whoosh' | 'click' | 'collect') => void;
}) {
  const missingDocs = REQUIRED_DOCS.filter(d => !docs.includes(d));
  const ready = !missingDocs.length && Boolean(answers.center && answers.spread);
  const [step, setStep] = useState<'idle' | 'stamp' | 'fold' | 'done'>(sending ? 'stamp' : 'idle');
  const date = useRef(today());
  useEffect(() => {
    if (!sending) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    playSound?.('stamp');
    const t1 = window.setTimeout(() => { setStep('fold'); playSound?.('whoosh'); }, reduce ? 150 : 700);
    const t2 = window.setTimeout(() => { setStep('done'); playSound?.('collect'); }, reduce ? 300 : 1500);
    const t3 = window.setTimeout(onSent, reduce ? 1400 : 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [sending]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="rd2-report-wrap" data-testid="rd-final-report">
    <AnimatePresence>
      {step !== 'done' && <motion.article className="rd2-report" initial={{ opacity: 0, y: 30, rotate: -1 }} animate={step === 'fold' ? { opacity: 0, y: 160, scale: .35, rotateX: 60 } : { opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: step === 'fold' ? .7 : .4 }}>
        <div className="rd2-report-stack" aria-hidden="true" />
        <header className="rd2-report-head">
          <div className="rd2-report-title"><FileText aria-hidden="true" /><div><h3>تقرير المراجعة والتحليل</h3><p><b>إلى:</b> شريف — الرئيس التنفيذي</p><p><b>الموضوع:</b> المراجعة النهائية لترشيح التكريم</p></div></div>
          <dl className="rd2-report-meta"><div><dt><FileText aria-hidden="true" />رقم التقرير</dt><dd dir="ltr">{reportNumber(runId)}</dd></div><div><dt><Calendar aria-hidden="true" />التاريخ</dt><dd dir="ltr">{date.current}</dd></div><div><dt><User aria-hidden="true" />المحلل</dt><dd>أنت</dd></div></dl>
        </header>
        <p className="rd2-report-instr">دي الملاحظات اللي سجلتها من تحليل بيانات الفريقين. راجعها قبل ما تبعت التقرير النهائي.</p>
        <div className="rd2-report-body">{QUESTION_ORDER.map((q, i) => { const H = HEAD[q]; const text = QUESTIONS[q].choices.find(c => c.id === answers[q])?.text; return <motion.section key={q} className={`rd2-conclusion rd2-conclusion-${i}`} initial={{ opacity: 0, x: i ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15 + i * .12 }}><header><span><H.Icon aria-hidden="true" /></span><h4>{H.title}</h4></header><p>{text ?? 'لسه ما اتسجلش استنتاج هنا.'}</p></motion.section>; })}</div>
        {missingDocs.length > 0 && <p className="rd2-report-missing">لسه ناقص في ملف القضية: {missingDocs.map(d => DOCUMENTS[d].title).join('، ')}.</p>}
        <footer className="rd2-report-sign"><span className="rd2-signature">المحلل</span><AnimatePresence>{step !== 'idle' && <motion.span className="rd2-stamp" initial={{ scale: 2.4, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>تم الإرسال</motion.span>}</AnimatePresence></footer>
        <div className="rd2-report-actions">
          <button className="rd2-btn rd2-btn-paper" disabled={sending} onClick={onReview}><FileText aria-hidden="true" />مراجعة الاستنتاجات</button>
          <motion.button className="rd2-btn rd2-btn-gold rd2-btn-lg" disabled={!ready || sending} whileTap={{ scale: .95 }} onClick={() => { playSound?.('click'); onSubmit(); }}><Send aria-hidden="true" />إرسال التقرير النهائي</motion.button>
        </div>
      </motion.article>}
    </AnimatePresence>
    {step === 'fold' && <motion.div className="rd2-folder" aria-hidden="true" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} />}
    {step === 'done' && <motion.div className="rd2-sent" role="status" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}><Send aria-hidden="true" /><b>تقريرك وصل لشريف.</b></motion.div>}
  </div>;
}
