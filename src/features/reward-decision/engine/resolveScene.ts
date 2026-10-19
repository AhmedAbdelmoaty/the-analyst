import type { SceneKey } from '../data/assets';
import type { Line } from '../data/script';
import type { RewardRun } from './model';

/** Pure story-to-scene map. The visible grapheme count is deliberately irrelevant. */
export function resolveScene(run: RewardRun, gender: 'male' | 'female', line: Line | null): SceneKey {
  const g = gender;
  switch (run.phase) {
    case 'cover': return 'corridor'; // No dedicated A00 asset exists.
    case 'celebration': return run.stage === 'intro' || line?.id === 'celebration_01' ? 'opening' : 'marwan-reply';
    case 'debate': return run.stage === 'door' ? `door-${g}` : line?.id === 'debate_03' ? 'policy-debate' : 'debate';
    case 'briefing': return line?.id === 'briefing_03' || run.stage === 'done' ? 'final-directions' : `briefing-${g}`;
    case 'hub': return 'corridor';
    case 'sales': return line?.id === 'sales_03' ? 'sales-records' : `sales-${g}`;
    case 'hr': return line?.id === 'hr_03' ? 'hr-guidance' : `hr-${g}`;
    case 'workbench': return `analyst-${g}`;
    case 'recommendation': return `report-${g}`;
    case 'meeting':
      if (line?.id === 'meeting_01' || run.dialogueIndex === 0) return 'meeting-opening';
      if (line?.id === 'meeting_02' || run.dialogueIndex === 1) return `meeting-player-${g}`;
      return run.evaluation?.reason === 'complete' ? 'meeting-neutral' : 'meeting-concerned';
    case 'resolution':
      if (run.stage !== 'talking' || !run.submitted || !line) return `analyst-${g}`;
      if (line.speaker === 'player') return `phone-player-${g}-${run.submitted.teamId === 'marwan' ? 'concerned' : 'calm'}`;
      if (line.speaker === 'mahmoud') return run.submitted.teamId === 'marwan' ? 'phone-mahmoud-upset' : 'phone-mahmoud-happy';
      if (line.speaker === 'marwan') return run.submitted.teamId === 'marwan' ? 'phone-marwan-happy' : 'phone-marwan-upset';
      return `analyst-${g}`;
    case 'debrief': return 'completed-folder';
  }
}
