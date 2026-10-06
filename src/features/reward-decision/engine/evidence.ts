import { CLAIMS, EVIDENCE, type ClaimId, type EvidenceId, type TeamId } from '../data/case';
import { stats } from './statistics';
import type { Link } from './model';

export const MEANINGS: Record<EvidenceId, ClaimId> = {
  ev_mean: 'aggregate', ev_median: 'middle', ev_range: 'spread', ev_sd: 'spread', ev_iqr: 'spread', ev_threshold: 'coverage',
};

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Both teams' figures for a comparison, derived from the record (never typed by the player). */
export function evidenceFigures(id: EvidenceId): Record<TeamId, string> {
  const m = stats('marwan'), b = stats('mahmoud');
  const f = (s: typeof m): string => ({
    ev_mean: `${s.total.toFixed(1)} مليون · متوسط ${fmt(s.mean)}%`,
    ev_median: `الوسيط ${fmt(s.median)}%`,
    ev_range: `${Math.min(...s.values)}–${Math.max(...s.values)} · المدى ${s.range} نقطة`,
    ev_sd: `الانحراف المعياري ${s.sd.toFixed(1)} نقطة`,
    ev_iqr: `${s.q1}–${s.q3} · المدى الربيعي ${s.iqr}`,
    ev_threshold: `${s.threshold} من 10 حققوا 85% أو أكثر`,
  })[id];
  return { marwan: f(m), mahmoud: f(b) };
}

/** Short debrief note for each attachment the player actually used. */
export function attachmentNote(link: Link): string {
  const title = EVIDENCE[link.evidenceId].title;
  const real = MEANINGS[link.evidenceId];
  if (real === link.claimId) return `المرفق «${title}» يوضح ${CLAIMS[real]}.`;
  return `المرفق «${title}» يوضح ${CLAIMS[real]}، لكنه لا يثبت ${CLAIMS[link.claimId]}.`;
}
