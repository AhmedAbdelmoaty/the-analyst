import { renderMaleText, type GenderText } from "@/lib/genderText";

// ============================================================
// Hisham (هشام) voice-over mapping
// ------------------------------------------------------------
// Maps Hisham's exact dialogue reply text → audio file path.
// Keys MUST match the dialogue text in:
//   - src/lib/pf-case/mansour-scripts.ts  (HISHAM_GREETING)
//   - src/lib/pf-case/case-tree.ts        (SPINE.*.correct/wrong.hishamReply, TRACKS.*.topics[].hishamReply, TRACKS.*.conclusion.hishamReply)
//
// If a Hisham line is not in this map, it will play with NO audio
// (we never substitute another file).
// ============================================================

const HESHAM_VOICE_BASE = "/voiceover/hesham";

/**
 * Normalize for matching: collapse whitespace, trim.
 * Some script strings have leading spaces (e.g. S2 wrong, S3 correct);
 * normalization keeps the lookup robust.
 */
const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

const RAW_MAP: Record<string, string> = {
  // ---------------- ARRIVAL ----------------
  "أهلا وسهلا، نوّرت. اتفضل اقعد، أستاذ منصور كلمني عنك وقالي انك محلل بيانات شاطر.":
    `${HESHAM_VOICE_BASE}/hisham_arrival_01_welcome.mp3`,
  "والله يا فندم… الشهر اللي فات ده حاسس إن في حاجة في الشغل مش ماشية. الحركة موجودة، بس فيه حاجة ناقصة.":
    `${HESHAM_VOICE_BASE}/hisham_arrival_02_problem_feeling.mp3`,

  // ---------------- SPINE (S1..S5) ----------------
  // S1 correct
  "والله يا فندم، المحل فيه حركة كويسة. بس في آخر الشهر لما قعدت أبصّ على التقارير، لقيت المبيعات قليلة، الرقم اللي طالعلي أقل من المتوقّع.":
    `${HESHAM_VOICE_BASE}/hisham_s1_correct_problem_open.mp3`,
  // S1 wrong (sales team entry)
  "والله ممكن يا فندم. الفريق عندي من زمان، بس فعلاً ممكن يكونوا قصروا في حاجة. خلينا نبص ونشوف.":
    `${HESHAM_VOICE_BASE}/hisham_s1_wrong_sales_team_entry.mp3`,

  // S2 correct (baseline)
  "أنا قارنت بنفس الشهر السنة اللي فاتت، فبراير 2025. لقيت فبراير السنة دي أقل بحوالي 30%. الرقم ده بالنسبالي كبير، مش حاجة أقدر أعديها.":
    `${HESHAM_VOICE_BASE}/hisham_s2_correct_baseline.mp3`,
  // S2 wrong (daily sales report)
  "ده تقرير المبيعات اليومية للشهر ده. هتلاقي أيام الحركة فيها كويسة، وأيام تانية أهدى شوية.":
    `${HESHAM_VOICE_BASE}/hisham_s2_wrong_daily_sales_report.mp3`,

  // S3 correct (year report)
  "أنا طلبت من المحاسبة تطبعلي التقرير لما بدأت أقلق. اتفضل، خد التقرير ده وبص بنفسك.":
    `${HESHAM_VOICE_BASE}/hisham_s3_correct_year_report.mp3`,
  // S3 wrong (competitors entry)
  "المنافسة بقت أقوى شوية الفترة دي. المحلات حواليّا بقت بتعمل عروض وخصومات كتير. ده تقرير ملخص عروض المنافسين.":
    `${HESHAM_VOICE_BASE}/hisham_s3_wrong_competitors_entry.mp3`,

  // S4 correct (3-year report)
  "مفيش مشكلة. خليني أطلب التقرير من المحاسبة… اتفضل ده التقرير. شوف بنفسك.":
    `${HESHAM_VOICE_BASE}/hisham_s4_correct_three_year_report.mp3`,
  // S4 wrong (competitor offers entry — file on disk is "competitor_prices")
  "اتفضل. ده تقرير فيه العروض والخصومات من المحلات اللي حوالينا.":
    `${HESHAM_VOICE_BASE}/hisham_s4_wrong_competitor_prices.mp3`,

  // S5 correct (breakdown)
  "آه طبعًا، عندي تقرير بيقسّم المبيعات. اتفضل.":
    `${HESHAM_VOICE_BASE}/hisham_s5_correct_breakdown.mp3`,
  // S5 wrong (marketing entry)
  "اتفضل يا فندم، ده تقرير التسويق بتاع السنة دي والسنة اللي فاتت. هتلاقي فيه الميزانية والأرقام.":
    `${HESHAM_VOICE_BASE}/hisham_s5_wrong_marketing_entry.mp3`,

  // ---------------- TRACK A — Sales team ----------------
  "أكيد يا فندم. اتفضل، ده التقرير. هتلاقي في فروق بين الأفراد.":
    `${HESHAM_VOICE_BASE}/hisham_track_a_01_team_performance.mp3`,
  "ده تقرير فيه نسبة التحويل لكل فرد داخل الفريق.":
    `${HESHAM_VOICE_BASE}/hisham_track_a_02_team_conversion.mp3`,
  "بصراحة يا فندم… آخر تدريب عملته للفريق بقاله سنة. والمتابعة اليومية مش منتظمة أوي.":
    `${HESHAM_VOICE_BASE}/hisham_track_a_03_team_training.mp3`,
  "تمام يا فندم… انا كده شوفت الصورة بالكامل، شكرا جدا.":
    `${HESHAM_VOICE_BASE}/hisham_track_a_04_conclusion.mp3`,

  // ---------------- TRACK C — Competitors / pricing ----------------
  // NOTE: c_competitor_offers topic ("اتفضل يا فندم، ده اللي جمعته من حوالينا...")
  // has no provided audio file — intentionally left silent (no substitution).
  "بعض الزباين فعلاً اشتكوا من أسعار بعض الموديلات، أو سألوا على خصم، بس مش كلهم. ده ملف فيه ملاحظات الزباين الفترة الأخيرة.":
    `${HESHAM_VOICE_BASE}/hisham_track_c_01_customer_price_feedback.mp3`,
  "ممكن يا فندم، عرض محدود على خط معين يبقى أفضل من خصم عام.":
    `${HESHAM_VOICE_BASE}/hisham_track_c_02_price_response.mp3`,
  "تمام يا فندم… كلام منطقي وهنبدأ ناخد خطوة الخصومات والعروض. شكرا جدا.":
    `${HESHAM_VOICE_BASE}/hisham_track_c_03_conclusion.mp3`,

  // ---------------- TRACK D — Marketing ----------------
  "لأ يا فندم، مفيش حملة تنشيط مخصصة اتعملت الشهر ده. بس في إعلانات عادية شغالة طول الوقت بميزانية أقل.":
    `${HESHAM_VOICE_BASE}/hisham_track_d_01_active_campaign.mp3`,
  "الأونلاين أهدى شوية… بس لسه في بيع جاي منه، وكمان في ناس بتيجي المحل.":
    `${HESHAM_VOICE_BASE}/hisham_track_d_02_new_vs_returning.mp3`,
  "اتفضل يا فندم. ده تقرير التسويق بميزانية وأرقام السنتين جنب بعض.":
    `${HESHAM_VOICE_BASE}/hisham_track_d_03_marketing_report.mp3`,
  "كلام منطقي يا فندم. الصورة دلوقتي بقت أوضح... التسويق أكيد له تأثير كبير.":
    `${HESHAM_VOICE_BASE}/hisham_track_d_04_conclusion.mp3`,
};

// Pre-normalize keys once.
const NORMALIZED_MAP: Map<string, string> = new Map(
  Object.entries(RAW_MAP).map(([k, v]) => [normalize(k), v])
);

/**
 * Look up Hisham's voice-over file for a given reply text.
 * Returns undefined if no audio is mapped (line will play silently — never substituted).
 */
export const getHeshamVoice = (text: GenderText | undefined): string | undefined => {
  if (!text) return undefined;
  return NORMALIZED_MAP.get(normalize(renderMaleText(text)));
};
