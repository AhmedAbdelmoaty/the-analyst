import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import analyst from './assets/analyst.png.asset.json';
import manager from './assets/manager.png.asset.json';

type Phase = 'intro' | 'advice' | 'confirm' | 'report' | 'decision' | 'result';
type Outcome = 'correct' | 'premature' | 'aggregate' | null;
type Team = 'A' | 'B';
type Advice = 'monitor' | 'training' | 'replace' | 'data';
const data = {
  A: { total: [80, 100], easy: [72, 80], hard: [8, 20] },
  B: { total: [59, 100], easy: [19, 20], hard: [40, 80] },
} as const;
const advice: { id: Advice; text: string; icon: string }[] = [
  { id: 'monitor', text: 'نزود متابعة الموظفين', icon: '👀' },
  { id: 'training', text: 'نوفر لهم تدريب إضافي', icon: '📚' },
  { id: 'replace', text: 'نستبدل الموظفين الأقل أداءً', icon: '🔄' },
  { id: 'data', text: 'نطلب بيانات أكتر', icon: '📂' },
];
const rate = ([done, all]: readonly [number, number]) => Math.round(done / all * 100);
function play(name: 'click' | 'page-turn' | 'win' | 'lose' | 'woosh' | 'confettipop', muted: boolean) {
  if (muted) return;
  const sound = new Audio(`/investigation-file/audio/${name}.mp3`);
  sound.volume = 0.6;
  void sound.play().catch(() => {});
}
function Speech({ who, image, children }: { who: string; image: string; children: React.ReactNode }) {
  return <div className="tp-speech flex items-end gap-2 sm:gap-4">
    <img src={image} alt={who} className="tp-character h-28 w-24 shrink-0 object-contain object-bottom drop-shadow-xl min-[380px]:h-36 min-[380px]:w-28 sm:h-52 sm:w-40" />
    <div className="tp-bubble mb-2 min-w-0 flex-1 rounded-2xl border-[3px] border-slate-900 bg-white p-3 text-sm font-bold leading-relaxed shadow-[4px_4px_0_#0f172a] sm:mb-5 sm:p-5 sm:text-lg">
      <div className="mb-1 text-xs font-black text-rose-600">{who}</div>{children}
    </div>
  </div>;
}
function Action({ children, onClick, tone = 'yellow', disabled = false, picked = false }: { children: React.ReactNode; onClick: () => void; tone?: 'yellow' | 'sky' | 'rose' | 'white'; disabled?: boolean; picked?: boolean }) {
  const color = { yellow: 'bg-yellow-400', sky: 'bg-sky-400', rose: 'bg-rose-400', white: 'bg-white' }[tone];
  return <button type="button" disabled={disabled} onClick={onClick} className={`tp-action min-h-12 w-full rounded-xl border-[3px] border-slate-900 px-3 py-2.5 text-center text-sm font-black text-slate-900 shadow-[4px_4px_0_#0f172a] sm:text-lg ${picked ? 'tp-picked' : ''} ${color}`}>{children}</button>;
}
function Report() {
  return <div className="tp-report rounded-2xl border-4 border-slate-900 bg-[#fffdf5] p-3 shadow-[6px_7px_0_#0f172a] sm:p-5" aria-label="تقرير المهام التفصيلي">
    <h2 className="mb-3 border-b-2 border-dashed border-slate-400 pb-2 text-lg font-black sm:text-xl">📋 تفاصيل تقرير الفريقين</h2>
    <div className="grid gap-3 sm:grid-cols-2">{(['easy', 'hard'] as const).map(level => <section key={level} className="rounded-xl border-2 border-slate-800 bg-white p-3">
      <h3 className="mb-2 text-center font-black">{level === 'easy' ? 'المهام السهلة' : 'المهام الصعبة'}</h3>
      <div className="grid grid-cols-2 gap-2">{(['A', 'B'] as const).map(team => {
        const numbers = data[team][level];
        return <div key={team} className="rounded-lg border-2 border-slate-300 bg-slate-50 p-2 text-center">
          <div className="text-sm font-black">فريق {team === 'A' ? 'أ' : 'ب'}</div>
          <div className="text-lg font-black tabular-nums">{numbers[0]} / {numbers[1]}</div>
          <div className="text-sm font-bold tabular-nums text-slate-600">{rate(numbers)}%</div>
        </div>;
      })}</div>
    </section>)}</div>
  </div>;
}
function Confetti() {
  const colors = ['#f43f5e', '#facc15', '#22c55e', '#0ea5e9', '#a855f7'];
  return <div aria-hidden="true" className="tp-confetti pointer-events-none fixed inset-0 z-20 overflow-hidden">{Array.from({ length: 26 }, (_, i) =>
    <span key={i} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 8) * 65}ms`, animationDuration: `${1.2 + (i % 4) * 0.2}s` }} />)}</div>;
}
export default function TeamPerformanceGame() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [selected, setSelected] = useState<Advice | Team | null>(null);
  const [recommendation, setRecommendation] = useState<Advice | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('tp-muted') === '1');
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { localStorage.setItem('tp-muted', muted ? '1' : '0'); }, [muted]);
  useEffect(() => { top.current?.scrollTo({ top: 0, behavior: 'instant' }); }, [phase]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const go = (next: Phase) => { play(next === 'report' ? 'page-turn' : 'woosh', muted); setSelected(null); setPhase(next); };
  const chooseAdvice = (choice: Advice) => {
    if (selected) return;
    setSelected(choice); play('click', muted);
    timer.current = setTimeout(() => {
      if (choice === 'data') go('report');
      else { setRecommendation(choice); go('confirm'); }
    }, 160);
  };
  const finish = (result: Exclude<Outcome, null>) => {
    setOutcome(result); setPhase('result'); play(result === 'correct' ? 'win' : 'lose', muted);
    if (result === 'correct') timer.current = setTimeout(() => play('confettipop', muted), 250);
  };
  const chooseTeam = (team: Team) => {
    if (selected) return;
    setSelected(team); play('click', muted);
    timer.current = setTimeout(() => finish(team === 'B' ? 'correct' : 'aggregate'), 170);
  };
  const restart = () => {
    if (timer.current) clearTimeout(timer.current);
    play('woosh', muted); setSelected(null); setRecommendation(null); setOutcome(null);
    setRound(value => value + 1); setPhase('intro');
  };
  return <div ref={top} dir="rtl" className="h-full w-full overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top,#fef3c7,#fde68a_45%,#fb923c)] font-[Cairo,sans-serif] text-slate-900">
    <style>{`
      @keyframes tp-enter{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes tp-pop{0%{opacity:0;transform:translateY(24px) scale(.75)}65%{opacity:1;transform:translateY(-5px) scale(1.06)}100%{transform:translateY(0) scale(1)}}
      @keyframes tp-paper{from{opacity:0;transform:perspective(900px) rotateX(-22deg) translateY(-14px)}to{opacity:1;transform:perspective(900px) rotateX(0) translateY(0)}}
      @keyframes tp-cheer{0%,100%{transform:rotate(-7deg) scale(1)}50%{transform:rotate(8deg) scale(1.16)}}
      @keyframes tp-oops{0%,100%{transform:rotate(0)}30%{transform:rotate(-12deg)}70%{transform:rotate(9deg)}}
      @keyframes tp-fall{to{transform:translateY(100vh) rotate(500deg);opacity:0}}
      .tp-scene{animation:tp-enter .22s ease-out both}.tp-character{animation:tp-pop .42s cubic-bezier(.2,.8,.25,1.2) both}.tp-bubble{animation:tp-enter .3s .1s ease-out both}.tp-report{animation:tp-paper .38s ease-out both}
      .tp-action{transition:transform .15s,box-shadow .15s,filter .15s}.tp-action:not(:disabled):hover{transform:translateY(-2px);filter:brightness(1.04)}.tp-action:not(:disabled):active,.tp-picked{transform:translate(3px,3px) scale(.98);box-shadow:1px 1px 0 #0f172a}.tp-action:focus-visible{outline:3px solid #0369a1;outline-offset:3px}
      .tp-cheer{animation:tp-cheer .55s 3}.tp-oops{animation:tp-oops .48s 2}.tp-confetti span{animation:tp-fall 1.5s ease-in forwards}
      @media (prefers-reduced-motion:reduce){.tp-scene,.tp-character,.tp-bubble,.tp-report,.tp-cheer,.tp-oops,.tp-confetti span{animation:none!important}.tp-action{transition:none!important}}
    `}</style>
    <header className="sticky top-0 z-10 flex min-h-12 items-center gap-2 border-b-4 border-slate-900 bg-slate-900 px-3 py-1.5 text-white">
      <Link to="/app" aria-label="مركز الألعاب" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-lg hover:bg-white/20">🏠</Link>
      <strong className="min-w-0 flex-1 truncate text-center text-sm sm:text-lg">⚡ أداء الفريق</strong>
      <button type="button" onClick={() => setMuted(value => !value)} aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-lg">{muted ? '🔇' : '🔊'}</button>
    </header>
    <main key={`${round}-${phase}`} className="tp-scene mx-auto max-w-2xl space-y-4 p-3 pb-10 sm:space-y-5 sm:p-6">
      {phase === 'intro' && <>
        <Speech who="الأستاذ شريف — المدير" image={manager.url}>تقرير الشهر وصل! فريق أ خلّص 80 من 100 مهمة، وفريق ب خلّص 59 من 100. بص معايا على النتيجة قبل ما نقرر نعمل إيه.</Speech>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">{(['A', 'B'] as const).map(team => <div key={team} className="rounded-xl border-[3px] border-slate-900 bg-white p-3 text-center shadow-[4px_4px_0_#0f172a]">
          <div className="text-sm font-black">فريق {team === 'A' ? 'أ' : 'ب'}</div><div className="text-4xl font-black tabular-nums text-sky-700 sm:text-5xl">{rate(data[team].total)}%</div><div className="text-xs font-bold text-slate-600">معدل الإكمال الإجمالي</div>
        </div>)}</div>
        <Action onClick={() => go('advice')} tone="rose">شوف التوصيات ←</Action>
      </>}
      {phase === 'advice' && <>
        <Speech who="الأستاذ شريف" image={manager.url}>قدامنا 4 توصيات. شايف نبدأ بإيه؟</Speech>
        <div className="grid gap-2.5">{advice.map(item => <Action key={item.id} disabled={!!selected} picked={selected === item.id} onClick={() => chooseAdvice(item.id)} tone="white">{item.icon} {item.text}</Action>)}</div>
      </>}
      {phase === 'confirm' && <>
        <Speech who="الأستاذ شريف" image={manager.url}>تمام، هنمشي بالتوصية دي. بس هنثبت القرار من غير ما نراجع تفاصيل الشغل؟</Speech>
        <div className="rounded-xl border-[3px] border-slate-900 bg-white p-3 text-center font-black shadow-[4px_4px_0_#0f172a]">{advice.find(item => item.id === recommendation)?.icon} {advice.find(item => item.id === recommendation)?.text}</div>
        <div className="grid gap-3 sm:grid-cols-2"><Action onClick={() => go('report')} tone="sky">راجع البيانات الأول 📂</Action><Action onClick={() => finish('premature')} tone="rose">اعتمد القرار</Action></div>
      </>}
      {phase === 'report' && <>
        <Speech who="أنت — المحلل" image={analyst.url}>فتحنا الملف التفصيلي. دي أعداد المهام ومعدلات إكمالها حسب صعوبتها.</Speech>
        <Report /><Action onClick={() => go('decision')} tone="sky">اتخذ القرار ←</Action>
      </>}
      {phase === 'decision' && <>
        <Report /><Speech who="الأستاذ شريف" image={manager.url}>بعد مراجعة التفاصيل، مين الفريق اللي حقق معدل إكمال أعلى داخل كل مستوى صعوبة؟</Speech>
        <div className="grid grid-cols-2 gap-3"><Action disabled={!!selected} picked={selected === 'A'} onClick={() => chooseTeam('A')} tone="white">فريق أ</Action><Action disabled={!!selected} picked={selected === 'B'} onClick={() => chooseTeam('B')} tone="white">فريق ب</Action></div>
      </>}
      {phase === 'result' && <>
        {outcome === 'correct' && <Confetti />}
        <div className={`rounded-2xl border-4 border-slate-900 p-4 text-center shadow-[6px_6px_0_#0f172a] ${outcome === 'correct' ? 'bg-emerald-300' : 'bg-rose-300'}`}>
          <div className={`inline-block text-5xl ${outcome === 'correct' ? 'tp-cheer' : 'tp-oops'}`}>{outcome === 'correct' ? '🎉' : '😮'}</div>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{outcome === 'correct' ? 'قرار ممتاز!' : 'استنى لحظة… القرار اتسرّع'}</h1>
        </div>
        <Speech who={outcome === 'correct' ? 'الأستاذ شريف' : 'أنت — المحلل'} image={outcome === 'correct' ? manager.url : analyst.url}>
          {outcome === 'correct' ? 'برافو! فريق ب حقق معدل إكمال أعلى في السهل والصعب، رغم إن معدله الإجمالي أقل.' : outcome === 'premature' ? 'اعتمدنا توصية من الرقم الإجمالي وحده، من غير دليل كفاية. التفاصيل بتوضح إن فريق ب أعلى في السهل والصعب.' : 'الإجمالي وحده ضللنا. فريق ب حقق معدل إكمال أعلى في السهل والصعب، رغم إن إجماليه أقل.'}
        </Speech>
        <div className="rounded-xl border-[3px] border-slate-900 bg-white p-4 font-bold leading-relaxed shadow-[4px_4px_0_#0f172a]">
          <h2 className="mb-1 text-lg font-black">💡 مفارقة سيمبسون</h2>
          <p>فريق أ أنجز 72/80 من السهل (90%) و8/20 من الصعب (40%). فريق ب أنجز 19/20 من السهل (95%) و40/80 من الصعب (50%). توزيع المهام مختلف: فريق ب عنده مهام صعبة أكتر، فظهر إجماليه أقل رغم تفوقه داخل كل مستوى.</p>
        </div>
        <div className="grid grid-cols-2 gap-3"><Action onClick={restart}>العب تاني ↻</Action><Link to="/app" className="tp-action flex min-h-12 items-center justify-center rounded-xl border-[3px] border-slate-900 bg-white px-2 py-2.5 text-center text-sm font-black shadow-[4px_4px_0_#0f172a] sm:text-lg">مركز الألعاب</Link></div>
      </>}
    </main>
  </div>;
}
