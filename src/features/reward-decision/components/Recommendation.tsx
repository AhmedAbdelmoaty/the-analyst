import { CLAIMS, EVIDENCE, TEAMS, type ClaimId, type EvidenceId, type TeamId } from '../data/case';
import type { DraftLink } from '../engine/model';
import { ActionButton, Panel } from './Ui';

export function Recommendation({ team, links, evidence, onTeam, onLink, onSubmit, onBack }: {
  team: TeamId | null; links: DraftLink[]; evidence: EvidenceId[];
  onTeam: (t: TeamId) => void; onLink: (i: number, l: DraftLink) => void; onSubmit: () => void; onBack: () => void;
}) {
  const l = [links[0] ?? { evidenceId: '', claimId: '' }, links[1] ?? { evidenceId: '', claimId: '' }];
  const filled = l.every(x => x.evidenceId && x.claimId);
  const distinct = l[0].evidenceId !== l[1].evidenceId;
  const complete = !!team && filled && distinct;
  return (
    <Panel title="تجهيز التوصية" onBack={onBack}>
      <p className="rd-lead">اختر الفريق، ثم أرفق مقارنتين وحدد ما تثبته كل واحدة. تقدر تفتح ملف القضية من غير ما المسودة تضيع.</p>
      <div className="rd-team-pick">{(['marwan', 'mahmoud'] as TeamId[]).map(t => <button className={team === t ? 'selected' : ''} onClick={() => onTeam(t)} key={t} data-team={t}>{TEAMS[t].name}</button>)}</div>
      {[0, 1].map(i => (
        <div className="rd-link" key={i}>
          <b>المرفق {i + 1}</b>
          <select aria-label={`الدليل ${i + 1}`} value={l[i].evidenceId} onChange={e => onLink(i, { ...l[i], evidenceId: e.target.value as EvidenceId })}>
            <option value="">اختر المقارنة</option>{evidence.map(id => <option value={id} key={id}>{EVIDENCE[id].title}</option>)}
          </select>
          <select aria-label={`التفسير ${i + 1}`} value={l[i].claimId} onChange={e => onLink(i, { ...l[i], claimId: e.target.value as ClaimId })}>
            <option value="">ماذا تثبت؟</option>{Object.entries(CLAIMS).map(([id, t]) => <option value={id} key={id}>{t}</option>)}
          </select>
        </div>
      ))}
      {filled && !distinct && <p className="rd-hint">اختر مقارنتين مختلفتين.</p>}
      {complete && <blockquote>أوصي بتكريم {TEAMS[team].name}. أستند إلى {EVIDENCE[l[0].evidenceId as EvidenceId].title} لإسناد {CLAIMS[l[0].claimId as ClaimId]}، وإلى {EVIDENCE[l[1].evidenceId as EvidenceId].title} لإسناد {CLAIMS[l[1].claimId as ClaimId]}.</blockquote>}
      <div className="rd-actions"><ActionButton disabled={!complete} onClick={onSubmit}>تقديم التوصية</ActionButton></div>
    </Panel>
  );
}
