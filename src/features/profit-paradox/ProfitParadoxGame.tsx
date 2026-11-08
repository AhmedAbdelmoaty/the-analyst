import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { PlatformGameControls } from '@/components/game/PlatformGameControls';
import { Choice, GameState, Month, MONTHS, PRODUCTS, Product, REVENUE_KEYS, RevenueKey, SOURCE, change, companyMetrics, gameReducer, initialState, mixRevealed, productMetrics, revenueShare, weightedMargin } from './model';
import './profit-paradox.css';

const ASSETS = '/profit-paradox/';
const LABELS = { jan: 'يناير', feb: 'فبراير', premium: 'Premium', basic: 'Basic', total: 'إجمالي الشركة' } as const;
const CHOICES: Choice[] = ['A', 'B', 'C', 'D'];
const QUESTIONS = {
  q1: { title: 'نبدأ نبص على إيه؟', options: [
    'نراجع الزيادة في إجمالي التكاليف.', 'نشوف هل أسعار البيع اتغيرت.', 'نراجع حجم المبيعات.', 'نفكك الإيرادات والربح الإجمالي حسب كل منتج.',
  ] },
  q2: { title: 'إزاي ده ممكن يحصل؟', options: [
    'أكيد فيه خطأ في الحسابات.', 'هامش ربح المنتجين قل.', 'ممكن توزيع الإيرادات اتغير ناحية المنتج الأقل في هامش الربح.', 'ده مستحيل حسابيًا.',
  ] },
  q3: { title: 'هتوصي المدير بإيه؟', options: [
    'نوقف بيع Basic فورًا.', 'نزود سعر Premium.', 'نقلل التكاليف في المنتجين.', 'نعرف ليه توزيع الإيرادات اتغير، ونقيّم مساهمة كل منتج قبل ما نوصي بإجراء.',
  ] },
} as const;
const Q2_FEEDBACK: Record<Choice, string> = {
  A: 'الحسابات متسقة؛ اللي اتغير هو توزيع الإيرادات بين المنتجين.',
  B: 'هامش كل منتج اتحسن فعلًا؛ التغير كان في نسبة مساهمته في الإيرادات.',
  C: 'فرضيتك كانت صح: التوزيع اتحول بشكل كبير ناحية Basic.',
  D: 'ده ممكن حسابيًا لأن هامش الشركة متوسط مرجّح حسب الإيرادات.',
};
const Q3_FEEDBACK: Record<Choice, string> = {
  A: 'إيقاف Basic قرار كبير، ولسه ما قيّمناش تأثيره.',
  B: 'طب إيه الدليل إن رفع سعر Premium هو الحل؟',
  C: 'خفض التكاليف ممكن يتدرس، بس البيانات دي مش كفاية علشان نقرره.',
  D: 'تمام. نفهم الأول ليه التوزيع اتغير، وبعدها نقرر.',
};
const LESSONS = [
  ['فكّك المشكلة', 'الرقم الإجمالي ممكن يخفي اختلافات مهمة بين مكوناته.'],
  ['افهم العلاقات', 'هامش الشركة بيعتمد على هامش كل منتج ونصيبه من الإيرادات.'],
  ['اسأل عن الأرقام الإجمالية', 'اتجاه الإجمالي ممكن يعاكس اتجاه كل مجموعة لوحدها.'],
  ['فرّق بين التفسير والسبب', 'عرفنا إزاي التوزيع أثّر على الهامش، لكن لسه ما عرفناش ليه التوزيع اتغير.'],
  ['فكّر قبل القرار', 'فهم المشكلة مش معناه إن أفضل إجراء بقى معروف تلقائيًا.'],
] as const;
const cash = (value: number) => `$${value.toLocaleString('en-US')}`;
const pct = (value: number, precise = false) => `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: precise ? 1 : 0 })}%`;
const savedKey = (userId: string) => `profit-paradox-v1:${userId}`;

function restore(userId: string): GameState {
  try {
    const value = JSON.parse(localStorage.getItem(savedKey(userId)) || 'null') as GameState | null;
    if (!value || ![1, 2, 3, 4, 5].includes(value.level) || !Array.isArray(value.revenueKeys) || value.revenueKeys.some(key => !REVENUE_KEYS.includes(key)) || new Set(value.revenueKeys).size !== value.revenueKeys.length) return initialState();
    if (value.level >= 2 && !value.q1 || value.level >= 3 && !value.q2 || value.level >= 4 && !mixRevealed(value) || value.level === 5 && !value.accepted) return initialState();
    return value;
  } catch { return initialState(); }
}

