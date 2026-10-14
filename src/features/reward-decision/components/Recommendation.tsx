import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Pin, X } from 'lucide-react';
import { ARGUMENTS, DOCUMENTS, TEAMS, type ArgumentId, type DocumentId, type TeamId, type ToolId } from '../data/case';
import type { DraftReport } from '../engine/model';
import { ActionButton, Panel } from './Ui';

export function Recommendation({ draft, docs, tools, onChange, onSubmit, onBack }: { draft: DraftReport; docs: DocumentId[]; tools: ToolId[]; onChange: (draft: DraftReport) => void; onSubmit: () => void; onBack: () => void }) {
  const [slot, setSlot] = useState<0 | 1>(0);
  const options = (Object.entries(ARGUMENTS) as [ArgumentId, typeof ARGUMENTS[ArgumentId]][]).filter(([, argument]) => (!argument.tool || tools.includes(argument.tool)) && (!argument.document || docs.includes(argument.document)));
  const complete = Boolean(draft.teamId && draft.documentId && draft.arguments[0] && draft.arguments[1]);
  const setArgument = (id: ArgumentId | null, index: 0 | 1) => { const args = [...draft.arguments] as DraftReport['arguments']; args[index] = id; onChange({ ...draft, arguments: args }); };
  return <Panel title="لوحة التوصية" onBack={onBack}>
    <p className="rd-panel-intro">رتّب ما وصلت إليه قبل الاجتماع.</p>
    <div className="rd-recommendation-board">
      <section className="rd-recommendation-sheet"><div className="rd-recommendation-heading"><Pin aria-hidden="true" /><h3>الفريق المرشح</h3></div><div className="rd-team-pick">{(['marwan','mahmoud'] as TeamId[]).map(team => <button data-team={team} className={draft.teamId === team ? 'selected' : ''} aria-pressed={draft.teamId === team} onClick={() => onChange({ ...draft, teamId: team })} key={team}>{TEAMS[team].name}</button>)}</div></section>
      <section className="rd-recommendation-sheet"><div className="rd-recommendation-heading"><FileText aria-hidden="true" /><h3>المستند المرجعي</h3></div><div className="rd-document-pick">{docs.map(id => <button key={id} className={draft.documentId === id ? 'selected' : ''} aria-pressed={draft.documentId === id} onClick={() => onChange({ ...draft, documentId: draft.documentId === id ? null : id })}>{DOCUMENTS[id].title}</button>)}</div>{!docs.length && <p className="rd-hint">اجمع المستندات من المكاتب أولًا.</p>}</section>
      <section className="rd-recommendation-arguments"><div className="rd-recommendation-heading"><Pin aria-hidden="true" /><h3>حجتان تحليليتان</h3></div><div className="rd-argument-slots">{([0,1] as const).map(index => <motion.div layout key={index} className={`rd-argument-slot ${slot === index ? 'active' : ''}`}><button className="rd-slot-select" onClick={() => setSlot(index)} aria-pressed={slot === index}><small>الحجة {index + 1}</small><span>{draft.arguments[index] ? ARGUMENTS[draft.arguments[index]].text : 'اختَر حجة من البطاقات'}</span></button>{draft.arguments[index] && <button className="rd-slot-remove" aria-label={`إزالة الحجة ${index + 1}`} onClick={() => setArgument(null,index)}><X aria-hidden="true" /></button>}</motion.div>)}</div>
        <div className="rd-argument-options" aria-label={`بطاقات الحجة ${slot + 1}`}>{options.map(([id,argument]) => <button key={id} className={draft.arguments[slot] === id ? 'selected' : ''} onClick={() => setArgument(id,slot)} aria-pressed={draft.arguments[slot] === id}><span>{argument.text}</span><small>{draft.arguments[slot] === id ? 'مُثبتة' : 'اختيار'}</small></button>)}</div>
      </section>
    </div>
    <div className="rd-actions"><ActionButton disabled={!complete} onClick={onSubmit}>تقديم التوصية</ActionButton></div>
  </Panel>;
}
