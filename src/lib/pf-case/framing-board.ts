// ============================================================
// Framing Board — Dynamic per player path
// ============================================================
// Rules:
// - Full spine (no wrong track): show 3 wrong (A, C, D) + 1 correct.
// - Entered any wrong track:
//   * client_view: keep correct ONLY if player asked S1 correct;
//     otherwise replace with neutral fallback.
//   * true_frame & next_decision: remove correct, replace with neutral.
// - Option order shuffled by a fixed per-session seed.
// ============================================================

export type TrackTag = "A" | "C" | "D" | "neutral" | "correct";

export interface FramingChoice {
  id: string;
  text: string;
  trackTag: TrackTag;
}

export interface FramingSection {
  id: "client_view" | "true_frame" | "next_decision";
  title: string;
  options: FramingChoice[];
}

export interface FramingSelection {
  client_view: string | null;
  true_frame: string | null;
  next_decision: string | null;
}

// ---------- Pools ----------

const CLIENT_VIEW: Record<string, FramingChoice> = {
  cv_lower_than_expected: {
    id: "cv_lower_than_expected",
    text: "إن مبيعات الشهر أقل من اللي هو متوقّعها.",
    trackTag: "correct",
  },
  cv_team_weak: {
    id: "cv_team_weak",
    text: "إن بعض الأفراد في فريق البيع أداءهم أقل عن الباقي.",
    trackTag: "A",
  },
  cv_competitors: {
    id: "cv_competitors",
    text: "إن المنافسين حواليه بيعملوا عروض وخصومات أسبوعية بتسحب منه زباين.",
    trackTag: "C",
  },
  cv_marketing: {
    id: "cv_marketing",
    text: "إن التسويق ضعيف ومحتاج حملات إعلانية، والعملاء الجدد قلّوا.",
    trackTag: "D",
  },
  cv_market_slowdown: {
    id: "cv_market_slowdown",
    text: "إن في تراجع عام في حركة السوق وقدرة الناس على الشراء.",
    trackTag: "neutral",
  },
};

const TRUE_FRAME: Record<string, FramingChoice> = {
  tf_misleading_baseline: {
    id: "tf_misleading_baseline",
    text: "المقارنة نفسها مش متينة — بيقارن بسنة فيها تحويلات استثنائية من فروع أخرى، فالمرجع متضخّم ومفيش ضعف مبيعات حقيقي.",
    trackTag: "correct",
  },
  tf_internal_gap: {
    id: "tf_internal_gap",
    text: "بعض الأفراد في فريق المبيعات بيحققوا مبيعات أقل ومعدل إغلاق أقل بسبب غياب التدريب من سنة.",
    trackTag: "A",
  },
  tf_competitor_pressure: {
    id: "tf_competitor_pressure",
    text: "ضغط سعري حقيقي — المنافسين بيعملوا خصومات، وفي شكاوى من بعض العملاء على السعر.",
    trackTag: "C",
  },
  tf_marketing_gap: {
    id: "tf_marketing_gap",
    text: "غياب حملة تنشيط الفترة دي، والاعتماد بقى كله على الزبون الدائم بدل ما يجي عملاء جدد.",
    trackTag: "D",
  },
  tf_macro_slowdown: {
    id: "tf_macro_slowdown",
    text: "تراجع في الإقبال العام بسبب الظروف الاقتصادية، مش حاجة في المحل نفسه.",
    trackTag: "neutral",
  },
};

const NEXT_DECISION: Record<string, FramingChoice> = {
  nd_revalidate_baseline: {
    id: "nd_revalidate_baseline",
    text: "نراجع المقارنة الأول ونعزل التحويلات الاستثنائية من الفروع الأخرى قبل أي قرار.",
    trackTag: "correct",
  },
  nd_training: {
    id: "nd_training",
    text: "نعمل برنامج تدريب ومتابعة منتظمة للأفراد الضعفاء في الفريق.",
    trackTag: "A",
  },
  nd_price_response: {
    id: "nd_price_response",
    text: "نعمل عروض وخصومات لفترة قصيرة على خط معيّن عشان نواجه عروض المنافسين.",
    trackTag: "C",
  },
  nd_promo_campaign: {
    id: "nd_promo_campaign",
    text: "نطلق حملة تنشيط مدروسة بميزانية محسوبة لجذب عملاء جدد.",
    trackTag: "D",
  },
  nd_focus_bestsellers: {
    id: "nd_focus_bestsellers",
    text: "نقفل الأصناف بطيئة الحركة ونركّز على الأعلى مبيعًا بس.",
    trackTag: "neutral",
  },
};

