import { ARGUMENTS, type ArgumentId, type TeamId, type ToolId } from '../data/case';
import { toolValue } from './statistics';
export function comparisonFigures(id: ToolId): Record<TeamId, string> { return { marwan: toolValue(id, 'marwan'), mahmoud: toolValue(id, 'mahmoud') }; }
export function argumentNote(id: ArgumentId, valid: boolean): string { return valid ? `الحجة «${ARGUMENTS[id].text}» تدعم القرار في سياق التقرير.` : `الحجة «${ARGUMENTS[id].text}» لا تثبت المطلوب بهذا التفسير.`; }