function useGameSound(muted: boolean, paused: boolean) {
  return useCallback((name: 'click' | 'panel' | 'choice' | 'success') => {
    if (muted || paused || document.visibilityState !== 'visible') return;
    const sound = new Audio(`/audio/platform/${name}.ogg`);
    sound.volume = name === 'success' ? 0.32 : 0.22;
    void sound.play().catch(() => {});
  }, [muted, paused]);
}

function ChoiceBoard({ question, selected, onChoose, locked = false }: { question: keyof typeof QUESTIONS; selected: Choice | null; onChoose: (choice: Choice) => void; locked?: boolean }) {
  const data = QUESTIONS[question];
  return <section className="pp-choice-board" aria-labelledby={`${question}-title`}>
    <div className="pp-board-pin" aria-hidden="true" />
    <h2 id={`${question}-title`}>{data.title}</h2>
    <div className="pp-choices">{CHOICES.map((choice, index) => <button type="button" key={choice} className={`pp-choice ${selected === choice ? 'is-selected' : ''}`} aria-pressed={selected === choice} disabled={locked || (!!selected && question !== 'q3')} onClick={() => onChoose(choice)}>
      <span className="pp-letter" dir="ltr">{choice}</span><span>{data.options[index]}</span>{selected === choice && <Check size={17} aria-hidden="true" />}
    </button>)}</div>
  </section>;
}

function Actor({ person, pose, line, compact = false }: { person: 'ceo' | 'sara'; pose: string; line: string; compact?: boolean }) {
  return <div className={`pp-actor ${compact ? 'pp-actor-compact' : ''}`}>
    <img src={`${ASSETS}characters/${person}_${pose}.png`} alt={person === 'ceo' ? 'أحمد، مدير الشركة' : 'سارة، من فريق المالية'} />
    <p className="pp-speech"><span>{person === 'ceo' ? 'أحمد' : 'سارة'}</span>{line}</p>
  </div>;
}

