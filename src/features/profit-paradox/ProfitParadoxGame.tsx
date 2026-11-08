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
const Q1_REVIEW: Record<Choice, string> = {
  A: 'التكاليف سؤال ينفع نرجع له، بس ما نعرفش من التقرير إنها زادت. تفكيك الإيرادات والربح حسب الكرسي كان أقرب بداية.',
  B: 'الأسعار تستحق الفحص، لكن ما عندناش دليل إنها اتغيرت. فصل مساهمة كل كرسي كان هيكشف المفارقة أسرع.',
  C: 'حجم المبيعات مهم، لكن التقرير قدامنا عن الإيرادات والربح. تفكيكهم حسب الكرسي كان أوضح خطوة أولى.',
  D: 'بدأت بتفكيك الإيرادات والربح حسب المنتج؛ دي أول خطوة أقرب للمفارقة.',
};
const Q3_FEEDBACK: Record<Choice, string> = {
  A: 'كنت هوقف Basic؟ طب والربح اللي بيجيبه نحطه في درج المكتب؟',
  B: 'هنغيّر سعر Premium؟ استنى... إحنا عرفنا أصلًا إن السعر هو السبب؟',
  C: 'هنشد الحزام على الكرسيين؟ طب مين قال إن الحزام هو المشكلة؟',
  D: 'كده نسأل السؤال الصح قبل ما نغيّر حاجة في الشركة. أهو كلام يفتح النفس!',
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
const savedKey = (userId: string) => `profit-paradox-v2:${userId}`;

function restore(userId: string): GameState {
  try {
    const value = JSON.parse(localStorage.getItem(savedKey(userId)) || 'null') as GameState | null;
    if (!value || ![1, 2, 3, 4, 5].includes(value.level) || !Array.isArray(value.revenueKeys) || value.revenueKeys.some(key => !REVENUE_KEYS.includes(key)) || new Set(value.revenueKeys).size !== value.revenueKeys.length) return initialState();
    if (value.level >= 2 && !value.q1 || value.level >= 3 && !value.q2 || value.level >= 4 && !mixRevealed(value) || value.level === 5 && !value.q3) return initialState();
    return value;
  } catch { return initialState(); }
}

function useGameSound(muted: boolean, paused: boolean) {
  return useCallback((name: 'click' | 'panel' | 'choice' | 'success' | 'lose') => {
    if (muted || paused || document.visibilityState !== 'visible') return;
    const file = { click: 'click', panel: 'sweep', choice: 'pop', success: 'win', lose: 'lose' }[name];
    const sound = new Audio(`/investigation-file/audio/${file}.mp3`);
    sound.volume = name === 'success' || name === 'lose' ? 0.32 : 0.18;
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
    <img src={`${ASSETS}characters/${person}_${pose}.png`} alt={person === 'ceo' ? 'كمال، مدير رِواق' : 'رانيا، من فريق المالية'} />
    <p className="pp-speech"><span>{person === 'ceo' ? 'كمال' : 'رانيا'}</span><span className="pp-dialogue-text">{line}</span></p>
  </div>;
}

function Primary({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="pp-primary" disabled={disabled} onClick={onClick}>{children}<ArrowLeft size={20} aria-hidden="true" /></button>;
}

function MarginChart({ state, focus, showTotal }: { state: GameState; focus: (group: Product | 'total') => void; showTotal: boolean }) {
  return <div className="pp-chart-paper">
    <div className="pp-chart-top"><h2>هامش الربح الإجمالي</h2><div className="pp-legend"><span><i className="pp-jan" />يناير</span><span><i className="pp-feb" />فبراير</span></div></div>
    <p className="pp-chart-hint">اضغط على أي منتج علشان تقارن الشهرين.</p>
    <div className="pp-margin-chart" role="group" aria-label="مقارنة هوامش الربح الإجمالي بين يناير وفبراير">
      <div className="pp-axis" aria-hidden="true"><span>50%</span><span>25%</span><span>0%</span></div>
      {(['premium', 'basic', ...(showTotal ? ['total'] : [])] as (Product | 'total')[]).map(group => {
        const jan = group === 'total' ? companyMetrics('jan').margin : productMetrics('jan', group).margin;
        const feb = group === 'total' ? companyMetrics('feb').margin : productMetrics('feb', group).margin;
        return <button type="button" key={group} className={`pp-bar-group ${state.focused === group ? 'is-focused' : ''} ${state.focused && state.focused !== group ? 'is-dimmed' : ''}`} onClick={() => focus(group)} aria-pressed={state.focused === group} aria-label={`${LABELS[group]}: يناير ${pct(jan, true)}، فبراير ${pct(feb, true)}`}>
          <span className="pp-bar-pair"><span className="pp-bar pp-bar-jan" style={{ height: `${jan * 200}%` }}><b>{pct(jan, true)}</b></span><span className="pp-bar pp-bar-feb" style={{ height: `${feb * 200}%` }}><b>{pct(feb, true)}</b></span></span>
          <span className="pp-bar-name">{LABELS[group]}</span>
        </button>;
      })}
    </div>
    <p className="pp-chart-readout" aria-live="polite">{state.focused && (showTotal || state.focused !== 'total') ? `${LABELS[state.focused]}: يناير ${pct(state.focused === 'total' ? companyMetrics('jan').margin : productMetrics('jan', state.focused).margin, true)}، فبراير ${pct(state.focused === 'total' ? companyMetrics('feb').margin : productMetrics('feb', state.focused).margin, true)}` : 'اختار مجموعة في الشارت وشوف المقارنة.'}</p>
    {showTotal && <p className="pp-chart-reveal">المنتجين اتحسنوا… وإجمالي الشركة نزل؟!</p>}
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
  const [beat, setBeat] = useState(0);
  const [draft, setDraft] = useState<Choice | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'report' | 'board'>('report');
  const [chartTotal, setChartTotal] = useState(false);
  const [endingReview, setEndingReview] = useState(false);
  const [hint, setHint] = useState('');
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('pp-muted') === '1'; } catch { return false; } });
  const play = useGameSound(muted, paused);
  const wasRevealed = useRef(mixRevealed(state));

  useEffect(() => { try { localStorage.setItem(savedKey(userId), JSON.stringify(state)); } catch { /* Continue in memory when storage is unavailable. */ } }, [state, userId]);
  useEffect(() => { try { localStorage.setItem('pp-muted', muted ? '1' : '0'); } catch { /* Mute still works for this visit. */ } }, [muted]);
  useEffect(() => { if (!wasRevealed.current && mixRevealed(state)) play('success'); wasRevealed.current = mixRevealed(state); }, [state, play]);
  useEffect(() => { const stop = () => { if (document.hidden) setPaused(true); }; document.addEventListener('visibilitychange', stop); return () => document.removeEventListener('visibilitychange', stop); }, []);

  const choose = (question: 'q1' | 'q2', choice: Choice) => { if (paused) return; dispatch({ type: question, choice }); play('choice'); };
  const next = () => { play(state.level === 4 ? state.q3 === 'D' ? 'success' : 'lose' : 'panel'); dispatch({ type: 'next' }); setBeat(0); setHint(''); };
  const back = () => { play('click'); if (beat > 0) setBeat(beat - 1); else { dispatch({ type: 'back' }); setBeat(0); } setHint(''); };
  const advanceBeat = () => { setBeat(value => value + 1); play('panel'); };
  const exit = () => navigate('/app');
  const wrongCell = () => { setHint('اختار قيمة من صف الإيرادات، مش الربح أو الهامش.'); play('click'); };
  const revealed = mixRevealed(state);
  const levelName = ['','المشكلة','المفارقة','فكّك الإيرادات','التوصية','الخلاصة'][state.level];

  return <main className="pp-root" dir="rtl" data-level={state.level} data-beat={beat}>
    <PlatformGameControls onHome={exit} onPause={() => setPaused(true)} onSettings={() => { setPaused(true); setSettings(true); }} canPause={!paused} />
    <div className="pp-shell">
      <header className="pp-header"><div className="pp-header-title"><span className="pp-mark" aria-hidden="true">✦</span><div><strong>رِواق · The Profit Paradox</strong><small>{levelName} · {state.level}/5</small></div></div><div className="pp-header-progress"><span dir="ltr">{state.level} / 5</span><div aria-hidden="true">{[1,2,3,4,5].map(level => <i key={level} className={level <= state.level ? 'is-current' : ''} />)}</div></div>{(state.level > 1 && state.level < 5 || beat > 0 && state.level < 5) && <button type="button" className="pp-back" aria-label="الرجوع" onClick={back}><ArrowRight size={18} />الرجوع</button>}</header>
      <div className="pp-scroll" key={state.level}>
        {state.level === 1 && <div className="pp-level pp-level-one">{beat === 0 ? <div className="pp-focus-scene"><Actor person="ceo" pose="surprised" line="الإيرادات زادت؟ حلو... طب الربح نزل للنص ليه؟ حد يطمني إن الآلة الحاسبة صاحية." /><Primary onClick={advanceBeat}>ورّيني التقرير</Primary></div> : beat === 1 ? <div className="pp-focus-paper"><div className="pp-stage-screen"><span>نتائج رِواق · يناير / فبراير</span><div className="pp-kpi"><small>الإيرادات</small><strong dir="ltr">{cash(companyMetrics('jan').revenue)} <ArrowRight size={18} /> {cash(companyMetrics('feb').revenue)}</strong><em className="pp-up" dir="ltr">+{pct(change('revenue'))}</em></div><div className="pp-kpi"><small>الربح الإجمالي</small><strong dir="ltr">{cash(companyMetrics('jan').grossProfit)} <ArrowRight size={18} /> {cash(companyMetrics('feb').grossProfit)}</strong><em className="pp-down" dir="ltr">{pct(change('grossProfit'))}</em></div><small>الربح الإجمالي قبل المصروفات التشغيلية.</small></div><Primary onClick={advanceBeat}>أبدأ منين؟</Primary></div> : <div className="pp-question-side"><ChoiceBoard question="q1" selected={state.q1} onChoose={choice => choose('q1', choice)} /><Primary disabled={!state.q1} onClick={next}>اعتمد خطوة التحقيق</Primary></div>}</div>}
        {state.level === 2 && <div className="pp-level pp-level-two">{beat === 0 ? <div className="pp-focus-scene"><Actor person="sara" pose="surprised" line="راجعت هامش ربح الكرسيين مرتين... والاتنين اتحسنوا. آه، أنا كمان بصّيت للورقة بنفس البصة دي." /><Primary onClick={advanceBeat}>افتح مقارنة الهوامش</Primary></div> : beat === 1 ? <div className="pp-chart-side"><MarginChart state={state} showTotal={chartTotal} focus={group => { dispatch({ type: 'focus', group }); play('click'); }} />{chartTotal && <p className="pp-reaction">«الاتنين اتحسنوا، وإجمالي الشركة نزل؟ طب إزاي؟» <span>— كمال</span></p>}<Primary onClick={() => { if (chartTotal) advanceBeat(); else { setChartTotal(true); play('choice'); } }}>{chartTotal ? 'إزاي ده ممكن يحصل؟' : 'شوف هامش الشركة'}</Primary></div> : <div className="pp-question-side"><ChoiceBoard question="q2" selected={state.q2} locked={!!state.q2} onChoose={choice => choose('q2', choice)} />{state.q2 && <p className="pp-neutral-note">دي فرضيتك. تعال نختبرها بالأرقام.</p>}<Primary disabled={!state.q2} onClick={next}>اختبر فرضيتي</Primary></div>}</div>}
        {state.level === 3 && <div className="pp-level pp-level-three">{beat === 0 ? <div className="pp-focus-scene"><Actor person="sara" pose="explaining" line="المتوسط عامل فيها لغز؟ تعال نفك إيرادات كل كرسي، ونشوف مين واخد كام من الكعكة." /><Primary onClick={advanceBeat}>افتح التقرير</Primary></div> : beat === 1 ? <><div className="pp-work-heading"><div><span className="pp-mini-label">مكتب التحليل</span><h1>فكّك الإيرادات</h1><p>اختار إيرادات كل كرسي في يناير وفبراير. كل رقم هيتثبت على لوحة التوزيع.</p></div></div><nav className="pp-work-tabs" aria-label="مساحة التحليل"><button type="button" className={workspaceTab === 'report' ? 'active' : ''} onClick={() => setWorkspaceTab('report')}>التقرير</button><button type="button" className={workspaceTab === 'board' ? 'active' : ''} onClick={() => setWorkspaceTab('board')}>لوحة التوزيع · {state.revenueKeys.length}/4</button></nav><div className="pp-workspace"><div className={`pp-report-pane ${workspaceTab === 'report' ? 'visible' : ''}`}><Report state={state} dispatch={dispatch} wrongCell={wrongCell} hint={hint} onRevenue={key => { dispatch({ type: 'revenue', key }); setHint(state.revenueKeys.includes(key) ? 'اتشالت من المقارنة' : 'اتضافت للمقارنة'); play('choice'); if (state.revenueKeys.length === 3 && !state.revenueKeys.includes(key)) setWorkspaceTab('board'); }} /></div><div className={`pp-work-right ${workspaceTab === 'board' ? 'visible' : ''}`}><MixBuilder state={state} />{revealed && <Primary onClick={advanceBeat}>افهم اللي حصل</Primary>}</div></div></> : <div className="pp-explain-focus"><div className="pp-explain-card"><span className="pp-mini-label">حل المفارقة</span><h1>السر في نصيب كل كرسي</h1><ol><li>هامش الكرسيين اتحسن فعلًا.</li><li>حصة Basic الأقل هامشًا كبرت من 25% إلى 83.3%.</li><li>عشان كده هامش الشركة نزل من 30% إلى 12.5%.</li></ol><details><summary>عايز تشوف الحساب؟</summary><p dir="ltr">75% × 38% + 25% × 6% = {pct(weightedMargin('jan'), true)}</p><p dir="ltr">(1/6) × 40% + (5/6) × 7% = {pct(weightedMargin('feb'), true)}</p></details><p className="pp-hypothesis">{state.q2 && Q2_FEEDBACK[state.q2]}</p><Actor person="sara" pose="explaining" compact line="أهو! الأرقام ما كانتش متخانقة؛ إحنا كنا باصّين للمتوسط وسايبين توزيع المبيعات." /></div><Primary onClick={next}>قدّم توصيتك</Primary></div>}</div>}
        {state.level === 4 && <div className="pp-level pp-level-four">{beat === 0 ? <div className="pp-focus-scene"><Actor person="ceo" pose="neutral" line="فهمنا الهامش نزل إزاي. دلوقتي هتوصيني أعمل إيه؟ بس افتكر: توصيتك دي هعتمدها." /><Primary onClick={advanceBeat}>جهّز التوصية</Primary></div> : <div className="pp-question-side"><ChoiceBoard question="q3" selected={draft} locked={!!state.q3} onChoose={choice => { setDraft(choice); play('choice'); }} /><div className="pp-decision-actions">{!state.q3 ? <Primary disabled={!draft} onClick={() => { if (draft) { dispatch({ type: 'q3', choice: draft }); play('click'); } }}>اعتمد التوصية</Primary> : <Primary onClick={next}>شوف نتيجة قرارك</Primary>}<button type="button" className="pp-secondary" onClick={() => setReview(true)}>راجع الأرقام</button></div></div>}</div>}
        {state.level === 5 && <div className={`pp-level pp-level-five ${state.accepted ? 'pp-win' : 'pp-loss'}`}>{!endingReview ? <div className="pp-ending-stage"><div className="pp-ending-sparks" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div><img src={`${ASSETS}characters/ceo_${state.accepted ? 'approved' : 'surprised'}.png`} alt={state.accepted ? 'كمال فرحان بالتوصية' : 'كمال متفاجئ من التوصية'} /><span className="pp-ending-stamp">{state.accepted ? '✓ قرار مسؤول' : '✕ قرار متسرّع'}</span><h1>{state.accepted ? 'كسبت الجولة!' : 'الجولة دي راحت منك!'}</h1><p>كمال: «{state.q3 && Q3_FEEDBACK[state.q3]}»</p><small>{state.accepted ? 'فهمت المفارقة وقدّمت توصية يسندها الدليل.' : 'كمال اعتمد توصيتك، والمراجعة كشفت إن التقرير ما يكفيش للإجراء ده.'}</small><Primary onClick={() => { setEndingReview(true); play('panel'); }}>افتح مراجعة الجولة</Primary></div> : <div className="pp-debrief"><span className="pp-mini-label">مراجعة اختياراتك</span><h1>{state.accepted ? 'وصلت للقرار المسؤول' : 'تعال نفهم القرار اتعثر فين'}</h1><div className="pp-review-cards"><article><b>١ · بدأت منين؟</b><p>اخترت: {state.q1 && QUESTIONS.q1.options[CHOICES.indexOf(state.q1)]}</p><strong>{state.q1 && Q1_REVIEW[state.q1]}</strong></article><article><b>٢ · فرضيتك</b><p>اخترت: {state.q2 && QUESTIONS.q2.options[CHOICES.indexOf(state.q2)]}</p><strong>{state.q2 && Q2_FEEDBACK[state.q2]}</strong></article><article><b>٣ · توصيتك</b><p>اخترت: {state.q3 && QUESTIONS.q3.options[CHOICES.indexOf(state.q3)]}</p><strong>{state.q3 === 'A' ? 'Basic حقق ربحًا إجماليًا موجبًا في الشهرين. صغر هامشه وحده مش دليل لإيقافه.' : state.q3 === 'B' ? 'ما نعرفش إن سعر Premium سبب التغير، ولا أثر رفعه. القرار سبق الدليل.' : state.q3 === 'C' ? 'خفض التكاليف ممكن يتدرس، لكن التقرير مش دليل إنه الإجراء المناسب دلوقتي.' : 'فرّقت بين تفسير انخفاض الهامش وبين معرفة سبب تغيّر التوزيع. دي توصية مسؤولة قبل أي إجراء.'}</strong></article></div><section className="pp-lessons"><h2>الخمس حاجات اللي خرجنا بيها</h2><ol>{LESSONS.map(([title, body]) => <li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ol></section><blockquote dir="ltr">Analysis Means Breaking Down the Whole, Understanding Its Parts, and Discovering How They Work Together.</blockquote><div className="pp-ending-actions"><button type="button" className="pp-primary" onClick={() => { dispatch({ type: 'replay' }); setBeat(0); setDraft(null); setEndingReview(false); setWorkspaceTab('report'); setChartTotal(false); play('click'); }}><RotateCcw size={18} />العب تاني</button><button type="button" className="pp-secondary" onClick={exit}>الرجوع للألعاب</button></div></div>}</div>}
      </div>
    </div>
    {review && <div className="pp-modal-backdrop" role="presentation"><div className="pp-modal" role="dialog" aria-modal="true" aria-labelledby="pp-review-title"><button type="button" className="pp-close" aria-label="إغلاق" onClick={() => setReview(false)}><X /></button><h2 id="pp-review-title">مراجعة الأرقام</h2>{MONTHS.map(month => <p key={month}>{LABELS[month]}: Premium <bdi dir="ltr">{pct(revenueShare(month, 'premium'), true)}</bdi> · Basic <bdi dir="ltr">{pct(revenueShare(month, 'basic'), true)}</bdi> · هامش الشركة <bdi dir="ltr">{pct(companyMetrics(month).margin, true)}</bdi></p>)}<p>التوزيع يفسر تغير الهامش؛ سبب تغير التوزيع يحتاج تحليلًا إضافيًا.</p><button type="button" className="pp-primary" onClick={() => setReview(false)}>العودة للتوصية</button></div></div>}
    {paused && <div className="pp-modal-backdrop"><div className="pp-modal" role="dialog" aria-modal="true" aria-label={settings ? 'إعدادات اللعبة' : 'إيقاف مؤقت'}><span className="pp-seal">The Profit Paradox</span><h2>{settings ? 'إعدادات اللعبة' : 'اللعبة متوقفة مؤقتًا'}</h2>{settings && <><button type="button" className="pp-secondary" onClick={() => setMuted(value => !value)}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}{muted ? 'تشغيل الصوت' : 'كتم الصوت'}</button><button type="button" className="pp-secondary" onClick={() => { dispatch({ type: 'replay' }); setSettings(false); setPaused(false); }}>ابدأ من جديد</button></>}<button type="button" className="pp-primary" onClick={() => { setPaused(false); setSettings(false); }}>متابعة</button><button type="button" className="pp-secondary" onClick={exit}>الرجوع للألعاب</button></div></div>}
  </main>;
}
