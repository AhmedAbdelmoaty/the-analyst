import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TEAMS, TOOLS, TOOL_ORDER, type TeamId, type ToolId } from '../data/case';
import { stats, toolValue } from '../engine/statistics';
import { CHART_MAX, CHART_MIN, distributionBins, shortToolLabel, smoothDistributionPath } from '../presentation';

// Tool colours follow the Statistical Shenanigans analysis kit; IQR uses blue instead of the reference pink.
export const TOOL_ACCENT: Record<ToolId, string> = { mean: '#f6bd3b', median: '#42c7bd', range: '#b66fe8', sd: '#ef7f55', iqr: '#4f8fe8' };
const TEAM_SKIN: Record<TeamId, { accent: string; soft: string }> = { marwan: { accent: '#e39a18', soft: '#ffe4a2' }, mahmoud: { accent: '#249bd2', soft: '#c9edf5' } };
const LEAVE_MS = 200;

/** Keeps a just-deactivated tool mounted briefly so its overlay can play a reverse animation. */
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

function Distribution({ team, visible, leaving }: { team: TeamId; visible: ToolId[]; leaving: ToolId[] }) {
  const s = stats(team);
  const bins = distributionBins(s.values);
  const skin = TEAM_SKIN[team];
  const W = 720, H = 340, P = { left: 30, right: 30, top: 24, bottom: 48 };
  const pw = W - P.left - P.right, ph = H - P.top - P.bottom, base = P.top + ph;
  const x = (v: number) => P.left + ((Math.max(CHART_MIN, Math.min(CHART_MAX, v)) - CHART_MIN) / (CHART_MAX - CHART_MIN)) * pw;
  const maxCount = 10;
  const barH = (c: number) => (c / maxCount) * ph * 0.92;
  const shown = (id: ToolId) => visible.includes(id) || leaving.includes(id);
  const cls = (id: ToolId, kind: string) => `rd-ov rd-ov-${kind} ${leaving.includes(id) && !visible.includes(id) ? 'is-leaving' : ''}`;
  const curve = smoothDistributionPath(bins).replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) => `${(P.left + Number(a) / 100 * pw).toFixed(1)} ${(base - (100 - Number(b)) / 90 * ph * 0.92).toFixed(1)}`);
  const tag = (id: ToolId, cx: number, y: number) => <g className={cls(id, 'tag')}><rect x={cx - 52} y={y - 15} width="104" height="24" rx="7" fill="#fffdf6" stroke="#202442" strokeWidth="2" /><circle cx={cx - 38} cy={y - 3} r="5" fill={TOOL_ACCENT[id]} /><text x={cx + 6} y={y + 2} textAnchor="middle" className="rd-hist-tag">{shortToolLabel(id, team)}</text></g>;
  const marks = TOOL_ORDER.filter(id => visible.includes(id));
  return <article className="rd-game-card rd-hist-card" data-chart={team} style={{ '--team-accent': skin.accent, '--team-soft': skin.soft } as CSSProperties} aria-label={`توزيع نتائج ${TEAMS[team].name}`}>
    <header className="rd-hist-head"><div><small>نتائج الأفراد · نفس المقياس</small><h3>{TEAMS[team].name}</h3></div><span className="rd-hist-badge">10 أفراد</span></header>
    <div className="rd-hist-stage">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" dir="ltr" aria-label={`توزيع 10 أفراد من ${CHART_MIN} إلى ${CHART_MAX} بالمئة`}>
        <defs><linearGradient id={`rd-fill-${team}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={skin.accent} stopOpacity=".88" /><stop offset="100%" stopColor={skin.accent} stopOpacity=".45" /></linearGradient></defs>
        {[60, 80, 100, 120, 140, 150].map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1={P.top} y2={base} stroke="#202442" strokeOpacity=".09" strokeDasharray="4 6" /><text x={x(t)} y={H - 18} textAnchor="middle" className="rd-hist-axis">{t}%</text></g>)}
        {shown('sd') && <rect className={cls('sd', 'band')} x={x(s.mean - s.sd)} y={P.top + 34} width={Math.max(3, x(s.mean + s.sd) - x(s.mean - s.sd))} height={ph - 44} rx="12" fill={TOOL_ACCENT.sd} fillOpacity=".16" stroke={TOOL_ACCENT.sd} strokeOpacity=".75" strokeWidth="2" aria-label={`المتوسط ± الانحراف المعياري، ${toolValue('sd', team)}`} />}
        {shown('iqr') && <rect className={cls('iqr', 'band')} x={x(s.q1)} y={P.top + 48} width={Math.max(3, x(s.q3) - x(s.q1))} height={ph - 58} rx="9" fill={TOOL_ACCENT.iqr} fillOpacity=".18" stroke={TOOL_ACCENT.iqr} strokeWidth="2" strokeDasharray="6 5" aria-label={`من الربيع الأول ${s.q1}% إلى الربيع الثالث ${s.q3}%`} />}
        <line x1={P.left} x2={W - P.right} y1={base} y2={base} stroke="#202442" strokeWidth="2" />
        {bins.map((b, i) => b.count > 0 && <rect key={b.start} className="rd-hist-bar" style={{ animationDelay: `${i * 28}ms` }} x={x(b.start) + 4} y={base - barH(b.count)} width={x(b.end) - x(b.start) - 8} height={barH(b.count)} rx="5" fill={`url(#rd-fill-${team})`} stroke={skin.accent} strokeWidth="1.5" data-count={b.count}><title>{`${b.start} إلى أقل من ${b.end} بالمئة: ${b.count} أفراد`}</title></rect>)}
        <path className="rd-hist-density" d={curve} fill="none" stroke="#202442" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
        {shown('range') && <g className={cls('range', 'range')} aria-label={`المدى من ${Math.min(...s.values)}% إلى ${Math.max(...s.values)}%`}><line x1={x(Math.min(...s.values))} x2={x(Math.max(...s.values))} y1={base - 10} y2={base - 10} stroke={TOOL_ACCENT.range} strokeWidth="5" strokeLinecap="round" /><circle cx={x(Math.min(...s.values))} cy={base - 10} r="6" fill={TOOL_ACCENT.range} /><circle cx={x(Math.max(...s.values))} cy={base - 10} r="6" fill={TOOL_ACCENT.range} /></g>}
        {shown('mean') && <line className={cls('mean', 'marker')} x1={x(s.mean)} x2={x(s.mean)} y1={P.top + 22} y2={base} stroke={TOOL_ACCENT.mean} strokeWidth="4" aria-label={`المتوسط ${toolValue('mean', team)}`} />}
        {shown('median') && <line className={cls('median', 'marker')} x1={x(s.median)} x2={x(s.median)} y1={P.top + 22} y2={base} stroke={TOOL_ACCENT.median} strokeWidth="4" strokeDasharray="6 6" aria-label={`الوسيط ${toolValue('median', team)}`} />}
        {shown('mean') && tag('mean', Math.min(W - 60, Math.max(60, x(s.mean) + (s.mean >= s.median ? 54 : -54))), P.top + 6)}
        {shown('median') && tag('median', Math.min(W - 60, Math.max(60, x(s.median) + (s.mean >= s.median ? -54 : 54))), P.top + 6)}
      </svg>
    </div>
    <div className="rd-hist-metrics" aria-live="polite">{marks.map(id => <span key={id} className="rd-hist-chip" style={{ '--tool-accent': TOOL_ACCENT[id] } as CSSProperties}><i />{shortToolLabel(id, team)}</span>)}</div>
  </article>;
}

export function Workbench({ used, visible, activeTeam, onToggle, onTeam, onBack, onRecommendation, playSound }: { used: ToolId[]; visible: ToolId[]; activeTeam: TeamId; onToggle: (id: ToolId) => void; onTeam: (id: TeamId) => void; onBack: () => void; onRecommendation: () => void; playSound?: (s: 'tick' | 'click') => void }) {
  const leaving = useLeaving(visible);
  const sm = stats('marwan'), sh = stats('mahmoud');
  return <section className="rd-desk" dir="rtl">
    <header className="rd-desk-head">
      <div><p>محطة فحص البيانات</p><h2>غرفة التحليل</h2><span>شغّل أدواتك، واقرأ شكل التوزيع لكل فريق.</span></div>
      <div className="rd-desk-actions"><button className="rd-game-button rd-game-button-paper" onClick={onBack}><ArrowLeft aria-hidden="true" /> رجوع للمكاتب</button></div>
    </header>
    <section className="rd-game-card rd-desk-summary"><p>الملخّص المعلن</p><div>
      <div className="rd-headline is-amber"><b>{TEAMS.marwan.name}</b><strong>المتوسط {Math.round(sm.mean)}%</strong></div>
      <div className="rd-headline is-cyan"><b>{TEAMS.mahmoud.name}</b><strong>المتوسط {Math.round(sh.mean)}%</strong></div>
    </div></section>
    <section className="rd-game-card rd-desk-kit"><div><p>عدة المحلل</p><small>شغّل أداة لترى أثرها على الرسم.</small></div>
      <div className="rd-kit-tools" aria-label="أدوات التحليل">{TOOL_ORDER.map(id => { const on = visible.includes(id); return <button key={id} type="button" data-tool-toggle={id} aria-pressed={on} title={TOOLS[id].title} className={`rd-tool-token ${on ? 'is-active' : ''} ${used.includes(id) ? 'is-used' : ''}`} style={{ '--tool-accent': TOOL_ACCENT[id] } as CSSProperties} onClick={() => { playSound?.(on ? 'click' : 'tick'); onToggle(id); }}><span className="rd-tool-lamp" />{TOOLS[id].short}</button>; })}</div>
    </section>
    <div className="rd-mobile-team-switch">{(['marwan', 'mahmoud'] as TeamId[]).map(team => <button key={team} className={activeTeam === team ? 'active' : ''} onClick={() => onTeam(team)} aria-pressed={activeTeam === team}>{TEAMS[team].name}</button>)}</div>
    <div className="rd-distributions">{(['marwan', 'mahmoud'] as TeamId[]).map(team => <div key={team} className={activeTeam === team ? 'mobile-active' : ''}><Distribution team={team} visible={visible} leaving={leaving} /></div>)}</div>
    <div className="rd-desk-foot"><button className="rd-game-button rd-game-button-red" disabled={used.length === 0} onClick={onRecommendation}>تجهيز التوصية</button></div>
  </section>;
}