function Primary({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="pp-primary" disabled={disabled} onClick={onClick}>{children}<ArrowLeft size={20} aria-hidden="true" /></button>;
}

function MarginChart({ state, focus }: { state: GameState; focus: (group: Product | 'total') => void }) {
  return <div className="pp-chart-paper">
    <div className="pp-chart-top"><h2>هامش الربح الإجمالي</h2><div className="pp-legend"><span><i className="pp-jan" />يناير</span><span><i className="pp-feb" />فبراير</span></div></div>
    <p className="pp-chart-hint">اضغط على أي منتج علشان تقارن الشهرين.</p>
    <div className="pp-margin-chart" role="group" aria-label="مقارنة هوامش الربح الإجمالي بين يناير وفبراير">
      <div className="pp-axis" aria-hidden="true"><span>50%</span><span>25%</span><span>0%</span></div>
      {(['premium', 'basic', 'total'] as const).map(group => {
        const jan = group === 'total' ? companyMetrics('jan').margin : productMetrics('jan', group).margin;
        const feb = group === 'total' ? companyMetrics('feb').margin : productMetrics('feb', group).margin;
        return <button type="button" key={group} className={`pp-bar-group ${state.focused === group ? 'is-focused' : ''} ${state.focused && state.focused !== group ? 'is-dimmed' : ''}`} onClick={() => focus(group)} aria-pressed={state.focused === group} aria-label={`${LABELS[group]}: يناير ${pct(jan, true)}، فبراير ${pct(feb, true)}`}>
          <span className="pp-bar-pair"><span className="pp-bar pp-bar-jan" style={{ height: `${jan * 200}%` }}><b>{pct(jan, true)}</b></span><span className="pp-bar pp-bar-feb" style={{ height: `${feb * 200}%` }}><b>{pct(feb, true)}</b></span></span>
          <span className="pp-bar-name">{LABELS[group]}</span>
        </button>;
      })}
    </div>
    <p className="pp-chart-readout" aria-live="polite">{state.focused ? `${LABELS[state.focused]}: يناير ${pct(state.focused === 'total' ? companyMetrics('jan').margin : productMetrics('jan', state.focused).margin, true)}، فبراير ${pct(state.focused === 'total' ? companyMetrics('feb').margin : productMetrics('feb', state.focused).margin, true)}` : 'اختار مجموعة في الشارت وشوف المقارنة.'}</p>
  </div>;
}

function Report({ state, dispatch, wrongCell, onRevenue, hint }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof gameReducer>[1]>; wrongCell: () => void; onRevenue: (key: RevenueKey) => void; hint: string }) {
  const revealed = mixRevealed(state);
  const cell = (month: Month, product: Product, metric: 'revenue' | 'grossProfit' | 'margin') => {
    const key: RevenueKey = `${month}-${product}`;
    const selected = state.revenueKeys.includes(key);
    const value = productMetrics(month, product)[metric];
    return <button type="button" key={`${month}-${product}-${metric}`} className={`pp-report-cell ${metric === 'revenue' ? 'pp-revenue-cell' : ''} ${selected && metric === 'revenue' ? 'is-placed' : ''}`} aria-label={`${LABELS[month]}، ${LABELS[product]}، ${metric === 'revenue' ? 'الإيرادات' : metric === 'grossProfit' ? 'الربح الإجمالي' : 'هامش الربح الإجمالي'}، ${metric === 'margin' ? pct(value, true) : cash(value)}${selected && metric === 'revenue' ? '، تمت الإضافة' : ''}`} aria-pressed={metric === 'revenue' ? selected : undefined} onClick={() => metric === 'revenue' ? onRevenue(key) : wrongCell()}>
      <bdi dir="ltr">{metric === 'margin' ? pct(value, true) : cash(value)}</bdi>{metric === 'revenue' && <span aria-hidden="true">{selected ? '✓' : '+'}</span>}
    </button>;
  };
  const row = (product: Product, metric: 'revenue' | 'grossProfit' | 'margin') => <div className="pp-report-row" key={`${product}-${metric}`}><span>{metric === 'revenue' ? 'الإيرادات' : metric === 'grossProfit' ? 'الربح الإجمالي' : 'هامش الربح الإجمالي'}</span><div className="pp-month-values">{MONTHS.map(month => <div key={month} className={state.month === month ? 'is-active-month' : ''}>{cell(month, product, metric)}</div>)}</div></div>;
  return <section className="pp-report" aria-label="تقرير يناير وفبراير">
    <div className="pp-report-heading"><span className="pp-paper-clip" aria-hidden="true">⌁</span><div><small>تقرير المالية</small><h2>تقرير يناير وفبراير</h2></div></div>
    <div className="pp-month-tabs" role="tablist" aria-label="شهر التقرير">{MONTHS.map(month => <button role="tab" aria-selected={state.month === month} type="button" key={month} onClick={() => dispatch({ type: 'month', month })}>{LABELS[month]}</button>)}</div>
    <div className="pp-report-columns"><span>المؤشر</span><div className="pp-month-values">{MONTHS.map(month => <span key={month} className={state.month === month ? 'is-active-month' : ''}>{LABELS[month]}</span>)}</div></div>
    {PRODUCTS.map(product => <div className="pp-report-section" key={product}><h3><i className={`pp-product-dot pp-${product}`} />{LABELS[product]}</h3>{(['revenue', 'grossProfit', 'margin'] as const).map(metric => row(product, metric))}</div>)}
    <div className="pp-report-section pp-total"><h3>إجمالي الشركة</h3>{(['revenue', 'grossProfit', 'margin'] as const).map(metric => <div className="pp-report-row" key={metric}><span>{metric === 'revenue' ? 'الإيرادات' : metric === 'grossProfit' ? 'الربح الإجمالي' : 'هامش الربح الإجمالي'}</span><div className="pp-month-values">{MONTHS.map(month => <span key={month} className={state.month === month ? 'is-active-month' : ''}><bdi dir="ltr">{metric === 'margin' ? pct(companyMetrics(month).margin, true) : cash(companyMetrics(month)[metric])}</bdi></span>)}</div></div>)}</div>
    <div className="pp-report-footer" aria-live="polite">{hint || (revealed ? 'تم بناء المقارنة من قيم التقرير' : 'اضغط على قيم الإيرادات لإضافتها للمقارنة')}</div>
  </section>;
}

