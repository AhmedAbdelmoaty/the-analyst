import { useState } from 'react';
import { Eye, EyeOff, FileBarChart2 } from 'lucide-react';
import { TEAMS, TOOLS, TOOL_ORDER, type TeamId, type ToolId } from '../data/case';
import { stats, toolValue } from '../engine/statistics';
import { CHART_MAX, CHART_MIN, distributionBins, markerPosition, smoothDistributionPath } from '../presentation';
import { ActionButton, Panel } from './Ui';

function Distribution({ team, visible }: { team: TeamId; visible: ToolId[] }) {
  const s = stats(team);
  const bins = distributionBins(s.values);
  const [selectedBin, setSelectedBin] = useState<number | null>(null);
  const marks = visible.map(id => ({ id, title: TOOLS[id].short, value: toolValue(id, team) }));
  const rangeStart = Math.min(...s.values), rangeEnd = Math.max(...s.values);
  const band = (start: number, end: number, className: string, label: string) => <span className={`rd-chart-band ${className}`} style={{ left: `${markerPosition(start)}%`, width: `${markerPosition(end) - markerPosition(start)}%` }} aria-label={label} />;
  const line = (value: number, className: string, label: string) => <span className={`rd-chart-mark ${className}`} style={{ left: `${markerPosition(value)}%` }} aria-label={label} />;
  return <section className="rd-distribution" data-chart={team} aria-label={`توزيع نتائج ${TEAMS[team].name}`}>
    <header><span className="rd-chart-seal"><FileBarChart2 aria-hidden="true" /></span><div><small>نتائج الأفراد · نفس المقياس</small><h3>{TEAMS[team].name}</h3></div></header>
    <div className="rd-chart-shell">
      <div className="rd-chart" dir="ltr" role="group" aria-label={`توزيع 10 أفراد من ${CHART_MIN} إلى ${CHART_MAX} بالمئة`}>
        {visible.includes('sd') && band(s.mean - s.sd, s.mean + s.sd, 'rd-chart-sd', `المتوسط ± الانحراف المعياري، ${toolValue('sd', team)}`)}
        {visible.includes('iqr') && band(s.q1, s.q3, 'rd-chart-iqr', `من الربيع الأول ${s.q1}% إلى الربيع الثالث ${s.q3}%`)}
        {visible.includes('range') && band(rangeStart, rangeEnd, 'rd-chart-range', `المدى من ${rangeStart}% إلى ${rangeEnd}%`)}
        {bins.map((bin, index) => bin.count > 0 && <button key={bin.start} type="button" className="rd-chart-bar" style={{ left: `${index / bins.length * 100}%`, width: `${100 / bins.length}%`, height: `${bin.count * 9}%` }} aria-label={`${bin.start} إلى أقل من ${bin.end} بالمئة: ${bin.count} أفراد`} onClick={() => setSelectedBin(index)} title={`${bin.start}–${bin.end}% · ${bin.count} أفراد`} data-count={bin.count} />)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={smoothDistributionPath(bins)} /></svg>
        {visible.includes('mean') && line(s.mean, 'rd-chart-mean', `المتوسط ${toolValue('mean',team)}`)}
        {visible.includes('median') && line(s.median, 'rd-chart-median', `الوسيط ${toolValue('median',team)}`)}
      </div>
      <div className="rd-chart-axis" dir="ltr">{[60,80,100,120,140,150].map(value => <span key={value} style={{ left: `${markerPosition(value)}%` }}>{value}%</span>)}</div>
    </div>
    {selectedBin !== null && <p className="rd-bin-detail">من {bins[selectedBin].start}% إلى أقل من {bins[selectedBin].end}%: <b>{bins[selectedBin].count} أفراد</b></p>}
    <div className="rd-mark-values" aria-live="polite">{marks.map(mark => <span key={mark.id}><b>{mark.title}</b><em dir="ltr">{mark.value}</em></span>)}</div>
  </section>;
}

export function Workbench({ used, visible, activeTeam, onToggle, onTeam, onBack, onRecommendation }: { used: ToolId[]; visible: ToolId[]; activeTeam: TeamId; onToggle: (id: ToolId) => void; onTeam: (id: TeamId) => void; onBack: () => void; onRecommendation: () => void }) {
  return <Panel title="مكتب المحلل · شاشة التحليل" onBack={onBack}>
    <p className="rd-panel-intro">شغّل أداة، وقارن أثرها على توزيع نتائج الفريقين.</p>
    <div className="rd-tool-strip" aria-label="أدوات التحليل">{TOOL_ORDER.map(id => { const shown = visible.includes(id); return <button key={id} data-tool-toggle={id} className={shown ? 'active' : ''} onClick={() => onToggle(id)} aria-pressed={shown}><span>{TOOLS[id].short}</span>{used.includes(id) ? shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" /> : null}</button>; })}</div>
    <div className="rd-mobile-summary">{(['marwan','mahmoud'] as TeamId[]).map(team => <span key={team}><b>{TEAMS[team].name}</b><small>10 أفراد</small></span>)}</div>
    <div className="rd-mobile-team-switch">{(['marwan','mahmoud'] as TeamId[]).map(team => <button key={team} className={activeTeam === team ? 'active' : ''} onClick={() => onTeam(team)} aria-pressed={activeTeam === team}>{TEAMS[team].name}</button>)}</div>
    <div className="rd-distributions"><div className={activeTeam === 'marwan' ? 'mobile-active' : ''}><Distribution team="marwan" visible={visible} /></div><div className={activeTeam === 'mahmoud' ? 'mobile-active' : ''}><Distribution team="mahmoud" visible={visible} /></div></div>
    <p className="rd-chart-caption">الأعمدة تمثل عدد الأفراد في فئات أداء مشتركة؛ المنحنى يصل ارتفاعات الأعمدة بسلاسة.</p>
    <div className="rd-actions"><ActionButton disabled={used.length === 0} onClick={onRecommendation}>تجهيز التوصية</ActionButton></div>
  </Panel>;
}
