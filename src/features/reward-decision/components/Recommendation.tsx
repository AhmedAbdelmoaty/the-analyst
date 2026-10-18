import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { ARGUMENTS, DOCUMENTS, TEAMS, type ArgumentId, type DocumentId, type TeamId, type ToolId } from '../data/case';
import type { DraftReport } from '../engine/model';
import { ActionButton } from './Ui';

function Lane({number,title,children}:{number:number;title:string;children:ReactNode}) { return <section className="rd-argument-lane"><header><span>{number}</span><h3>{title}</h3></header>{children}</section>; }
/** Composition and card interactions adapted from Statistical Shenanigans Boardroom. */
export function Recommendation({ draft, docs, tools, onChange, onSubmit, onBack, playSound }: { draft: DraftReport; docs: DocumentId[]; tools: ToolId[]; onChange: (draft: DraftReport) => void; onSubmit: () => void; onBack: () => void; playSound?: (type:'pageFlip'|'collect'|'click')=>void }) {
  const [slot, setSlot] = useState<0 | 1>(0);
  const [confirming,setConfirming] = useState(false);
  const options = (Object.entries(ARGUMENTS) as [ArgumentId, typeof ARGUMENTS[ArgumentId]][]).filter(([, argument]) => (!argument.tool || tools.includes(argument.tool)) && (!argument.document || docs.includes(argument.document)));
  const readiness = Number(Boolean(draft.teamId))+Number(Boolean(draft.documentId))+draft.arguments.filter(Boolean).length;
  const complete = readiness === 4;
  const setArgument = (id: ArgumentId | null, index: 0 | 1) => { const args = [...draft.arguments] as DraftReport['arguments']; args[index] = id; onChange({ ...draft, arguments: args }); playSound?.(id?'collect':'click'); };
  return <section className="rd-boardroom">
    <header className="rd-boardroom-header rd-game-card"><div><small>THE ANALYST · شركة روّاد</small><h2>طاولة التوصية</h2><p>رتّب ما وصلت إليه قبل الاجتماع.</p></div><ActionButton variant="secondary" onClick={onBack}><ArrowLeft/>رجوع</ActionButton></header>
    <div className="rd-argument-board rd-game-card">
      <div className="rd-argument-board-topline"><h3>لوحة العرض</h3><div className="rd-argument-readiness" role="meter" aria-label="جاهزية العرض" aria-valuemin={0} aria-valuemax={4} aria-valuenow={readiness}><span>جاهزية العرض</span><div>{Array.from({length:4},(_,i)=><i key={i} className={i<readiness?'is-filled':''}/>)}</div></div></div>
      <div className="rd-argument-board-grid">
        <Lane number={1} title="الفريق المرشح"><div className="rd-decision-teams">{(['marwan','mahmoud'] as TeamId[]).map(team => <ActionButton variant="quiet" data-team={team} className={`rd-team-decision-card ${draft.teamId===team?'is-selected':''}`} aria-pressed={draft.teamId===team} onClick={()=>{onChange({...draft,teamId:team});playSound?.('pageFlip');}} key={team}><i className="rd-team-decision-pin"/><small>بطاقة فريق</small><strong>{TEAMS[team].name}</strong><em>المتوسط المعلن {team==='marwan'?'95':'88'}%</em></ActionButton>)}</div></Lane>
        <Lane number={2} title="المستند المرجعي"><div className="rd-decision-documents">{docs.map(id=><ActionButton variant="quiet" data-document-pick={id} key={id} className={`rd-argument-evidence-card ${draft.documentId===id?'is-selected':''}`} aria-pressed={draft.documentId===id} onClick={()=>{onChange({...draft,documentId:draft.documentId===id?null:id});playSound?.('pageFlip');}}><i className="rd-argument-evidence-clip"/><span><strong>{DOCUMENTS[id].title}</strong><small>{DOCUMENTS[id].source}</small></span><b>{draft.documentId===id?'مثبّت':'اختيار'}</b></ActionButton>)}</div>{!docs.length&&<p className="rd-argument-empty">اجمع المستندات من المكاتب أولًا.</p>}</Lane>
        <Lane number={3} title="حجتان تحليليتان"><div className="rd-decision-slots">{([0,1] as const).map(index=><motion.div layout key={index} className={`rd-decision-slot ${slot===index?'is-active':''}`}><ActionButton variant="quiet" className="rd-decision-slot-select" aria-label={`الحجة ${index+1}`} onClick={()=>setSlot(index)} aria-pressed={slot===index}><small>الحجة {index+1}</small><span>{draft.arguments[index]?ARGUMENTS[draft.arguments[index]].text:'اختَر حجة من البطاقات'}</span></ActionButton>{draft.arguments[index]&&<ActionButton variant="quiet" className="rd-decision-slot-remove" aria-label={`إزالة الحجة ${index+1}`} onClick={()=>setArgument(null,index)}><X/></ActionButton>}</motion.div>)}</div>
          <div className="rd-decision-options" aria-label={`بطاقات الحجة ${slot+1}`}>{options.map(([id,argument])=><ActionButton variant="quiet" data-argument-pick={id} key={id} className={`rd-argument-insight-card ${draft.arguments[slot]===id?'is-selected':''}`} data-tool={argument.tool??'document'} onClick={()=>setArgument(id,slot)} aria-pressed={draft.arguments[slot]===id}><i className="rd-argument-insight-mark"/><span><strong>{argument.text}</strong></span><b>{draft.arguments[slot]===id?'مثبّت':'اختيار'}</b></ActionButton>)}</div>
        </Lane>
      </div>
      <footer className="rd-argument-board-footer"><div><small>التقرير الحالي</small><strong>{draft.teamId?TEAMS[draft.teamId].name:'لم يُحدد الفريق بعد'}</strong><span>{Number(Boolean(draft.documentId))} مستند · {draft.arguments.filter(Boolean).length} حجج</span></div><ActionButton className="rd-present-argument-button" disabled={!complete} onClick={()=>setConfirming(true)}>تقديم التوصية <ArrowLeft/></ActionButton></footer>
    </div>
    {confirming&&<div className="rd-confirmation" role="dialog" aria-modal="true" aria-label="تأكيد تقديم التوصية" onKeyDown={e=>{if(e.key==='Escape')setConfirming(false);}}><section className="rd-game-card"><h3>تأكيد تقديم التوصية</h3><p>{draft.teamId?TEAMS[draft.teamId].name:''}</p><p>{draft.documentId?DOCUMENTS[draft.documentId].title:''}</p>{draft.arguments.map((id,i)=><p key={i}>{id?ARGUMENTS[id].text:''}</p>)}<div className="rd-actions"><ActionButton autoFocus variant="secondary" onClick={()=>setConfirming(false)}>مراجعة التوصية</ActionButton><ActionButton disabled={!complete} onClick={()=>{setConfirming(false);onSubmit();}}>ثبّت وقدّم</ActionButton></div></section></div>}
  </section>;
}
