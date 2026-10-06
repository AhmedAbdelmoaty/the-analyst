import { X } from 'lucide-react';
import { POLICY, TEAMS, EVIDENCE, type EvidenceId } from '../data/case';
import { evidenceFigures } from '../engine/evidence';
import { ActionButton } from './Ui';

export function CaseFile({ docs, evidence, onClose }: { docs: string[]; evidence: EvidenceId[]; onClose: () => void }) {
  return (
    <div className="rd-modal" dir="rtl">
      <section className="rd-file" data-testid="case-file">
        <button className="rd-close" aria-label="إغلاق الملف" onClick={onClose}><X /></button>
        <p className="rd-kicker">ملف القضية</p><h2>قرار التكريم</h2>
        {docs.length === 0 && evidence.length === 0 && <p className="rd-lead">الملف فاضي لحد دلوقتي.</p>}
        {docs.includes('sales') && <div className="rd-document"><h3>التقرير المعتمد</h3><div className="rd-compare"><b>فريق مروان: 9.5 مليون · 95%</b><b>فريق محمود: 8.8 مليون · 88%</b></div><small>10 أفراد لكل فريق · المستهدف مليون للفرد</small></div>}
        {docs.includes('records') && <div className="rd-document"><h3>كشف نتائج الأفراد</h3><div className="rd-teams">{(['marwan', 'mahmoud'] as const).map(t => <div key={t}><b>{TEAMS[t].name}</b>{TEAMS[t].members.map(m => <span key={m.id}>{m.name}<i>{m.value}%</i></span>)}</div>)}</div></div>}
        {docs.includes('policy') && <div className="rd-document"><h3>معيار التكريم</h3><p>{POLICY}</p></div>}
        {evidence.length > 0 && <div className="rd-document"><h3>المقارنات المحفوظة</h3>
          {evidence.map(e => { const f = evidenceFigures(e); return <div className="rd-saved-ev" key={e} data-saved={e}><b>{EVIDENCE[e].title}</b><span>فريق مروان: {f.marwan}</span><span>فريق محمود: {f.mahmoud}</span></div>; })}
        </div>}
        <ActionButton onClick={onClose}>العودة للتحقيق</ActionButton>
      </section>
    </div>
  );
}
