import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformGameControls } from '@/components/game/PlatformGameControls';
import analyst from './assets/analyst.png.asset.json';
import manager from './assets/manager.png.asset.json';

const SFX = '/investigation-file/audio/';
type Sound = 'click' | 'page-turn' | 'win' | 'lose' | 'pop' | 'woosh' | 'confettipop' | 'wrong';
function play(name: Sound, muted: boolean) {
  if (muted) return;
  const src = name === 'wrong' ? '/assets/behind-dots/audio/wrong.ogg' : `${SFX}${name}.mp3`;
  const a = new Audio(src);
  a.volume = 0.6;
  void a.play().catch(() => {});
}

const DATA = {
  A: { easy: [72, 80], hard: [8, 20], total: [80, 100] },
  B: { easy: [19, 20], hard: [40, 80], total: [59, 100] },
} as const;
const pct = (v: readonly [number, number] | readonly number[]) => Math.round((v[0] / v[1]) * 100);

type Phase = 'intro' | 'first' | 'inspect' | 'level' | 'why' | 'final' | 'result';
type Option = { id: string; text: string; good: boolean; feedback: string };
type OptionGroup = 'first' | 'level' | 'why' | 'final';
type SavedRun = { version: 1; phase: Phase; score: number; pickedId: string | null; won: boolean; levelOk: boolean; order: Record<OptionGroup, string[]> };
const saveKey = (userId: string) => `the-analyst:team-performance:v1:${encodeURIComponent(userId)}`;
const optionGroups = () => ({ first: FIRST, level: LEVEL, why: WHY, final: FINAL });
function loadRun(userId: string): SavedRun | null {
  try {
    const value = JSON.parse(localStorage.getItem(saveKey(userId)) || 'null') as SavedRun | null;
    if (!value || value.version !== 1 || !['intro', 'first', 'inspect', 'level', 'why', 'final', 'result'].includes(value.phase)
      || !Number.isInteger(value.score) || value.score < 0 || value.score > 100 || typeof value.won !== 'boolean' || typeof value.levelOk !== 'boolean') return null;
    const groups = optionGroups();
    for (const key of Object.keys(groups) as OptionGroup[]) {
      const expected = groups[key].map(option => option.id);
      if (!Array.isArray(value.order?.[key]) || value.order[key].length !== expected.length || !expected.every(id => value.order[key].includes(id))) return null;
    }
    const current = groups[value.phase as OptionGroup];
    if (value.pickedId !== null && (!current || !current.some(option => option.id === value.pickedId))) return null;
    return value;
  } catch { return null; }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const FIRST: Option[] = [
  { id: 'monitor', text: 'زيادة الرقابة والمتابعة على موظفي فريق ب', good: false, feedback: 'قرار مبني على رقم إجمالي بس… ممكن يكون مضلل.' },
  { id: 'training', text: 'توفير تدريب إضافي لفريق ب', good: false, feedback: 'إزاي تعرف إنهم محتاجين تدريب من غير ما تشوف التفاصيل؟' },
  { id: 'replace', text: 'استبدال الموظفين ضعاف الأداء في فريق ب', good: false, feedback: 'قرار قاسي على رقم واحد… ممكن تظلم ناس كويسة.' },
  { id: 'data', text: 'محتاجين بيانات أكتر قبل أي قرار', good: true, feedback: 'تفكير محلل حقيقي! الرقم الإجمالي ممكن يخبّي حاجات.' },
];
const LEVEL: Option[] = [
  { id: 'A', text: 'فريق أ', good: false, feedback: 'بص تاني: في السهل 90% مقابل 95%، وفي الصعب 40% مقابل 50%.' },
  { id: 'B', text: 'فريق ب', good: true, feedback: 'بالظبط! فريق ب أعلى في السهل وفي الصعب.' },
  { id: 'same', text: 'متساويين تقريباً', good: false, feedback: 'الفرق واضح في المستويين لصالح فريق ب.' },
];
const WHY: Option[] = [
  { id: 'mix', text: 'فريق ب أخد 80 مهمة صعبة، وفريق أ أخد 80 مهمة سهلة — التوزيع مختلف', good: true, feedback: 'ده سر المفارقة: خلطة المهام هي اللي نزّلت إجمالي فريق ب.' },
  { id: 'lazy', text: 'فريق ب كان كسلان في آخر الشهر', good: false, feedback: 'مفيش أي دليل على كده في البيانات.' },
  { id: 'error', text: 'أكيد في غلطة في الأرقام', good: false, feedback: 'الأرقام سليمة؛ الإجمالي متسق مع التفاصيل.' },
];
const FINAL: Option[] = [
  { id: 'B', text: 'التكريم لفريق ب — أداؤه أعلى في كل مستوى صعوبة', good: true, feedback: '' },
  { id: 'A', text: 'التكريم لفريق أ — الإجمالي هو اللي يهم', good: false, feedback: '' },
];
const POINTS = { first: 30, level: 20, why: 20, final: 30 };

function DataTable() {
  const rows: [string, string, string][] = [
    ['المهام السهلة المنجزة', `${DATA.A.easy[0]} / ${DATA.A.easy[1]}`, `${DATA.B.easy[0]} / ${DATA.B.easy[1]}`],
    ['نسبة إنجاز المهام السهلة', `${pct(DATA.A.easy)}%`, `${pct(DATA.B.easy)}%`],
    ['المهام الصعبة المنجزة', `${DATA.A.hard[0]} / ${DATA.A.hard[1]}`, `${DATA.B.hard[0]} / ${DATA.B.hard[1]}`],
    ['نسبة إنجاز المهام الصعبة', `${pct(DATA.A.hard)}%`, `${pct(DATA.B.hard)}%`],
    ['نسبة الإنجاز الإجمالية', `${pct(DATA.A.total)}%`, `${pct(DATA.B.total)}%`],
  ];
  return (
    <div className="animate-fade-in overflow-hidden rounded-xl border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a]">
      <table className="w-full text-sm sm:text-base">
        <thead>
          <tr className="border-b-2 border-slate-700">
            <th className="p-3 text-right font-black text-rose-700">صعوبة المهام</th>
            <th className="border-r-2 border-slate-700 p-3 text-center font-black text-rose-700">فريق أ</th>
            <th className="border-r-2 border-slate-700 p-3 text-center font-black text-rose-700">فريق ب</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([l, a, b]) => (
            <tr key={l} className="border-b border-slate-400 last:border-b-0">
              <td className="p-3 font-bold text-slate-800">{l}</td>
              <td className="border-r-2 border-slate-700 p-3 text-center font-bold tabular-nums text-slate-800">{a}</td>
              <td className="border-r-2 border-slate-700 p-3 text-center font-bold tabular-nums text-slate-800">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Speech({ who, img, children }: { who: string; img: string; children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3 animate-fade-in">
      <img src={img} alt={who} className="h-40 w-auto shrink-0 drop-shadow-xl sm:h-56 animate-[tp-bob_3s_ease-in-out_infinite]" />
      <div className="relative mb-6 flex-1 rounded-2xl border-4 border-slate-900 bg-white p-4 text-base font-bold leading-relaxed text-slate-900 shadow-[6px_6px_0_#0f172a] sm:text-lg">
        <div className="mb-1 text-xs font-black text-rose-600">{who}</div>
        {children}
      </div>
    </div>
  );
}

function Choices({ options, onPick, picked }: { options: Option[]; onPick: (o: Option) => void; picked: Option | null }) {
  return (
    <div className="grid gap-3">
      {options.map((o, i) => {
        const state = picked ? (o.id === picked.id ? (o.good ? 'good' : 'bad') : 'dim') : 'idle';
        return (
          <button key={o.id} disabled={!!picked} onClick={() => onPick(o)}
            style={{ animationDelay: `${i * 90}ms` }}
            className={`animate-fade-in rounded-xl border-4 border-slate-900 px-4 py-3 text-right text-base font-black shadow-[4px_4px_0_#0f172a] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none ${
              state === 'good' ? 'bg-emerald-400 scale-[1.02]' : state === 'bad' ? 'bg-rose-400 animate-[tp-shake_.4s]' : state === 'dim' ? 'bg-white opacity-50' : 'bg-white hover:-translate-y-0.5 hover:bg-yellow-200'}`}>
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

export default function TeamPerformanceGame({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [saved] = useState(() => loadRun(userId));
  const [phase, setPhase] = useState<Phase>(saved?.phase ?? 'intro');
  const [score, setScore] = useState(saved?.score ?? 0);
  const [picked, setPicked] = useState<Option | null>(() => saved?.pickedId ? optionGroups()[saved.phase as OptionGroup]?.find(option => option.id === saved.pickedId) ?? null : null);
  const [won, setWon] = useState(saved?.won ?? false);
  const [muted, setMuted] = useState(() => localStorage.getItem('tp-muted') === '1');
  const [pop, setPop] = useState<string | null>(null);
  const [levelOk, setLevelOk] = useState(saved?.levelOk ?? false);
  const [opts, setOpts] = useState(() => {
    const groups = optionGroups();
    return Object.fromEntries((Object.keys(groups) as OptionGroup[]).map(key => [key, saved ? saved.order[key].map(id => groups[key].find(option => option.id === id)!) : shuffle(groups[key])])) as Record<OptionGroup, Option[]>;
  });
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const pendingTimers = useRef<number[]>([]);
  const later = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => { pendingTimers.current = pendingTimers.current.filter(timer => timer !== id); callback(); }, delay);
    pendingTimers.current.push(id);
  };
  useEffect(() => {
    if (paused) { pendingTimers.current.forEach(window.clearTimeout); pendingTimers.current = []; setPop(null); }
  }, [paused]);
  useEffect(() => () => { pendingTimers.current.forEach(window.clearTimeout); }, []);

  useEffect(() => { localStorage.setItem('tp-muted', muted ? '1' : '0'); }, [muted]);
  useEffect(() => { topRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [phase]);
  const persist = () => {
    const order = Object.fromEntries((Object.keys(opts) as OptionGroup[]).map(key => [key, opts[key].map(option => option.id)])) as Record<OptionGroup, string[]>;
    try { localStorage.setItem(saveKey(userId), JSON.stringify({ version: 1, phase, score, pickedId: picked?.id ?? null, won, levelOk, order } satisfies SavedRun)); } catch { /* Keep the current run playable when storage is unavailable. */ }
  };
  useEffect(persist, [userId, phase, score, picked, won, levelOk, opts]);
  useEffect(() => { const onHide = () => { if (document.hidden) setPaused(true); }; document.addEventListener('visibilitychange', onHide); return () => document.removeEventListener('visibilitychange', onHide); }, []);

  const go = (p: Phase) => { play('page-turn', muted); setPicked(null); setPhase(p); };
  const pick = (o: Option, points: number) => {
    setPicked(o);
    if (phase === 'level') setLevelOk(o.good);
    if (o.good) { setScore(s => s + points); play('pop', muted); setPop(`+${points}`); later(() => setPop(null), 900); }
    else play('wrong', muted);
  };
  // Win = correct final decision AND correct reading of the table (level). Trap mistakes only lower the score.
  const decide = (o: Option) => {
    const final = o.good ? score + POINTS.final : score;
    const win = o.good && levelOk;
    setScore(final);
    setWon(win);
    play(win ? 'win' : 'lose', muted);
    if (win) later(() => play('confettipop', muted), 500);
    setPhase('result');
  };
  const restart = () => { play('woosh', muted); setScore(0); setPicked(null); setWon(false); setLevelOk(false); setOpts({ first: shuffle(FIRST), level: shuffle(LEVEL), why: shuffle(WHY), final: shuffle(FINAL) }); setPhase('intro'); setPaused(false); setSettingsOpen(false); };
  const confirmRestart = () => { if (phase === 'intro' || phase === 'result' || window.confirm('تبدأ من الأول؟ تقدم الجولة الحالية هيتمسح.')) restart(); };
  const exit = () => { persist(); navigate('/app'); };

  const step = ['intro', 'first', 'inspect', 'level', 'why', 'final', 'result'].indexOf(phase);

  return (
    <div ref={topRef} dir="rtl" className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#fef3c7,#fde68a_40%,#fb923c)] font-[Cairo,sans-serif] text-slate-900">
      <style>{`@keyframes tp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes tp-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@keyframes tp-rise{0%{opacity:0;transform:translateY(0) scale(.6)}30%{opacity:1;transform:translateY(-10px) scale(1.2)}100%{opacity:0;transform:translateY(-50px) scale(1)}}@keyframes tp-confetti{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}`}</style>

      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b-4 border-slate-900 bg-slate-900 py-3 pr-3 pl-[164px] text-white">
        <div className="hidden text-sm font-black sm:block">⚡ أداء الفريق</div>
        <div className="flex flex-1 justify-center gap-1">
          {Array.from({ length: 7 }).map((_, i) => <span key={i} className={`h-2 w-2 sm:w-6 rounded-full ${i <= step ? 'bg-yellow-400' : 'bg-white/20'}`} />)}
        </div>
        <div className="relative rounded-lg bg-yellow-400 px-3 py-1 text-sm font-black text-slate-900 tabular-nums">
          {score} نقطة
          {pop && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg font-black text-emerald-300 animate-[tp-rise_.9s_ease-out_forwards]">{pop}</span>}
        </div>
      </div>
      <PlatformGameControls onHome={exit} onPause={() => setPaused(true)} onSettings={() => { setPaused(true); setSettingsOpen(true); }} canPause={phase !== 'intro' && phase !== 'result' && !paused} />
      {paused && <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={settingsOpen ? 'إعدادات اللعبة' : 'إيقاف مؤقت'}><div className="w-full max-w-sm space-y-3 rounded-2xl border-4 border-slate-900 bg-amber-100 p-5 text-center shadow-xl"><h2 className="text-xl font-black">{settingsOpen ? 'إعدادات اللعبة' : 'اللعبة متوقفة مؤقتًا'}</h2>{settingsOpen && <><button className="min-h-11 w-full rounded-lg bg-white font-bold" onClick={() => setMuted(value => !value)}>{muted ? 'تشغيل الصوت' : 'كتم الصوت'}</button><button className="min-h-11 w-full rounded-lg bg-white font-bold" onClick={confirmRestart}>ابدأ من جديد</button></>}<button className="min-h-11 w-full rounded-lg bg-slate-900 font-bold text-white" onClick={() => { setSettingsOpen(false); setPaused(false); }}>كمّل اللعب</button><button className="min-h-11 w-full rounded-lg bg-white font-bold" onClick={exit}>العودة إلى الألعاب</button></div></div>}

      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-16">
        {phase === 'intro' && (
          <>
            <Speech who="الأستاذ شريف — المدير" img={manager.url}>
              يا سلام! تقرير الشهر وصل 🎉 فريق <b className="text-amber-600">أ</b> خلّص <b>80%</b> من مهامه، وفريق <b className="text-sky-600">ب</b> خلّص <b>59%</b> بس. أنا ناوي أدي المكافأة الكبيرة لفريق أ النهارده!
            </Speech>
            <div className="grid grid-cols-2 gap-3">
              {(['A', 'B'] as const).map(t => (
                <div key={t} className="animate-scale-in rounded-2xl border-4 border-slate-900 bg-white p-4 text-center shadow-[6px_6px_0_#0f172a]">
                  <div className="text-sm font-black">فريق {t === 'A' ? 'أ' : 'ب'}</div>
                  <div className={`text-5xl font-black ${t === 'A' ? 'text-amber-500' : 'text-sky-600'}`}>{pct(DATA[t].total)}%</div>
                  <div className="text-xs font-bold text-slate-500">نسبة الإنجاز الإجمالية</div>
                </div>
              ))}
            </div>
            <button onClick={() => go('first')} className="w-full rounded-2xl border-4 border-slate-900 bg-rose-500 py-4 text-xl font-black text-white shadow-[6px_6px_0_#0f172a] active:translate-y-1 active:shadow-none">ابدأ التحليل ▶</button>
          </>
        )}

        {phase === 'first' && (
          <>
            <Speech who="الأستاذ شريف" img={manager.url}>فريق ب واضح إنه متأخر… تنصحني أعمل إيه معاهم يا محلل؟</Speech>
            <Choices options={opts.first} picked={picked} onPick={o => pick(o, POINTS.first)} />
            {picked && <Feedback o={picked} next={() => go('inspect')} label="افتح تفاصيل التقرير 📊" />}
          </>
        )}

        {phase === 'inspect' && (
          <>
            <Speech who="أنت — المحلل" img={analyst.url}>ده التقرير مفصّل حسب صعوبة المهام. اقراه كويس… 🔍</Speech>
            <DataTable />
            <button onClick={() => go('level')} className="w-full rounded-2xl border-4 border-slate-900 bg-sky-500 py-4 text-lg font-black text-white shadow-[6px_6px_0_#0f172a] active:translate-y-1 active:shadow-none">قريت الجدول ▶</button>
          </>
        )}

        {phase === 'level' && (
          <>
            <DataTable />
            <Speech who="أنت — المحلل" img={analyst.url}>سؤال مهم: مين أعلى نسبة إنجاز <u>داخل كل مستوى صعوبة</u>؟</Speech>
            <Choices options={opts.level} picked={picked} onPick={o => pick(o, POINTS.level)} />
            {picked && <Feedback o={picked} next={() => go('why')} />}
          </>
        )}

        {phase === 'why' && (
          <>
            <Speech who="الأستاذ شريف" img={manager.url}>طب إزاي فريق ب أحسن في الاتنين… والإجمالي بتاعه أقل؟! 🤯</Speech>
            <Choices options={opts.why} picked={picked} onPick={o => pick(o, POINTS.why)} />
            {picked && <Feedback o={picked} next={() => go('final')} />}
          </>
        )}

        {phase === 'final' && (
          <>
            <Speech who="الأستاذ شريف" img={manager.url}>تمام… القرار النهائي في إيدك. المكافأة لمين؟</Speech>
            <Choices options={opts.final} picked={null} onPick={decide} />
          </>
        )}

        {phase === 'result' && (
          <div className="space-y-4 animate-scale-in">
            {won && <Confetti />}
            <div className={`rounded-3xl border-4 border-slate-900 p-5 text-center shadow-[8px_8px_0_#0f172a] ${won ? 'bg-emerald-300' : 'bg-rose-300'}`}>
              <div className="text-5xl">{won ? '🏆' : '💥'}</div>
              <h2 className="mt-2 text-3xl font-black">{won ? (score === 100 ? 'محلل محترف — قرار مثالي!' : 'كسبت — بس اتداركت الموقف') : 'خسرت — القرار ظلم الفريق الأحسن'}</h2>
              <div className="mt-1 text-lg font-black tabular-nums">{score} / 100 نقطة</div>
            </div>
            <Speech who={won ? 'الأستاذ شريف' : 'أنت — المحلل'} img={won ? manager.url : analyst.url}>
              {won ? 'برافو! كنت هظلم فريق ب اللي شال الشغل الصعب. المكافأة رايحة لهم 👏' : 'الإجمالي خدعنا… فريق ب كان أعلى في السهل وفي الصعب، بس أخد مهام صعبة أكتر.'}
            </Speech>
            <div className="rounded-2xl border-4 border-slate-900 bg-white p-4 shadow-[6px_6px_0_#0f172a]">
              <h3 className="mb-2 text-lg font-black text-rose-600">💡 مفارقة سيمبسون</h3>
              <p className="font-bold leading-relaxed">ممكن مجموعة تكون أحسن في كل فئة لوحدها، ومع ذلك إجماليها يطلع أقل — لأن توزيعها على الفئات مختلف. قبل ما تقارن نسب إجمالية، اسأل: <b>"هل الخلطة واحدة؟"</b></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={restart} className="rounded-2xl border-4 border-slate-900 bg-yellow-400 py-3 text-lg font-black shadow-[4px_4px_0_#0f172a] active:translate-y-1 active:shadow-none">العب تاني ↻</button>
              <button onClick={exit} className="rounded-2xl border-4 border-slate-900 bg-white py-3 text-center text-lg font-black shadow-[4px_4px_0_#0f172a]">كل الألعاب</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Feedback({ o, next, label = 'التالي ▶' }: { o: Option; next: () => void; label?: string }) {
  return (
    <div className={`animate-fade-in space-y-3 rounded-2xl border-4 border-slate-900 p-4 font-bold shadow-[4px_4px_0_#0f172a] ${o.good ? 'bg-emerald-100' : 'bg-rose-100'}`}>
      <div>{o.good ? '✅ ' : '❌ '}{o.feedback}</div>
      <button onClick={next} className="w-full rounded-xl border-4 border-slate-900 bg-slate-900 py-3 font-black text-white active:translate-y-1">{label}</button>
    </div>
  );
}

function Confetti() {
  const colors = ['#f43f5e', '#facc15', '#22c55e', '#0ea5e9', '#a855f7'];
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <span key={i} className="absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: colors[i % 5], animation: `tp-confetti ${2 + (i % 5) * 0.4}s linear ${(i % 10) * 0.15}s forwards` }} />
      ))}
    </div>
  );
}
