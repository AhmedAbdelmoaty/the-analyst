import { renderMaleText, type GenderText } from "@/lib/genderText";
import { getVoiceoverSrc } from "@/lib/voiceover/genderedDialogue";

// ============================================================
// Analyst (player) voice-over map
// ------------------------------------------------------------
// Each analyst line has TWO recorded versions:
//   - male:   /voiceover/analyst_male/<name>.mp3
//   - female: /voiceover/analyst_female/<name>_female.mp3
//
// All 27 male files have a confirmed female counterpart.
// Lookup is text-based with whitespace normalization so small
// formatting differences in the source scripts don't break it.
// ============================================================

export type Gender = "male" | "female";

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

// Male path map. Keys = exact analyst line text from scripts.
const RAW_MALE_MAP: Record<string, string> = {
  // ---------- With Mansour (intro) ----------
  "تمام يا أستاذ منصور، هروح وأحاول أفهم الصورة كاملة.":
    "/voiceover/analyst_male/analyst_intro_with_mansour_01_accept_task.mp3",

  // ---------- Hisham greeting ----------
  "شكرا جدا يا أستاذ هشام. أستاذ منصور قالي إن حضرتك عاوز تتكلم في موضوع شاغلك.":
    "/voiceover/analyst_male/analyst_arrival_hisham_01_greeting.mp3",
  "متشغلش بالك. خلينا نهدى ونفهم سوا. هسألك كام سؤال، وانت قولي اللي عندك.":
    "/voiceover/analyst_male/analyst_arrival_hisham_02_calm_start.mp3",

  // ---------- Spine S1–S5 (correct) ----------
  "خلينا نبدأ من الأول يا أستاذ هشام. إيه اللي خلاك تحس إن في مشكلة؟ حصل إيه بالظبط في الشهر ده؟":
    "/voiceover/analyst_male/analyst_s1_correct_open_problem.mp3",
  "طب خلينا نقف هنا. لما بتقول المبيعات أقل من المتوقع، ممكن تقولي قلت بنسبة قد ايه وحضرتك بتقارن بإيه؟":
    "/voiceover/analyst_male/analyst_s2_correct_baseline.mp3",
  "طب ممكن أشوف تقارير المبيعات الخاصة بالسنتين؟":
    "/voiceover/analyst_male/analyst_s3_correct_ask_report.mp3",
  "حضرتك بتقارن بسنة واحدة بس. ممكن نشوف مبيعات فبراير لآخر 3 سنين؟ عشان نعرف هل سنة 2025 كانت طبيعية ولا لأ؟":
    "/voiceover/analyst_male/analyst_s4_correct_three_years.mp3",
  "ممكن أشوف تقرير تفصيلي للمبيعات مش بس رقم اجمالي؟":
    "/voiceover/analyst_male/analyst_s5_correct_breakdown.mp3",

  // ---------- Spine S1–S5 (wrong entry) ----------
  "أستاذ هشام، عندي إحساس إن المشكلة دي غالبًا من فريق البيع. يمكن مش بيتحركوا زي الأول. ممكن نبص على شغلهم الأول؟":
    "/voiceover/analyst_male/analyst_s1_wrong_sales_team_entry.mp3",
  "تمام، ممكن أبص على تقرير مبيعات الشهر ده؟ خلينا نشوف الأرقام الأول.":
    "/voiceover/analyst_male/analyst_s2_wrong_sales_report_entry.mp3",
  "طب قبل ما نكمل، المنافسين حواليك بيعملوا إيه دلوقتي؟ ممكن السوق بقى أصعب.":
    "/voiceover/analyst_male/analyst_s3_wrong_competitors_entry.mp3",
  "إيه طبيعة العروض اللي بيقدمها المنافسين دلوقتي؟":
    "/voiceover/analyst_male/analyst_s4_wrong_competitor_offers_entry.mp3",
  "طب ممكن نبص على أداء الحملات الإعلانية الأخيرة؟ لأن انا شاكك ان هي السبب.":
    "/voiceover/analyst_male/analyst_s5_wrong_marketing_entry.mp3",

  // ---------- Track A — sales team ----------
  "ممكن أشوف تقرير بأداء كل واحد في فريق المبيعات؟":
    "/voiceover/analyst_male/analyst_a_team_performance.mp3",
  "طب ممكن نبص على نسبة التحويل لكل فرد في الفريق؟":
    "/voiceover/analyst_male/analyst_a_team_conversion.mp3",
  "في تدريب أو متابعة منتظمة بتعملها للفريق؟ آخر تدريب كان امتى؟":
    "/voiceover/analyst_male/analyst_a_team_training.mp3",
  "تمام، الصورة بقت أوضح. فيه ضعف تنفيذ ومتابعة من ناحية الفريق.":
    "/voiceover/analyst_male/analyst_a_conclusion.mp3",

  // ---------- Track C — competitors / pricing ----------
  "فيه زباين عندك بيشتكوا من السعر مقارنة بالسوق؟":
    "/voiceover/analyst_male/analyst_c_customer_price_feedback.mp3",
  "نعمل رد سعري تنافسي. عرض محدد لفترة قصيرة على خط معين؟":
    "/voiceover/analyst_male/analyst_c_price_response.mp3",
  "كده الصورة بقت أوضح، السوق بيضغط على السعر ومحتاجين تحرك سعري.":
    "/voiceover/analyst_male/analyst_c_conclusion.mp3",

  // ---------- Track D — marketing / demand ----------
  "هل في أي حملة تنشيط أو ترويج كانت شغالة الشهر ده؟":
    "/voiceover/analyst_male/analyst_d_active_campaign.mp3",
  "طب البيع الشهر ده جاي أكتر من الإعلانات الأونلاين، ولا من زيارات المحل؟":
    "/voiceover/analyst_male/analyst_d_new_vs_returning.mp3",
  "ممكن نبص على ملخص أداء التسويق السنة دي مقارنة بالسنة اللي فاتت؟":
    "/voiceover/analyst_male/analyst_d_marketing_report.mp3",
  "يبقى محتاجين حملة تنشيط مدروسة قبل الموسم الجاي، بميزانية محسوبة.":
    "/voiceover/analyst_male/analyst_d_conclusion.mp3",

  // ---------- Mansour final call (debrief) ----------
  "الفضل كله يرجع لدبلومة تحليل البيانات من IMP.":
    "/voiceover/analyst_male/analyst_ending_strong_response.mp3",
};

