import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileBarChart2, FileText, FolderOpen, ScrollText, X } from 'lucide-react';
import { DOCUMENTS, QUESTIONS, QUESTION_ORDER, TEAMS, TOOLS, type DocumentId, type ToolId } from '../data/case';
import type { Submission } from '../engine/model';
import { toolValue } from '../engine/statistics';
import { DocumentPage } from './DocumentPage';

type Tab = 'documents' | 'analysis' | 'report';
type Detail = { kind: 'document'; id: DocumentId } | { kind: 'tool'; id: ToolId } | null;

export function SubmittedReportPage({ report }: { report: Submission }) {
  return <article className="rd-file-page rd-submitted-page"><div className="rd-page-head"><ScrollText aria-hidden="true" /><div><small>نسخة مُرسلة</small><h3>تقرير المراجعة والتحليل</h3></div></div>{QUESTION_ORDER.map((q, index) => <p key={q}><b>الاستنتاج {index + 1}:</b> {QUESTIONS[q].choices.find(c => c.id === report.answers[q])?.text}</p>)}<div className="rd-file-stamp">تم الإرسال</div></article>;
}

export function CaseFile({ docs, tools, focus, submitted, onClose }: { docs: DocumentId[]; tools: ToolId[]; focus?: DocumentId | null; submitted?: Submission | null; onClose: () => void }) {
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
    <nav className="rd-file-tabs" aria-label="أقسام الملف">{([['documents','المستندات',docs.length],['analysis','نتائج التحليل',tools.length],['report','التقرير',submitted ? 1 : 0]] as const).map(([id,label,count]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setDetail(null); }} aria-current={tab === id ? 'page' : undefined}>{label}<small>{count}</small></button>)}</nav>
    <div className="rd-file-body">
      {detail && <button className="rd-file-back" onClick={() => setDetail(null)}><ArrowRight aria-hidden="true" /> رجوع إلى الفهرس</button>}
      {detail?.kind === 'document' && <DocumentPage id={detail.id} />}
      {detail?.kind === 'tool' && <article className="rd-file-page"><div className="rd-page-head"><FileBarChart2 aria-hidden="true" /><div><small>نتيجة أداة التحليل</small><h3>{TOOLS[detail.id].title}</h3></div></div><div className="rd-file-figures">{(['marwan','mahmoud'] as const).map(team => <span key={team}><b>{TEAMS[team].name}</b><strong dir="ltr">{toolValue(detail.id, team)}</strong></span>)}</div></article>}
      {!detail && tab === 'documents' && (docs.length ? <div className="rd-file-index">{docs.map(id => <button key={id} onClick={() => setDetail({ kind: 'document', id })}><FileText aria-hidden="true" /><span><small>{DOCUMENTS[id].source}</small><b>{DOCUMENTS[id].title}</b></span><ArrowRight aria-hidden="true" /></button>)}</div> : <p className="rd-file-empty">ستظهر هنا المستندات التي تستلمها من المكاتب.</p>)}
      {!detail && tab === 'analysis' && (tools.length ? <div className="rd-file-index">{tools.map(id => <button key={id} onClick={() => setDetail({ kind: 'tool', id })}><FileBarChart2 aria-hidden="true" /><span><small>نتائج محفوظة</small><b>{TOOLS[id].title}</b></span><ArrowRight aria-hidden="true" /></button>)}</div> : <p className="rd-file-empty">استخدم أدوات شاشة التحليل لتظهر نتائجها هنا.</p>)}
      {!detail && tab === 'report' && (submitted ? <SubmittedReportPage report={submitted} /> : <p className="rd-file-empty">يظهر التقرير هنا بعد إرساله.</p>)}
    </div>
  </section></div>;
}
