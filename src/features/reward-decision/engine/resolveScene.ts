import type { SceneKey } from '../data/assets';
import type { Line } from '../data/script';
import type { RewardRun } from './model';

/** Pure story-to-scene map. The visible grapheme count is deliberately irrelevant. */
export function resolveScene(run: RewardRun, gender: 'male' | 'female', line: Line | null): SceneKey {
  const g = gender;
  switch (run.phase) {
    case 'cover': return 'corridor';
    case 'celebration': return run.stage === 'intro' || line?.id === 'celebration_01' ? 'opening' : 'marwan-reply';
    case 'debate': return run.stage === 'door' ? `door-${g}` : line?.id === 'debate_03' ? 'policy-debate' : 'debate';
    case 'briefing': return line?.id === 'briefing_03' || run.stage === 'done' ? 'final-directions' : `briefing-${g}`;
    case 'hub': return 'corridor';
    case 'sales': return line?.id === 'sales_03' ? 'sales-records' : `sales-${g}`;
    case 'hr': return line?.id === 'hr_03' ? 'hr-guidance' : `hr-${g}`;
    case 'workbench': case 'notebook': return `analyst-${g}`;
    case 'report': case 'recommendation': return `report-${g}`;
    case 'meeting': {
      if (!line) return 'meeting-opening';
      switch (line.id) {
        case 'meeting_01': return 'meeting-opening';
        case 'meeting_02': return 'meeting-marwan';
        case 'meeting_03': return 'meeting-mahmoud';
        case 'meeting_04': return 'meeting-dalia';
        case 'meeting_05': return gender === 'female' ? 'meeting-player-female' : 'meeting-player-male';
        default: return 'meeting-opening';
      }
    }
    case 'resolution': {
      const calm = run.decision === 'defer' || run.decision === 'mahmoud' || (!run.decision && (run.evaluation?.success ?? false));
      if (run.stage !== 'talking' || !line) return `analyst-${g}`;
      if (line.speaker === 'player') return `phone-player-${g}-${calm ? 'calm' : 'concerned'}`;
      if (line.speaker === 'mahmoud') return run.decision === 'mahmoud' || (!run.decision && (run.evaluation?.success ?? false)) ? 'phone-mahmoud-happy' : 'phone-mahmoud-upset';
      if (line.speaker === 'marwan') return run.decision === 'marwan' || (!run.decision && !(run.evaluation?.success ?? false)) ? 'phone-marwan-happy' : 'phone-marwan-upset';
      if (line.speaker === 'sherif') return 'meeting-neutral';
      return `analyst-${g}`;
    }
    case 'debrief': return 'completed-folder';
  }
}
