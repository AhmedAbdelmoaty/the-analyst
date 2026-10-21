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
    case 'meeting': return 'meeting-opening';
    case 'resolution': {
      const ok = run.evaluation?.success ?? false;
      if (run.stage !== 'talking' || !line) return `analyst-${g}`;
      if (line.speaker === 'player') return `phone-player-${g}-${ok ? 'calm' : 'concerned'}`;
      if (line.speaker === 'mahmoud') return ok ? 'phone-mahmoud-happy' : 'phone-mahmoud-upset';
      if (line.speaker === 'marwan') return ok ? 'phone-marwan-upset' : 'phone-marwan-happy';
      return `analyst-${g}`;
    }
    case 'debrief': return 'completed-folder';
  }
}
