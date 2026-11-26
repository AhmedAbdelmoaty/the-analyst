import { z } from "zod";
import { initialState, reduce, type Action, type State } from "./engine";

const stateSchema = z.object({
  phase: z.enum(["intro", "brief", "road", "meeting", "office", "verdict"]),
  line: z.number().int().nonnegative(), officeEntered: z.boolean(),
  view: z.enum(["think", "guess", "preparingData", "data", "ask", "email"]),
  path: z.enum(["data", "ask"]).nullable(), penalty: z.number().nonnegative(),
  asked: z.array(z.enum(["respondents", "complaintsOfAll", "attendance", "complaintsCount", "allData"])),
  claim: z.enum(["aBetter", "bBetter", "equal", "notRep", "trainer", "trainees"]).nullable(),
  evidence: z.enum(["participants", "complaintsRate", "complaints", "satisfaction", "attendance", "assignments", "projects", "respondents"]).nullable(),
  mismatch: z.boolean(), outcome: z.enum(["win", "lossGuess", "lossData"]).nullable(),
  timedOut: z.boolean(), order: z.array(z.enum(["aBetter", "bBetter", "equal", "notRep", "trainer", "trainees"])),
  sayes: z.enum(["later", "ten", "fifty"]).nullable(),
});
const schema = z.object({ version: z.literal(1), userId: z.string(), state: stateSchema,
  elapsed: z.number().int().nonnegative(), ui: z.record(z.unknown()), timers: z.record(z.number().nonnegative()) });
export interface SavedRun { version: 1; userId: string; state: State; elapsed: number; ui: Record<string, unknown>; timers: Record<string, number> }
export const storageKey = (uid: string) => `the-analyst:training-evaluation:v1:${uid}`;
export const newRun = (userId: string): SavedRun => ({ version: 1, userId, state: initialState(), elapsed: 0, ui: {}, timers: {} });
export function advanceRun(r: SavedRun, a: Action): SavedRun {
  const state = reduce(r.state, a);
  if (state === r.state) return r;
  if (a.type === "restart" || a.type === "start") return { ...newRun(r.userId), state };
  const changedScreen = state.phase !== r.state.phase || state.view !== r.state.view;
  const resetClock = a.type === "retry" || (state.phase === "office" && !state.officeEntered);
  return { ...r, state,
    ui: changedScreen ? Object.fromEntries(Object.entries(r.ui).filter(([key]) => key.startsWith("global:"))) : r.ui,
    timers: changedScreen ? { analysis: resetClock ? 0 : r.timers.analysis ?? 0 } : r.timers };
}
export function loadRun(uid: string, storage: Pick<Storage, "getItem"> = localStorage): SavedRun | null {
  try { const value = storage.getItem(storageKey(uid)); if (!value) return null;
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success && parsed.data.userId === uid ? parsed.data as SavedRun : null;
  } catch { return null; }
}
export function saveRun(run: SavedRun, storage: Pick<Storage, "setItem"> = localStorage): boolean {
  try { storage.setItem(storageKey(run.userId), JSON.stringify(run)); return true; } catch { return false; }
}
export function clearRun(uid: string) { try { localStorage.removeItem(storageKey(uid)); } catch { /* unavailable */ } }