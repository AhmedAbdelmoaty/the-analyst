import { useState } from 'react';
import { CLAIMS, EVIDENCE, TEAMS, type ClaimId, type EvidenceId, type TeamId } from '../data/case';
import type { Link } from '../engine/model';
import { ActionButton, Panel } from './Ui';

/** The player's defence after the scripted objection: one comparison + what it proves, or go back to review. */
export function MeetingDefense({ team, evidence, current, followup, onConfirm, onReview }: {
  team: TeamId; evidence: EvidenceId[]; current: Link | null; followup: boolean;
  onConfirm: (l: Link) => void; onReview: () => void;
}) {
  const [ev, setEv] = useState<EvidenceId | ''>(current?.evidenceId ?? '');
  const [claim, setClaim] = useState<ClaimId | ''>(current?.claimId ?? '');
  return (
    <Panel title={followup ? 'متابعة شريف' : `دفاعك عن ترشيح ${TEAMS[team].name}`}>
      <p className="rd-lead">اختر مقارنة من ملفك وحدد ما تثبته.</p>
      <div className="rd-link">
        <b>الحجة</b>
        <select aria-label="دليل الدفاع" value={ev} onChange={e => setEv(e.target.value as EvidenceId)}><option value="">اختر مقارنة</option>{evidence.map(id => <option key={id} value={id}>{EVIDENCE[id].title}</option>)}</select>
        <select aria-label="تفسير الدفاع" value={claim} onChange={e => setClaim(e.target.value as ClaimId)}><option value="">ماذا تثبت؟</option>{Object.entries(CLAIMS).map(([id, t]) => <option value={id} key={id}>{t}</option>)}</select>
      </div>
      <div className="rd-actions">
        <ActionButton disabled={!ev || !claim} onClick={() => ev && claim && onConfirm({ evidenceId: ev, claimId: claim })}>تأكيد الحجة</ActionButton>
        <ActionButton variant="secondary" onClick={onReview}>العودة للفحص</ActionButton>
      </div>
    </Panel>
  );
}
