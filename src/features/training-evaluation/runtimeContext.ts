import { createContext, type Context } from "react";
import type { Action } from "./engine";
import type { SavedRun } from "./persistence";

export type Runtime = {
  run: SavedRun; paused: boolean; exitPrompt: boolean; unavailable: boolean; otherTab: boolean;
  update: (fn: (r: SavedRun) => SavedRun) => void; dispatch: (a: Action) => void;
  pause: (exit?: boolean) => void; resume: () => void; finish: () => void; restart: () => void; revision: number;
};

// A non-component module keeps old providers and refreshed consumers on the same context.
export const RuntimeContext: Context<Runtime | null> =
  import.meta.hot?.data.trainingRuntimeContext ?? createContext<Runtime | null>(null);
if (import.meta.hot) import.meta.hot.data.trainingRuntimeContext = RuntimeContext;