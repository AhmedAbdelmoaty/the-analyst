import { useEffect, useMemo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Lightbulb, RotateCcw, Star, Timer, Trophy, BarChart3 } from 'lucide-react';
import { formatClock } from './AnalysisRoom';
import type { Level1Decision } from '../data/case';
import { PostGameRating } from '@/features/feedback/PostGameRating';

export const RESULT_COPY: Record<0 | 1 | 2, { title: string; subtitle: string; feedback: string }> = {
  2: { title: 'مراجعة قوية!', subtitle: 'عرفت تقرأ الأرقام وتربط المؤشرات ببعض قبل ما تبني قرارك.', feedback: 'التحليل الشاطر مش في عدد الأرقام اللي بتطلعها… في إنك تعرف كل رقم بيقولك إيه، وإيه اللي ما يقدرش يثبته.' },
  1: { title: 'كنت قريب… بس لسه في حاجة ناقصة!', subtitle: 'جزء من قراءتك كان سليم، لكن التقرير محتاج ربط أقوى بين المؤشرات.', feedback: 'كل مؤشر بيشرح زاوية مختلفة من البيانات. قبل ما تبني استنتاجك، اتأكد إن المعنى اللي فهمته فعلًا مدعوم بالأرقام.' },
  0: { title: 'الأرقام لخبطتك الجولة دي!', subtitle: 'مش كل رقم كبير معناه قرار أفضل، ومش كل رقم صغير معناه أداء أضعف.', feedback: 'ابدأ بالسؤال: المؤشر ده بيقيس إيه بالضبط؟ وبعدها شوف هل الاستنتاج اللي وصلت له يثبت المطلوب فعلًا.' },
};

export const LEVEL_1_RESULT_COPY: Record<Level1Decision, { status: string; title: string; subtitle: string; feedback: string }> = {
  defer: {
    status: '🏆 المهمة نجحت — قرار استراتيجي ذكي!',
    title: 'الله ينور عليك!',
    subtitle: 'وقفت القرار في وقته الصح وماتسرعتش بنص الصورة.',
    feedback: 'المتوسط والوسيط أرقام بتخدع لما تقف لوحدها؛ مروان استند للمتوسط ومحمود استند للوسيط، وتأجيلك للاعتماد هو اللي هيدي فرصة للإدارة تفحص باقي المؤشرات وتوصل للقرار المظبوط.',
  },
  marwan: {
    status: '⚠️ تسرعت في القرار!',
    title: 'المتوسط لوحده خدعك!',
    subtitle: 'المتوسط الحسابي مش كفاية لحسم التكريم.',
    feedback: 'اعتمدت على المتوسط بس؛ والمتوسط ممكن يتأثر بأي رقم استثنائي ومبيوضحش هل كل الفريق شغال كويس ولا لأ. كان لازم تطلب مؤشرات تانية تكشف تشتت الأرقام وتوريك الصورة كاملة.',
  },
  mahmoud: {
    status: '⚠️ تسرعت في القرار!',
    title: 'الوسيط مش الصورة كلها!',
    subtitle: 'الوسيط لوحده ميحسمش أداء الفريق.',
    feedback: 'اعتمدت على الوسيط بس؛ والوسيط بيقولك الرقم اللي في النص، لكن مبيوضحش هل أداء باقي الفريق قريب من بعضه ولا فيه تباين وتشتت. كان لازم تستنى مؤشرات تقيس تقارب الأداء قبل ما تعتمد.',
  },
};

