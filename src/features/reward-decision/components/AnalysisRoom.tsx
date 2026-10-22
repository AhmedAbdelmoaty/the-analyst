import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Calculator, FolderOpen, Hourglass, Inbox, MoveHorizontal, NotebookPen, Sigma, SquareDashed, Users } from 'lucide-react';
import { TEAMS, TOOLS, TOOL_ORDER, type TeamId, type ToolId } from '../data/case';
import { stats, toolValue } from '../engine/statistics';
import { HIST_MAX, HIST_MIN, histogramBins } from '../presentation';

/** Overlay colours deliberately avoid both team colours so no marker reads as a team hint. */
export const OVERLAY: Record<ToolId, string> = { mean: '#1f2a5a', median: '#2a8f74', range: '#8a4fd1', sd: '#e07a2e', iqr: '#3c7fd8' };
export const TOOL_ICON: Record<ToolId, typeof Calculator> = { mean: Calculator, median: BarChart3, range: MoveHorizontal, sd: Sigma, iqr: SquareDashed };
export const TOOL_HINT: Record<ToolId, string> = {
  mean: 'مجموع النتائج مقسوم على عدد الأفراد',
  median: 'النتيجة اللي في نص الترتيب',
  range: 'الفرق بين أعلى وأقل نتيجة',
  sd: 'متوسط بُعد النتائج عن المتوسط',
  iqr: 'مدى النص الأوسط من النتائج',
};
export const TEAM_SIDE: TeamId[] = ['mahmoud', 'marwan'];
const LEAVE_MS = 220;

