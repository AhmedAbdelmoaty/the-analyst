// Central typed registry for the cinematic Training Evaluation art (files live in /public/training-evaluation).
const C = "/training-evaluation/characters/";
const S = "/training-evaluation/scenes/";

export const CHARACTERS = {
  analyst: `${C}character-analyst-default.webp`,
  seif: `${C}character-seif-default.webp`,
  tarek: `${C}character-tarek-default.webp`,
} as const;

export const ATTENDANT = {
  default: `${C}character-parking-attendant-default.webp`,
  talking: `${C}character-parking-attendant-talking.webp`,
  objecting: `${C}character-parking-attendant-objecting.webp`,
  requestingPayment: `${C}character-parking-attendant-requesting-payment.webp`,
  angry: `${C}character-parking-attendant-angry.webp`,
  happy: `${C}character-parking-attendant-happy.webp`,
} as const;

export type MotionPreset = "briefing" | "travel" | "drive" | "parking" | "conversation" | "thinking" | "analysis" | "submission" | "victory" | "failure" | "timeout";

export interface CineScene { src: string; preset: MotionPreset; focus: string }

export const CINE = {
  briefing: { src: `${S}scene-01-seif-briefing.webp`, preset: "briefing", focus: "50% 35%" },
  enterCar: { src: `${S}scene-03-analyst-entering-car.webp`, preset: "travel", focus: "50% 55%" },
  driving: { src: `${S}scene-04-driving.webp`, preset: "drive", focus: "50% 45%" },
  parkingProgress: { src: `${S}scene-05a-parking-in-progress.webp`, preset: "parking", focus: "50% 50%" },
  parkingDone: { src: `${S}scene-05b-parking-completed.webp`, preset: "parking", focus: "50% 50%" },
  paymentRequest: { src: `${S}scene-06-parking-payment-request.webp`, preset: "conversation", focus: "50% 38%" },
  payLater: { src: `${S}scene-07-parking-pay-later.webp`, preset: "conversation", focus: "50% 38%" },
  payTen: { src: `${S}scene-08-parking-pay-10-egp.webp`, preset: "conversation", focus: "50% 38%" },
  payFifty: { src: `${S}scene-09-parking-pay-50-egp.webp`, preset: "conversation", focus: "50% 38%" },
  tarekWelcome: { src: `${S}scene-10-tarek-welcome.webp`, preset: "conversation", focus: "50% 35%" },
  tarekReport: { src: `${S}scene-11-tarek-evaluation-report.webp`, preset: "conversation", focus: "50% 38%" },
  officeEntry: { src: `${S}scene-12-analyst-office-entry.webp`, preset: "travel", focus: "50% 40%" },
  thinking: { src: `${S}scene-13-decision-thinking.webp`, preset: "thinking", focus: "50% 30%" },
  investigation: { src: `${S}scene-14-evaluation-investigation.webp`, preset: "thinking", focus: "50% 30%" },
  dashboard: { src: `${S}scene-14b-data-dashboard.webp`, preset: "analysis", focus: "50% 35%" },
  sending: { src: `${S}scene-15-sending-recommendation.webp`, preset: "submission", focus: "50% 35%" },
  victory: { src: `${S}scene-16-correct-recommendation-phone.webp`, preset: "victory", focus: "50% 32%" },
  failure: { src: `${S}scene-17-incorrect-recommendation-phone.webp`, preset: "failure", focus: "50% 32%" },
  timeout: { src: `${S}scene-18-time-expired-phone.webp`, preset: "timeout", focus: "50% 32%" },
} as const satisfies Record<string, CineScene>;

export type CineKey = keyof typeof CINE;

const cache = new Map<string, Promise<void>>();
export function preload(src: string): Promise<void> {
  let p = cache.get(src);
  if (!p) {
    const img = new Image();
    img.src = src;
    p = (img.decode ? img.decode() : new Promise<void>((r) => { img.onload = () => r(); })).catch(() => undefined);
    cache.set(src, p);
  }
  return p;
}
export const preloadAll = (srcs: string[]) => srcs.forEach((s) => { void preload(s); });

export const PRELOAD_GROUPS = {
  start: [CINE.briefing.src, CINE.enterCar.src, CINE.driving.src, CHARACTERS.seif, CHARACTERS.analyst],
  road: [CINE.parkingProgress.src, CINE.parkingDone.src, CINE.paymentRequest.src, CINE.payLater.src, CINE.payTen.src, CINE.payFifty.src, ...Object.values(ATTENDANT), CINE.tarekWelcome.src, CHARACTERS.tarek],
  meeting: [CINE.tarekReport.src, CINE.officeEntry.src, CINE.thinking.src],
  office: [CINE.investigation.src, CINE.dashboard.src, CINE.sending.src],
  endings: [CINE.victory.src, CINE.failure.src, CINE.timeout.src],
};
