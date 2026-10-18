import { FileText } from 'lucide-react';
import { DOCUMENTS, POLICY, TEAMS, type DocumentId } from '../data/case';

export function DocumentPage({ id }: { id: DocumentId }) {
  return <article className={`rd-file-page rd-official-document rd-document-${id}`} data-document={id}>
    <div className="rd-official-letterhead"><span>روّاد</span><small>للأجهزة الكهربائية</small></div>
    <div className="rd-page-head"><FileText aria-hidden="true"/><div><small>{DOCUMENTS[id].source}</small><h3>{DOCUMENTS[id].title}</h3></div></div>
    {id==='sales-summary'&&<><p className="rd-page-note">الفترة نفسها · 10 أفراد لكل فريق · أهداف موحدة</p><div className="rd-file-figures"><span><b>{TEAMS.marwan.name}</b><strong>9.5 مليون</strong><small>95% من المستهدف</small></span><span><b>{TEAMS.mahmoud.name}</b><strong>8.8 مليون</strong><small>88% من المستهدف</small></span></div><div className="rd-department-seal">المبيعات — سري</div></>}
    {id==='individual-records'&&<><div className="rd-file-records">{(['marwan','mahmoud'] as const).map(team=><section key={team}><h4>{TEAMS[team].name}</h4><div>{TEAMS[team].members.map(member=><span key={member.id}><b>{member.name}</b><em dir="ltr">{member.value}%</em></span>)}</div></section>)}</div><div className="rd-department-seal">أرشيف البيانات</div></>}
    {id==='policy'&&<><p className="rd-policy-copy">{POLICY}</p><div className="rd-department-seal">نسخة معتمدة</div></>}
  </article>;
}