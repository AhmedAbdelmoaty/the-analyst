import type { PFGameState } from "@/contexts/PFGameContext";

export const PF_SAVE_VERSION = 1;
export const PF_SAVE_KEY = "pf-game-save-v1-guest";
export const PF_OLD_SCREEN_KEY = "pf-game-screen-guest";
export const PF_SUBMITTED_KEY = "pf-game-submitted";

export type PFScreen =
  | "company-briefing"
  | "travel"
  | "velaro-street"
  | "arrival"
  | "inquiry"
  | "reflection"
  | "framing"
  | "email-send"
  | "mansour-receives"
  | "incoming-call"
  | "phone-call"
  | "result"
  | "replay-briefing";

export const PF_SCREENS: PFScreen[] = [
  "company-briefing",
  "travel",
  "velaro-street",
  "arrival",
  "inquiry",
  "reflection",
  "framing",
  "email-send",
  "mansour-receives",
  "incoming-call",
  "phone-call",
  "result",
  "replay-briefing",
];

export type ScreenProgress = {
  travel?: {
    startedAt?: number;
  };
  velaroStreet?: {
    startedAt?: number;
  };
  companyBriefing?: {
    phase?: "exterior" | "hallway" | "door-knock" | "dialogue" | "transition";
    dialogueIndex?: number;
  };
  arrival?: {
    phase?: "storefront" | "entering" | "interior" | "dialogue";
    dialogueIndex?: number;
  };
  inquiry?: {
    phase?: "preQuestions" | "choosing" | "askingQuestion" | "dialogue";
    currentLines?: unknown[];
    dialogueIndex?: number;
    selectedChoiceId?: string | null;
    activeQuestionId?: string | null;
    questionProgress?: number;
  };
  reflection?: {
    activeTab?: "notes" | "reports";
    openReportId?: string | null;
  };
  framing?: {
    stage?: "background" | "sections" | "summary";
    activeSectionIdx?: number;
    confirmed?: boolean;
  };
  emailSend?: {
    sending?: boolean;
    sent?: boolean;
  };
  mansourReceives?: {
    phase?: "reading" | "phoning";
  };
  phoneCall?: {
    dialogueIndex?: number;
    seconds?: number;
  };
};

export type SoundSettings = {
  isSoundEnabled: boolean;
  masterVolume: number;
};

export interface PFGameSnapshot {
  version: typeof PF_SAVE_VERSION;
  screen: PFScreen;
  gameState?: PFGameState;
  screenProgress: ScreenProgress;
  soundSettings: SoundSettings;
  updatedAt: number;
}

const defaultSoundSettings: SoundSettings = {
  isSoundEnabled: true,
  masterVolume: 1,
};

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

const isValidScreen = (screen: unknown): screen is PFScreen =>
  typeof screen === "string" && PF_SCREENS.includes(screen as PFScreen);

const sanitizeSoundSettings = (settings: unknown): SoundSettings => {
  if (!settings || typeof settings !== "object") return defaultSoundSettings;
  const raw = settings as Partial<SoundSettings>;
  const masterVolume = Number(raw.masterVolume);
  return {
    isSoundEnabled:
      typeof raw.isSoundEnabled === "boolean" ? raw.isSoundEnabled : true,
    masterVolume: Number.isFinite(masterVolume)
      ? Math.max(0, Math.min(1, masterVolume))
      : 1,
  };
};

export const readPFGameSnapshot = (): PFGameSnapshot | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PF_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PFGameSnapshot>;
    if (parsed.version !== PF_SAVE_VERSION) return null;
    if (!isValidScreen(parsed.screen)) return null;
    return {
      version: PF_SAVE_VERSION,
      screen: parsed.screen === "replay-briefing" ? "company-briefing" : parsed.screen,
      gameState: parsed.gameState,
      screenProgress:
        parsed.screenProgress && typeof parsed.screenProgress === "object"
          ? parsed.screenProgress
          : {},
      soundSettings: sanitizeSoundSettings(parsed.soundSettings),
      updatedAt:
        typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
};

export const writePFGameSnapshot = (patch: Partial<PFGameSnapshot>) => {
  if (!isBrowser()) return;
  const current = readPFGameSnapshot();
  const next: PFGameSnapshot = {
    version: PF_SAVE_VERSION,
    screen: patch.screen ?? current?.screen ?? "company-briefing",
    gameState: patch.gameState ?? current?.gameState,
    screenProgress: patch.screenProgress ?? current?.screenProgress ?? {},
    soundSettings:
      patch.soundSettings ??
      current?.soundSettings ??
      defaultSoundSettings,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(PF_SAVE_KEY, JSON.stringify(next));
};

export const clearPFGameSnapshot = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PF_SAVE_KEY);
  window.localStorage.removeItem(PF_OLD_SCREEN_KEY);
  window.localStorage.removeItem(PF_SUBMITTED_KEY);
};