const NORMALIZED_MAP: Map<string, string> = new Map(
  Object.entries(RAW_MALE_MAP).map(([k, v]) => [normalize(k), v]),
);

/**
 * Convert a male analyst path to its female counterpart:
 *   /voiceover/analyst_male/foo.mp3 → /voiceover/analyst_female/foo_female.mp3
 */
export const toAnalystFemalePath = (maleSrc: string): string => {
  return getVoiceoverSrc(maleSrc, "female") ?? maleSrc;
};

/**
 * Resolve the correct analyst voice file for a line, by gender.
 * Returns undefined if the line text has no mapped voice.
 */
export const getAnalystVoice = (
  text: GenderText | undefined,
  gender: Gender | null | undefined,
): string | undefined => {
  if (!text) return undefined;
  const male = NORMALIZED_MAP.get(normalize(renderMaleText(text)));
  if (!male) return undefined;
  return gender === "female" ? toAnalystFemalePath(male) : male;
};

/**
 * If `src` is an analyst male path, swap to its female variant (when gender=female).
 * For non-analyst paths, returns the input unchanged.
 */
export const swapAnalystSrcByGender = (
  src: string | undefined,
  gender: Gender | null | undefined,
): string | undefined => {
  if (!src) return src;
  if (gender !== "female") return src;
  if (src.includes("/voiceover/analyst_male/")) return toAnalystFemalePath(src);
  return src;
};
