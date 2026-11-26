export const SIGNUP_FALLBACK_AFTER_S = 45;

/** Server-enforced wait before a password-verified pending signup may skip WhatsApp. */
export function signupFallbackRetryAfter(
  challengeCreatedAt: string,
  nowMs: number,
  providerFailed: boolean,
): number {
  if (providerFailed) return 0;
  const createdMs = Date.parse(challengeCreatedAt);
  if (!Number.isFinite(createdMs)) return SIGNUP_FALLBACK_AFTER_S;
  const elapsedS = Math.max(0, (nowMs - createdMs) / 1000);
  return Math.max(0, Math.ceil(SIGNUP_FALLBACK_AFTER_S - elapsedS));
}