function MixBuilder({ state }: { state: GameState }) {
  const revealed = mixRevealed(state);
  return <section className="pp-builder" aria-labelledby="pp-builder-title">
    <div className="pp-builder-head"><h2 id="pp-builder-title">توزيع الإيرادات</h2><span className="pp-counter" aria-live="polite">{state.revenueKeys.length} من 4</span></div>
    <p>اختار إيرادات Premium وBasic لكل شهر علشان تبني المقارنة.</p>
    {MONTHS.map(month => <div className="pp-mix-month" key={month}><h3>{LABELS[month]}</h3><div className="pp-mix-slots">{PRODUCTS.map(product => {
      const key: RevenueKey = `${month}-${product}`;
      const filled = state.revenueKeys.includes(key);
      return <div className={`pp-mix-slot ${filled ? 'is-filled' : ''}`} key={product}><span><i className={`pp-product-dot pp-${product}`} />{LABELS[product]}</span><bdi dir="ltr">{filled ? cash(SOURCE[month][product].revenue) : '—'}</bdi></div>;
    })}</div>
      {revealed && <div className="pp-mix-bar" aria-label={`${LABELS[month]}: Premium ${pct(revenueShare(month, 'premium'), true)}، Basic ${pct(revenueShare(month, 'basic'), true)}`}><span className="pp-mix-premium" style={{ width: `${revenueShare(month, 'premium') * 100}%` }}>{pct(revenueShare(month, 'premium'), true)}</span><span className="pp-mix-basic" style={{ width: `${revenueShare(month, 'basic') * 100}%` }}>{pct(revenueShare(month, 'basic'), true)}</span></div>}
    </div>)}
    {revealed && <div className="pp-discovery"><strong>توزيع الإيرادات اتغير بشكل كبير!</strong><p>أهو التوزيع اتغير بشكل كبير ناحية Basic.</p><p className="pp-hypothesis">{state.q2 && Q2_FEEDBACK[state.q2]}</p><div className="pp-equation"><b>ليه هامش الشركة نزل؟</b><span dir="ltr">75% × 38% + 25% × 6% = {pct(weightedMargin('jan'), true)}</span><span dir="ltr">(1/6) × 40% + (5/6) × 7% = {pct(weightedMargin('feb'), true)}</span><small>هامش كل منتج اتحسن، لكن حصة Basic الأقل هامشًا زادت جدًا.</small></div></div>}
  </section>;
}

