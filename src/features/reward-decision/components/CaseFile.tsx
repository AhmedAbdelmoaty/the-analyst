import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileBarChart2, FileText, FolderOpen, ScrollText, X } from 'lucide-react';
import { ARGUMENTS, DOCUMENTS, POLICY, TEAMS, TOOLS, type DocumentId, type ToolId } from '../data/case';
import type { FinalReport } from '../engine/model';
import { toolValue } from '../engine/statistics';

type Tab = 'documents' | 'analysis' | 'report';
type Detail = { kind: 'document'; id: DocumentId } | { kind: 'tool'; id: ToolId } | null;

function DocumentPage({ id }: { id: DocumentId }) {
  return <article className="rd-file-page" data-document={id}>
    <div className="rd-page-head"><FileText aria-hidden="true" /><div><small>{DOCUMENTS[id].source}</small><h3>{DOCUMENTS[id].title}</h3></div></div>
    {id === 'sales-summary' && <><p className="rd-page-note">الفترة نفسها · 10 أفراد لكل فريق · أهداف موحدة</p><div className="rd-file-figures"><span><b>{TEAMS.marwan.name}</b><strong>9.5 مليون</strong><small>95% من المستهدف</small></span><span><b>{TEAMS.mahmoud.name}</b><strong>8.8 مليون</strong><small>88% من المستهدف</small></span></div></>}
    {id === 'individual-records' && <div className="rd-file-records">{(['marwan', 'mahmoud'] as const).map(team => <section key={team}><h4>{TEAMS[team].name}</h4><div>{TEAMS[team].members.map(member => <span key={member.id}><b>{member.name}</b><em dir="ltr">{member.value}%</em></span>)}</div></section>)}</div>}
    {id === 'policy' && <p className="rd-policy-copy">{POLICY}</p>}
  </article>;
}

export function SubmittedReportPage({ report }: { report: FinalReport }) {
  return <article className="rd-file-page rd-submitted-page"><div className="rd-page-head"><ScrollText aria-hidden="true" /><div><small>نسخة مقدَّمة</small><h3>التوصية</h3></div></div><p><b>الفريق:</b> {TEAMS[report.teamId].name}</p><p><b>المستند:</b> {DOCUMENTS[report.documentId].title}</p>{report.arguments.map((id, index) => <p key={index}><b>الحجة {index + 1}:</b> {ARGUMENTS[id].text}</p>)}<div className="rd-file-stamp">تم تقديم التوصية</div></article>;
}

export function CaseFile({ docs, tools, focus, submitted, onClose }: { docs: DocumentId[]; tools: ToolId[]; focus?: DocumentId | null; submitted?: FinalReport | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('documents');
  const [detail, setDetail] = useState<Detail>(focus ? { kind: 'document', id: focus } : null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => { dialogRef.current?.querySelector<HTMLElement>('.rd-close')?.focus(); }, []);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div className="rd-modal" dir="rtl"><section ref={dialogRef} className="rd-file" data-testid="analysis-file" role="dialog" aria-modal="true" aria-label="ملف التحليل" onKeyDown={onKeyDown}>
    <div className="rd-file-cover"><div className="rd-file-heading"><FolderOpen aria-hidden="true" /><div><p className="rd-kicker">شركة روّاد · ملف القضية</p><h2>ملف التحليل</h2></div></div><button className="rd-close" aria-label="إغلاق الملف" onClick={onClose}><X /></button></div>
    <nav className="rd-file-tabs" aria-label="أقسام الملف">{([['documents','المستندات',docs.length],['analysis','نتائج التحليل',tools.length],['report','التوصية',submitted ? 1 : 0]] as const).map(([id,label,count]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setDetail(null); }} aria-current={tab === id ? 'page' : undefined}>{label}<small>{count}</small></button>)}</nav>
    <div className="rd-file-body">
      {detail && <button className="rd-file-back" onClick={() => setDetail(null)}><ArrowRight aria-hidden="true" /> رجوع إلى الفهرس</button>}
      {detail?.kind === 'document' && <DocumentPage id={detail.id} />}
      {detail?.kind === 'tool' && <article className="rd-file-page"><div className="rd-page-head"><FileBarChart2 aria-hidden="true" /><div><small>نتيجة أداة التحليل</small><h3>{TOOLS[detail.id].title}</h3></div></div><div className="rd-file-figures">{(['marwan','mahmoud'] as const).map(team => <span key={team}><b>{TEAMS[team].name}</b><strong dir="ltr">{toolValue(detail.id, team)}</strong></span>)}</div></article>}
      {!detail && tab === 'documents' && (docs.length ? <div className="rd-file-index">{docs.map(id => <button key={id} onClick={() => setDetail({ kind: 'document', id })}><FileText aria-hidden="true" /><span><small>{DOCUMENTS[id].source}</small><b>{DOCUMENTS[id].title}</b></span><ArrowRight aria-hidden="true" /></button>)}</div> : <p className="rd-file-empty">ستظهر هنا المستندات التي تستلمها من المكاتب.</p>)}
      {!detail && tab === 'analysis' && (tools.length ? <div className="rd-file-index">{tools.map(id => <button key={id} onClick={() => setDetail({ kind: 'tool', id })}><FileBarChart2 aria-hidden="true" /><span><small>نتائج محفوظة</small><b>{TOOLS[id].title}</b></span><ArrowRight aria-hidden="true" /></button>)}</div> : <p className="rd-file-empty">استخدم أدوات شاشة التحليل لتظهر نتائجها هنا.</p>)}
      {!detail && tab === 'report' && (submitted ? <SubmittedReportPage report={submitted} /> : <p className="rd-file-empty">تظهر التوصية هنا بعد تقديمها.</p>)}
    </div>
  </section></div>;
}