export const CORRECT_FRAMING = {
  client_view: "cv_lower_than_expected",
  true_frame: "tf_misleading_baseline",
  next_decision: "nd_revalidate_baseline",
} as const;

export const TOTAL_FRAMING_SECTIONS = 2;

// ---------- Shuffle helper (deterministic) ----------

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Builder ----------

export interface BuildFramingOpts {
  /** Did the player open the S1 correct question ("احكيلي المشكلة")? */
  askedS1Correct: boolean;
  /** Did the player walk the full correct spine without entering any wrong track? */
  walkedFullSpine: boolean;
  /** Stable per-session seed to shuffle option order */
  shuffleSeed?: number;
}

export function buildFramingSections(opts: BuildFramingOpts): FramingSection[] {
  const { askedS1Correct, walkedFullSpine, shuffleSeed = 7 } = opts;

  // ----- Section 1: client_view -----
  let cvOptions: FramingChoice[];
  if (walkedFullSpine || askedS1Correct) {
    // Show correct + A + C + D
    cvOptions = [
      CLIENT_VIEW.cv_lower_than_expected,
      CLIENT_VIEW.cv_team_weak,
      CLIENT_VIEW.cv_competitors,
      CLIENT_VIEW.cv_marketing,
    ];
  } else {
    // Replace correct with neutral fallback
    cvOptions = [
      CLIENT_VIEW.cv_market_slowdown,
      CLIENT_VIEW.cv_team_weak,
      CLIENT_VIEW.cv_competitors,
      CLIENT_VIEW.cv_marketing,
    ];
  }

  // ----- Section 2: true_frame -----
  let tfOptions: FramingChoice[];
  if (walkedFullSpine) {
    tfOptions = [
      TRUE_FRAME.tf_misleading_baseline,
      TRUE_FRAME.tf_internal_gap,
      TRUE_FRAME.tf_competitor_pressure,
      TRUE_FRAME.tf_marketing_gap,
    ];
  } else {
    tfOptions = [
      TRUE_FRAME.tf_macro_slowdown,
      TRUE_FRAME.tf_internal_gap,
      TRUE_FRAME.tf_competitor_pressure,
      TRUE_FRAME.tf_marketing_gap,
    ];
  }

  // ----- Section 3: next_decision -----
  let ndOptions: FramingChoice[];
  if (walkedFullSpine) {
    ndOptions = [
      NEXT_DECISION.nd_revalidate_baseline,
      NEXT_DECISION.nd_training,
      NEXT_DECISION.nd_price_response,
      NEXT_DECISION.nd_promo_campaign,
    ];
  } else {
    ndOptions = [
      NEXT_DECISION.nd_focus_bestsellers,
      NEXT_DECISION.nd_training,
      NEXT_DECISION.nd_price_response,
      NEXT_DECISION.nd_promo_campaign,
    ];
  }

  return [
    {
      id: "true_frame",
      title: "1. التفسير الأدق للمشكلة",
      options: seededShuffle(tfOptions, shuffleSeed + 22),
    },
    {
      id: "next_decision",
      title: "2. القرار التالي اللي تنصح بيه",
      options: seededShuffle(ndOptions, shuffleSeed + 33),
    },
  ];
}

/** Backwards-compatible default board (full spine view). Avoid using directly. */
export const FRAMING_SECTIONS: FramingSection[] = buildFramingSections({
  askedS1Correct: true,
  walkedFullSpine: true,
  shuffleSeed: 7,
});

export function countCorrectFraming(selection: FramingSelection): number {
  let n = 0;
  if (selection.true_frame === CORRECT_FRAMING.true_frame) n++;
  if (selection.next_decision === CORRECT_FRAMING.next_decision) n++;
  return n;
}
