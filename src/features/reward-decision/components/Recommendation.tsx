import { ARGUMENTS, DOCUMENTS, TEAMS, type ArgumentId, type DocumentId, type TeamId, type ToolId } from '../data/case';
import type { DraftReport } from '../engine/model';
import { ActionButton, Panel } from './Ui';
export function Recommendation({draft,docs,tools,onChange,onSubmit,onBack}:{draft:DraftReport;docs:DocumentId[];tools:ToolId[];onChange:(d:DraftReport)=>void;onSubmit:()=>void;onBack:()=>void}){
 const options=(Object.entries(ARGUMENTS) as [ArgumentId,typeof ARGUMENTS[ArgumentId]][]).filter(([,a])=>(!a.tool||tools.includes(a.tool))&&(!a.document||docs.includes(a.document)));
 const complete=Boolean(draft.teamId&&draft.documentId&&draft.arguments[0]&&draft.arguments[1]);
 return <Panel title="لوحة التوصية" onBack={onBack}><div className="rd-recommendation-board">
  <section><span>1</span><h3>الفريق المرشح</h3><div className="rd-team-pick">{(['marwan','mahmoud'] as TeamId[]).map(t=><button data-team={t} className={draft.teamId===t?'selected':''} onClick={()=>onChange({...draft,teamId:t})} key={t}>{TEAMS[t].name}</button>)}</div></section>
  <section><span>2</span><h3>المستند المرجعي</h3><select aria-label="المستند المرجعي" value={draft.documentId??''} onChange={e=>onChange({...draft,documentId:e.target.value as DocumentId})}><option value="">اختر مستندًا</option>{docs.map(id=><option key={id} value={id}>{DOCUMENTS[id].title}</option>)}</select></section>
  <section><span>3</span><h3>الحجتان التحليليتان</h3>{[0,1].map(i=><select key={i} aria-label={`الحجة ${i+1}`} value={draft.arguments[i]??''} onChange={e=>{const args=[...draft.arguments] as DraftReport['arguments'];args[i]=e.target.value as ArgumentId;onChange({...draft,arguments:args})}}><option value="">اختر الحجة {i+1}</option>{options.map(([id,a])=><option key={id} value={id}>{a.text}</option>)}</select>)}</section>
 </div><div className="rd-actions"><ActionButton disabled={!complete} onClick={onSubmit}>تقديم التوصية</ActionButton></div></Panel>;
}