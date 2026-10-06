import { Eye, EyeOff } from 'lucide-react';
import type { CSSProperties } from 'react';
import { TEAMS, TOOLS, TOOL_ORDER, type TeamId, type ToolId } from '../data/case';
import { toolValue } from '../engine/statistics';
import { ActionButton, Panel } from './Ui';

const bars: Record<TeamId, number[]> = { marwan:[22,30,24,34,27,20,14,17,25,45], mahmoud:[4,7,15,34,58,76,58,34,15,7] };
function Distribution({team}:{team:TeamId}) { const points=bars[team].map((h,i)=>`${i*11+2},${82-h}`).join(' '); return <div className="rd-distribution" data-chart={team}><header><b>{TEAMS[team].name}</b><small>تصوّر توضيحي للتوزيع</small></header><div className="rd-chart" aria-label={`تصور توزيع ${TEAMS[team].name}`}>{bars[team].map((h,i)=><span key={i} style={{'--bar-height':`${h}%`} as CSSProperties}/>) }<svg viewBox="0 0 102 88" preserveAspectRatio="none" aria-hidden="true"><polyline points={points}/></svg></div></div>; }
export function Workbench({ used, visible, activeTeam, onToggle, onTeam, onBack, onRecommendation }: { used:ToolId[]; visible:ToolId[]; activeTeam:TeamId; onToggle:(id:ToolId)=>void; onTeam:(id:TeamId)=>void; onBack:()=>void; onRecommendation:()=>void }) {
 return <Panel title="مكتب المحلل · شاشة التحليل" onBack={onBack}>
  <div className="rd-tool-strip">{TOOL_ORDER.map(id=>{const shown=visible.includes(id);return <button key={id} data-tool-toggle={id} className={shown?'active':''} onClick={()=>onToggle(id)} aria-pressed={shown}><span>{TOOLS[id].short}</span>{used.includes(id)?shown?<EyeOff/>:<Eye/>:null}</button>})}</div>
  <div className="rd-mobile-team-switch">{(['marwan','mahmoud'] as TeamId[]).map(t=><button key={t} className={activeTeam===t?'active':''} onClick={()=>onTeam(t)}>{TEAMS[t].name}</button>)}</div>
  <div className="rd-distributions"><div className={activeTeam==='marwan'?'mobile-active':''}><Distribution team="marwan"/></div><div className={activeTeam==='mahmoud'?'mobile-active':''}><Distribution team="mahmoud"/></div></div>
  {used.length>0&&<div className="rd-comparison-table" data-testid="comparison-values"><div/><b>{TEAMS.marwan.name}</b><b>{TEAMS.mahmoud.name}</b>{used.map(id=><><strong key={`${id}-l`}>{TOOLS[id].short}</strong><span key={`${id}-m`}>{toolValue(id,'marwan')}</span><span key={`${id}-b`}>{toolValue(id,'mahmoud')}</span></>)}</div>}
  <div className="rd-actions"><ActionButton disabled={used.length===0} onClick={onRecommendation}>تجهيز التوصية</ActionButton></div>
 </Panel>;
}