export default function ProfitParadoxGame({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(gameReducer, userId, restore);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(false);
  const [review, setReview] = useState(false);
  const [hint, setHint] = useState('');
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('pp-muted') === '1'; } catch { return false; } });
  const play = useGameSound(muted, paused);
  const wasRevealed = useRef(mixRevealed(state));

  useEffect(() => { try { localStorage.setItem(savedKey(userId), JSON.stringify(state)); } catch { /* Continue in memory when storage is unavailable. */ } }, [state, userId]);
  useEffect(() => { try { localStorage.setItem('pp-muted', muted ? '1' : '0'); } catch { /* Mute still works for this visit. */ } }, [muted]);
  useEffect(() => { if (!wasRevealed.current && mixRevealed(state)) play('success'); wasRevealed.current = mixRevealed(state); }, [state, play]);
  useEffect(() => { const stop = () => { if (document.hidden) setPaused(true); }; document.addEventListener('visibilitychange', stop); return () => document.removeEventListener('visibilitychange', stop); }, []);

  const choose = (question: 'q1' | 'q2' | 'q3', choice: Choice) => { if (paused) return; dispatch({ type: question, choice }); play(question === 'q3' && choice === 'D' ? 'success' : 'choice'); };
  const next = () => { play('panel'); dispatch({ type: 'next' }); setHint(''); };
  const back = () => { play('panel'); dispatch({ type: 'back' }); setHint(''); };
  const exit = () => navigate('/app');
  const wrongCell = () => { setHint('اختار قيمة من صف الإيرادات، مش الربح أو الهامش.'); play('click'); };
  const revealed = mixRevealed(state);
  const levelName = ['','المشكلة','المفارقة','فكّك الإيرادات','التوصية','الخلاصة'][state.level];

  return <main className="pp-root" dir="rtl" data-level={state.level}>
    <PlatformGameControls onHome={exit} onPause={() => setPaused(true)} onSettings={() => { setPaused(true); setSettings(true); }} canPause={!paused} />
    <div className="pp-shell">
      <header className="pp-header"><div className="pp-header-title"><span className="pp-mark" aria-hidden="true">✦</span><div><strong>The Profit Paradox</strong><small>{levelName} · {state.level}/5</small></div></div><div className="pp-header-progress"><span dir="ltr">{state.level} / 5</span><div aria-hidden="true">{[1,2,3,4,5].map(level => <i key={level} className={level <= state.level ? 'is-current' : ''} />)}</div></div>{state.level > 1 && <button type="button" className="pp-back" aria-label="الرجوع" onClick={back}><ArrowRight size={18} />الرجوع</button>}</header>
      <div className="pp-scroll" key={state.level}>
        {state.level === 1 && <div className="pp-level pp-level-one"><div className="pp-scene pp-boardroom"><div className="pp-stage-screen"><span>نتائج الشركة</span><div className="pp-kpi"><small>الإيرادات</small><strong dir="ltr">{cash(companyMetrics('jan').revenue)} <ArrowRight size={18} /> {cash(companyMetrics('feb').revenue)}</strong><em className="pp-up" dir="ltr">+{pct(change('revenue'))}</em></div><div className="pp-kpi"><small>الربح الإجمالي</small><strong dir="ltr">{cash(companyMetrics('jan').grossProfit)} <ArrowRight size={18} /> {cash(companyMetrics('feb').grossProfit)}</strong><em className="pp-down" dir="ltr">{pct(change('grossProfit'))}</em></div><div className="pp-presentation-bars" aria-hidden="true"><div className="pp-mini-legend"><span>إيرادات</span><span>ربح إجمالي</span></div>{MONTHS.map(month => <div key={month}><b>{LABELS[month]}</b><i style={{ width: `${companyMetrics(month).revenue / companyMetrics('feb').revenue * 100}%` }} /><i style={{ width: `${companyMetrics(month).grossProfit / companyMetrics('feb').revenue * 100}%` }} /></div>)}</div></div><Actor person="ceo" pose="surprised" line={state.q1 ? 'تمام، خلينا نشوف تقرير المالية.' : 'المبيعات زادت 20%، والربح قل للنص؟ طب حد يفهمني إيه اللي حصل.'} /></div><div className="pp-question-side"><ChoiceBoard question="q1" selected={state.q1} onChoose={choice => choose('q1', choice)} /><Primary disabled={!state.q1} onClick={next}>شوف تقرير المالية</Primary></div></div>}
        {state.level === 2 && <div className="pp-level pp-level-two"><div className="pp-chart-side"><Actor person="sara" pose="explaining" compact line="راجعنا هامش الربح في المنتجين... الاتنين اتحسنوا." /><MarginChart state={state} focus={group => { dispatch({ type: 'focus', group }); play('click'); }} /><p className="pp-reaction">«الاتنين اتحسنوا، وإجمالي الشركة نزل؟ طب إزاي؟» <span>— أحمد</span></p></div><div className="pp-question-side"><ChoiceBoard question="q2" selected={state.q2} locked={!!state.q2} onChoose={choice => choose('q2', choice)} />{state.q2 && <p className="pp-neutral-note">دي فرضيتك. تعال نختبرها بالأرقام.</p>}<Primary disabled={!state.q2} onClick={next}>حلّل توزيع الإيرادات</Primary></div></div>}
        {state.level === 3 && <div className="pp-level pp-level-three"><div className="pp-work-heading"><div><span className="pp-mini-label">مكتب التحليل</span><h1>فكّك الإيرادات</h1><p>بص على الإيرادات بتاعة كل منتج في الشهرين، وقارن التوزيع.</p></div></div><div className="pp-workspace"><Report state={state} dispatch={dispatch} wrongCell={wrongCell} hint={hint} onRevenue={key => { dispatch({ type: 'revenue', key }); setHint(state.revenueKeys.includes(key) ? 'اتشالت من المقارنة' : 'اتضافت للمقارنة'); play('choice'); }} /><div className="pp-work-right"><MixBuilder state={state} />{revealed && <Primary onClick={next}>قدّم توصيتك</Primary>}</div></div></div>}
        {state.level === 4 && <div className="pp-level pp-level-four"><div className="pp-decision-scene"><Actor person="ceo" pose={state.accepted ? 'approved' : 'neutral'} line={state.q3 ? Q3_FEEDBACK[state.q3] : 'تمام، فهمنا اللي حصل في الهامش. نوصي بإيه؟'} compact /><div className="pp-known-facts"><strong>اللي عرفناه</strong><span>الإيرادات <bdi dir="ltr">+{pct(change('revenue'))}</bdi></span><span>الربح الإجمالي <bdi dir="ltr">{pct(change('grossProfit'))}</bdi></span><span>التوزيع اتغير ناحية Basic</span></div></div><div className="pp-question-side"><ChoiceBoard question="q3" selected={state.q3} locked={!!state.q3} onChoose={choice => choose('q3', choice)} /><div className="pp-decision-actions">{state.q3 && !state.accepted && <Primary onClick={() => { dispatch({ type: 'retryQ3' }); play('panel'); }}>راجع توصيتك</Primary>}{state.accepted && <Primary onClick={next}>شوف الخلاصة</Primary>}<button type="button" className="pp-secondary" onClick={() => setReview(true)}>راجع الأرقام</button></div></div></div>}
        {state.level === 5 && <div className="pp-level pp-level-five"><div className="pp-ending"><img src={`${ASSETS}characters/ceo_approved.png`} alt="أحمد يوافق على التوصية" /><div><span className="pp-seal">✓ تحليل سليم</span><h1>حلّيت المفارقة!</h1><p>فهمت أثر توزيع الإيرادات، وقدمت توصية تبدأ بفهم سبب التغير قبل اتخاذ إجراء.</p></div></div><section className="pp-lessons"><h2>إيه اللي اتعلمناه؟</h2><ol>{LESSONS.map(([title, body]) => <li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ol></section><blockquote dir="ltr">Analysis Means Breaking Down the Whole, Understanding Its Parts, and Discovering How They Work Together.</blockquote><div className="pp-ending-actions"><button type="button" className="pp-primary" onClick={() => { dispatch({ type: 'replay' }); play('panel'); }}><RotateCcw size={18} />العب تاني</button><button type="button" className="pp-secondary" onClick={exit}>الرجوع للألعاب</button></div></div>}
      </div>
    </div>
    {review && <div className="pp-modal-backdrop" role="presentation"><div className="pp-modal" role="dialog" aria-modal="true" aria-labelledby="pp-review-title"><button type="button" className="pp-close" aria-label="إغلاق" onClick={() => setReview(false)}><X /></button><h2 id="pp-review-title">مراجعة الأرقام</h2>{MONTHS.map(month => <p key={month}>{LABELS[month]}: Premium <bdi dir="ltr">{pct(revenueShare(month, 'premium'), true)}</bdi> · Basic <bdi dir="ltr">{pct(revenueShare(month, 'basic'), true)}</bdi> · هامش الشركة <bdi dir="ltr">{pct(companyMetrics(month).margin, true)}</bdi></p>)}<p>التوزيع يفسر تغير الهامش؛ سبب تغير التوزيع يحتاج تحليلًا إضافيًا.</p><button type="button" className="pp-primary" onClick={() => setReview(false)}>العودة للتوصية</button></div></div>}
    {paused && <div className="pp-modal-backdrop"><div className="pp-modal" role="dialog" aria-modal="true" aria-label={settings ? 'إعدادات اللعبة' : 'إيقاف مؤقت'}><span className="pp-seal">The Profit Paradox</span><h2>{settings ? 'إعدادات اللعبة' : 'اللعبة متوقفة مؤقتًا'}</h2>{settings && <><button type="button" className="pp-secondary" onClick={() => setMuted(value => !value)}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}{muted ? 'تشغيل الصوت' : 'كتم الصوت'}</button><button type="button" className="pp-secondary" onClick={() => { dispatch({ type: 'replay' }); setSettings(false); setPaused(false); }}>ابدأ من جديد</button></>}<button type="button" className="pp-primary" onClick={() => { setPaused(false); setSettings(false); }}>متابعة</button><button type="button" className="pp-secondary" onClick={exit}>الرجوع للألعاب</button></div></div>}
  </main>;
}