/** Cinematic results (Reference 4). Never reveals which question or choice was right. */
export function GameResults({ score, decision, activeMs, onReplay, onExit, playSound }: { score: 0 | 1 | 2 | 35 | 100; decision?: Level1Decision; activeMs: number; onReplay: () => void; onExit: () => void; playSound?: (s: 'fanfare' | 'confetti' | 'somber' | 'sparkle') => void }) {
  const level1 = decision !== undefined;
  const win = level1 ? decision === 'defer' : score === 2;
  const rating = level1 ? (win ? 3 : 0) : score as 0 | 1 | 2;
  const starTotal = level1 ? 3 : 2;
  const percent = level1 ? (win ? 100 : 0) : score * 50;
  const copy = decision ? LEVEL_1_RESULT_COPY[decision] : RESULT_COPY[score as 0 | 1 | 2];
  useEffect(() => {
    playSound?.(win ? 'fanfare' : 'somber');
    if (!win) return;
    const timer = window.setTimeout(() => playSound?.('confetti'), 900);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const confetti = useMemo(() => win ? Array.from({ length: 26 }, (_, i) => ({ i, x: (i * 37) % 100, d: 2.6 + (i % 5) * .45, delay: (i % 7) * .18, r: (i * 53) % 360, c: i % 3 })) : [], [win]);
  return <section className={`rd2-results ${win ? 'is-win' : level1 ? 'is-loss' : rating === 1 ? 'is-partial' : 'is-retry'}`} data-testid="rd-results" data-score={score} dir="rtl">
    {confetti.map(p => <motion.i key={p.i} className={`rd2-confetti c${p.c}`} style={{ left: `${p.x}%` } as CSSProperties} initial={{ y: -40, rotate: p.r, opacity: 0 }} animate={{ y: '105vh', rotate: p.r + 540, opacity: [0, 1, 1, 0] }} transition={{ duration: p.d, delay: p.delay, ease: 'easeIn' }} aria-hidden="true" />)}
    {decision && <motion.div className="rd2-result-status" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 250, damping: 18 }}>{copy.status}</motion.div>}
    <motion.h2 initial={{ scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>{copy.title}</motion.h2>
    <motion.p className="rd2-results-sub" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .25 }}>{copy.subtitle}</motion.p>
    <div className="rd2-results-stage">
      <motion.div className="rd2-stat" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .55 }}><span><BarChart3 aria-hidden="true" /></span><div><small>النتيجة</small><b dir="ltr">{percent}%</b></div></motion.div>
      <div className="rd2-trophy-wrap">
        {win && <span className="rd2-rays" aria-hidden="true" />}
        <motion.div className="rd2-trophy" initial={{ y: 60, opacity: 0, scale: .6 }} animate={win ? { y: 0, opacity: 1, scale: 1 } : { y: 0, opacity: 1, scale: .92, rotate: [0, -4, 4, -2, 0] }} transition={{ delay: .35, duration: win ? .6 : 1.1 }}><Trophy aria-hidden="true" /></motion.div>
        <div className="rd2-stars" aria-label={`${rating} من ${starTotal} نجوم`}>{Array.from({ length: starTotal }, (_, i) => <motion.span key={i} className={i < rating ? 'is-lit' : ''} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .9 + i * .22, type: 'spring', stiffness: 300 }}><Star aria-hidden="true" /></motion.span>)}</div>
        <motion.div className={`rd2-plinth ${level1 && !win ? 'is-loss' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .5 }}>{level1 ? (win ? <><b dir="ltr">3/3 نجوم</b><small>التقييم العام</small></> : <b>محاولة غير موفقة</b>) : <><b dir="ltr">{rating}/2</b><small>التقييم العام</small></>}</motion.div>
      </div>
      <motion.div className="rd2-stat" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .65 }}><span><Timer aria-hidden="true" /></span><div><small>وقت الجولة</small><b dir="ltr">{formatClock(activeMs)}</b></div></motion.div>
    </div>
    <div className="rd2-progress" aria-hidden="true"><motion.i initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ delay: 1, duration: .9 }} /></div>
    <motion.div className="rd2-insight" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}><span className="rd2-ribbon">ملخص الجولة</span><p><Lightbulb aria-hidden="true" />{copy.feedback}</p></motion.div>
    <motion.div className="rd2-results-actions" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.4 }}>
      <PostGameRating gameId="reward-decision">
        {level1 && !win ? <><button className="gf-endflow-action is-primary" onClick={onReplay}>🔄 جرّب تاني وقرر صح</button><button className="gf-endflow-action" onClick={onExit}><Gamepad2 aria-hidden="true" />العودة للألعاب</button></>
          : <><button className="gf-endflow-action" onClick={onReplay}><RotateCcw aria-hidden="true" />إعادة المحاولة</button><button className="gf-endflow-action is-primary" onClick={onExit}><Gamepad2 aria-hidden="true" />العودة للألعاب</button></>}
      </PostGameRating>
    </motion.div>
  </section>;
}
