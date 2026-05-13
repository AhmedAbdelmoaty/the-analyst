import mansourStrongA from "@/assets/scenes/mansour-call-strong-a.webp";
import mansourStrongB from "@/assets/scenes/mansour-call-strong-b.webp";
import mansourWeakA from "@/assets/scenes/mansour-call-weak-a.webp";
import mansourWeakB from "@/assets/scenes/mansour-call-weak-b.webp";

import analystMale from "@/assets/photos/analyst-on-phone-male.webp";
import analystFemale from "@/assets/photos/analyst-on-phone-female.webp";
import analystMaleWeak from "@/assets/photos/analyst-on-phone-male-weak.webp";
import analystFemaleWeak from "@/assets/photos/analyst-on-phone-female-weak.webp";

export type CallTier = "strong" | "weak";
export type Gender = "male" | "female";

const MANSOUR_IMAGES: Record<CallTier, [string, string]> = {
  strong: [mansourStrongA, mansourStrongB],
  weak: [mansourWeakA, mansourWeakB],
};

/**
 * Pick which Mansour image to show based on dialogue position.
 * First half of his lines = image A, second half = image B.
 */
export function pickMansourImage(
  tier: CallTier,
  mansourLineIndex: number,
  totalMansourLines: number
): string {
  const [a, b] = MANSOUR_IMAGES[tier];
  if (totalMansourLines <= 1) return a;
  const midpoint = Math.ceil(totalMansourLines / 2);
  return mansourLineIndex < midpoint ? a : b;
}

export function pickAnalystImage(gender: Gender, tier: CallTier): string {
  if (tier === "weak") {
    return gender === "female" ? analystFemaleWeak : analystMaleWeak;
  }
  return gender === "female" ? analystFemale : analystMale;
}