export function formatClock(ms: number) { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

/** Counts up actual active play time; frozen while paused. */
export function CaseTimer({ read, running }: { read: () => number; running: boolean }) {
  const [ms, setMs] = useState(read);
  useEffect(() => { if (!running) return; const t = window.setInterval(() => setMs(m => Math.max(m + 1000, read())), 1000); return () => clearInterval(t); }, [running, read]);
  return <div className="rd2-timer" aria-label="وقت القضية"><Hourglass aria-hidden="true" /><b dir="ltr">{formatClock(ms)}</b><small>وقت القضية</small></div>;
}

export function RoomFrame({ kicker, title, subtitle, icon, onBack, onFile, tabs, children, className = '' }: {
  kicker: string; title: string; subtitle: string; icon: ReactNode; onBack: () => void; onFile: () => void; tabs?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={`rd2-room ${className}`} dir="rtl">
    <Props />
    <header className="rd2-top">
      <div className="rd2-title"><span className="rd2-title-icon">{icon}</span><div><small>{kicker}</small><h2>{title}</h2><p>{subtitle}</p></div></div>
      <div className="rd2-top-actions">
        <button className="rd2-btn rd2-btn-gold" onClick={onFile}><FolderOpen aria-hidden="true" />ملف القضية</button>
        <button className="rd2-btn rd2-btn-gold" onClick={onBack}>رجوع للمكتب<ArrowLeft aria-hidden="true" /></button>
      </div>
      {tabs}
    </header>
    {children}
  </section>;
}

export function RoomTabs({ active, onCharts, onNotebook, notebookLocked }: { active: 'charts' | 'notebook'; onCharts: () => void; onNotebook: () => void; notebookLocked?: boolean }) {
  return <nav className="rd2-tabs" aria-label="أقسام غرفة التحليل">
    <button className={active === 'charts' ? 'is-on' : ''} aria-current={active === 'charts' ? 'page' : undefined} onClick={onCharts}><BarChart3 aria-hidden="true" />لوحة التوزيعات</button>
    <button className={active === 'notebook' ? 'is-on' : ''} aria-current={active === 'notebook' ? 'page' : undefined} disabled={notebookLocked} onClick={onNotebook}><NotebookPen aria-hidden="true" />دفتر الاستنتاجات</button>
  </nav>;
}

/** Decorative desk props (pure SVG/CSS, no data, aria-hidden). */
function Props() {
  return <div className="rd2-props" aria-hidden="true">
    <span className="rd2-note rd2-note-a"><svg viewBox="0 0 60 44"><rect x="8" y="22" width="8" height="16" /><rect x="22" y="12" width="8" height="26" /><rect x="36" y="4" width="8" height="34" /></svg></span>
    <span className="rd2-note rd2-note-b"><svg viewBox="0 0 60 44"><polyline points="4,36 18,24 30,30 46,10 56,14" fill="none" strokeWidth="3" /></svg></span>
    <span className="rd2-books"><i>البيانات</i><i>التحليل</i><i>الاستنتاج</i></span>
    <span className="rd2-lens" />
    <span className="rd2-mug" />
    <span className="rd2-papers" />
  </div>;
}

function useLeaving(visible: ToolId[]) {
  const prev = useRef<ToolId[]>(visible);
  const [leaving, setLeaving] = useState<ToolId[]>([]);
  useEffect(() => {
    const gone = prev.current.filter(id => !visible.includes(id));
    prev.current = visible;
    if (!gone.length) { setLeaving(l => l.filter(id => !visible.includes(id))); return; }
    setLeaving(l => [...l.filter(id => !visible.includes(id)), ...gone]);
    const t = window.setTimeout(() => setLeaving(l => l.filter(id => !gone.includes(id))), LEAVE_MS);
    return () => clearTimeout(t);
  }, [visible]);
  return leaving;
}

/** Histogram of the actual employee records. No smoothing, density or illustrative bars. */
export function Histogram({ team, visible, leaving = [], compact = false, animateIn = true }: { team: TeamId; visible: ToolId[]; leaving?: ToolId[]; compact?: boolean; animateIn?: boolean }) {
  const s = stats(team);
  const bins = histogramBins(s.values);
  const W = 640, H = compact ? 190 : 300, P = { left: 46, right: 16, top: compact ? 30 : 42, bottom: 44 };
  const pw = W - P.left - P.right, ph = H - P.top - P.bottom, base = P.top + ph, Y_MAX = 5;
  const x = (v: number) => P.left + ((Math.max(HIST_MIN, Math.min(HIST_MAX, v)) - HIST_MIN) / (HIST_MAX - HIST_MIN)) * pw;
  const y = (c: number) => base - (c / Y_MAX) * ph;
  const on = (id: ToolId) => visible.includes(id) || leaving.includes(id);
  const cls = (id: ToolId) => `rd2-ov ${leaving.includes(id) && !visible.includes(id) ? 'is-leaving' : ''}`;
  const min = Math.min(...s.values), max = Math.max(...s.values);
  const label = (id: ToolId, value: number, dx: number) => { const cx = Math.min(W - 70, Math.max(P.left + 60, x(value) + dx)); const dy = 0; return <g className={cls(id)}><text x={cx} y={P.top - 22 + dy} textAnchor="middle" className="rd2-ov-name" fill={OVERLAY[id]}>{TOOLS[id].title}</text><text x={cx} y={P.top - 8 + dy} textAnchor="middle" className="rd2-ov-val" fill={OVERLAY[id]}>{toolValue(id, team).replace(' نقطة مئوية', '')}</text></g>; };
  const meanFirst = s.mean > s.median || (s.mean === s.median);
  const close = on('mean') && on('median') && Math.abs(x(s.mean) - x(s.median)) < 110;
  return <div className={`rd2-hist rd2-hist-${team}`} dir="ltr">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`توزيع نتائج ${TEAMS[team].name}: ${s.values.join('، ')} بالمئة`}>
      <defs><linearGradient id={`rd2-bar-${team}${compact ? '-c' : ''}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" className="rd2-bar-top" /><stop offset="100%" className="rd2-bar-bottom" /></linearGradient></defs>
      {[0, 1, 2, 3, 4, 5].map(c => <g key={c}><line x1={P.left} x2={W - P.right} y1={y(c)} y2={y(c)} className="rd2-grid" /><text x={P.left - 10} y={y(c) + 4} textAnchor="end" className="rd2-axis">{c}</text></g>)}
      {[70, 90, 110, 130, 150].map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1={P.top} y2={base} className="rd2-grid rd2-grid-v" /><text x={x(t)} y={base + 18} textAnchor="middle" className="rd2-axis">{t}%</text></g>)}
      <text x={W / 2} y={H - 6} textAnchor="middle" className="rd2-axis-title">الأداء (%)</text>
      {!compact && <text x={14} y={P.top + ph / 2} textAnchor="middle" className="rd2-axis-title" transform={`rotate(-90 14 ${P.top + ph / 2})`}>عدد المندوبين</text>}
      {on('sd') && <rect className={cls('sd')} x={x(s.mean - s.sd)} y={P.top + 6} width={Math.max(3, x(s.mean + s.sd) - x(s.mean - s.sd))} height={ph - 6} rx="8" fill={OVERLAY.sd} fillOpacity=".13" stroke={OVERLAY.sd} strokeWidth="2" strokeDasharray="3 4"><title>{`المتوسط ± الانحراف المعياري (${s.sd.toFixed(1)})`}</title></rect>}
      {on('iqr') && <rect className={cls('iqr')} x={x(s.q1)} y={P.top + 16} width={Math.max(4, x(s.q3) - x(s.q1))} height={ph - 16} rx="6" fill={OVERLAY.iqr} fillOpacity=".16" stroke={OVERLAY.iqr} strokeWidth="2.5"><title>{`من الربيع الأول ${s.q1}% إلى الربيع الثالث ${s.q3}%`}</title></rect>}
      <line x1={P.left} x2={W - P.right} y1={base} y2={base} className="rd2-baseline" />
      {bins.map((b, i) => b.count > 0 && <rect key={b.start} className={`rd2-bar ${animateIn ? 'is-in' : ''}`} style={{ animationDelay: `${i * 14}ms`, transformOrigin: `${x(b.start)}px ${base}px` } as CSSProperties} x={x(b.start) + 1} y={y(b.count)} width={Math.max(3, x(b.end) - x(b.start) - 2)} height={base - y(b.count)} rx="2" fill={`url(#rd2-bar-${team}${compact ? '-c' : ''})`} data-count={b.count}><title>{`${b.start}–${b.end}%: ${b.count} ${b.count === 1 ? 'مندوب' : 'مندوبين'}`}</title></rect>)}
      {on('range') && <g className={cls('range')}><line x1={x(min)} x2={x(max)} y1={base - 12} y2={base - 12} stroke={OVERLAY.range} strokeWidth="4" strokeLinecap="round" /><line x1={x(min)} x2={x(min)} y1={base - 20} y2={base - 4} stroke={OVERLAY.range} strokeWidth="3" /><line x1={x(max)} x2={x(max)} y1={base - 20} y2={base - 4} stroke={OVERLAY.range} strokeWidth="3" /><text x={(x(min) + x(max)) / 2} y={base - 18} textAnchor="middle" className="rd2-ov-val" fill={OVERLAY.range}>{`${TOOLS.range.title} ${s.range}`}</text></g>}
      {on('mean') && <line className={cls('mean')} x1={x(s.mean)} x2={x(s.mean)} y1={P.top} y2={base} stroke={OVERLAY.mean} strokeWidth="2.5" strokeDasharray="6 4" />}
      {on('median') && <line className={cls('median')} x1={x(s.median)} x2={x(s.median)} y1={P.top} y2={base} stroke={OVERLAY.median} strokeWidth="2.5" strokeDasharray="6 4" />}
      {on('mean') && label('mean', s.mean, close ? (meanFirst ? 52 : -52) : 0)}
      {on('median') && label('median', s.median, close ? (meanFirst ? -52 : 52) : 0)}
    </svg>
  </div>;
}

export function TeamPanel({ team, visible, leaving }: { team: TeamId; visible: ToolId[]; leaving: ToolId[] }) {
  return <motion.article className={`rd2-team rd2-team-${team}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay: team === 'mahmoud' ? .05 : .15 }}>
    <header><span className="rd2-team-icon" aria-hidden="true"><Users /></span><h3>{TEAMS[team].name}</h3><span className="rd2-count">10 مندوبين</span></header>
    <div className="rd2-team-chart"><Histogram team={team} visible={visible} leaving={leaving} /></div>
    {visible.length > 0 && <footer className="rd2-team-values" aria-live="polite">{TOOL_ORDER.filter(t => visible.includes(t)).map(t => <span key={t} style={{ '--ov': OVERLAY[t] } as CSSProperties}><i />{TOOLS[t].title}: <b dir="ltr">{toolValue(t, team).replace(' نقطة مئوية', '')}</b></span>)}</footer>}
  </motion.article>;
}

/** Analysis Room chart board (Reference 1). */
export function ChartBoard({ ready, used, visible, active, onToggle, onBack, playSound }: { ready: boolean; used: ToolId[]; visible: ToolId[]; active: ToolId | null; onToggle: (id: ToolId) => void; onBack: () => void; playSound?: (s: 'tick' | 'click') => void }) {
  const leaving = useLeaving(visible);
  if (!ready) return <div className="rd2-board rd2-empty" data-testid="rd-workbench-empty">
    <Inbox aria-hidden="true" /><h3>لسه بيانات المبيعات ما وصلتش لملف التحليل.</h3>
    <button className="rd2-btn rd2-btn-gold" onClick={onBack}>رجوع للممر<ArrowLeft aria-hidden="true" /></button>
  </div>;
  const shownActive = active && visible.includes(active) ? active : null;
  const ActiveIcon = shownActive ? TOOL_ICON[shownActive] : Calculator;
  return <div className="rd2-board" data-testid="rd-workbench">
    <p className="rd2-instruction">البيانات قدامك. شغّل أدواتك، وقارن النتائج، وسجّل اللي وصلت له في دفتر الاستنتاجات.</p>
    <motion.section className="rd2-summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <span className="rd2-ribbon">المقياس النشط</span>
      <div className="rd2-summary-tool"><span className="rd2-summary-icon"><ActiveIcon aria-hidden="true" /></span><div><b>{shownActive ? TOOLS[shownActive].title : 'اختار أداة'}</b><small>{shownActive ? TOOL_HINT[shownActive] : 'شغّل أداة عشان تشوف قيمتها للفريقين.'}</small></div></div>
      {TEAM_SIDE.map(team => <div key={team} className={`rd2-summary-team rd2-tint-${team}`}><span className="rd2-team-icon" aria-hidden="true"><Users /></span><div><small>{TEAMS[team].name}</small><motion.b key={`${shownActive}-${team}`} initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} dir="ltr">{shownActive ? toolValue(shownActive, team).replace(' نقطة مئوية', '') : '—'}</motion.b></div></div>)}
    </motion.section>
    <div className="rd2-tools" role="group" aria-label="أدوات التحليل">{TOOL_ORDER.map((id, i) => { const isOn = visible.includes(id); const Icon = TOOL_ICON[id]; return <motion.button key={id} type="button" data-tool-toggle={id} aria-pressed={isOn} className={`rd2-tool ${isOn ? 'is-on' : ''} ${used.includes(id) ? 'is-used' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .04 * i }} whileTap={{ scale: .94, y: 2 }} onClick={() => { playSound?.(isOn ? 'click' : 'tick'); onToggle(id); }}><Icon aria-hidden="true" />{TOOLS[id].title}</motion.button>; })}</div>
    <div className="rd2-teams">{TEAM_SIDE.map(team => <TeamPanel key={team} team={team} visible={visible} leaving={leaving} />)}</div>
  </div>;
}
