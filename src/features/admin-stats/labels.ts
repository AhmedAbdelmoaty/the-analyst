export const GAMES = [
  { key: "problem-framing", label: "اسأل صح" },
  { key: "reward-decision", label: "قرار التكريم" },
] as const;
export const gameLabel = (k: string) => GAMES.find(g => g.key === k)?.label ?? k;

export const OUTCOME_LABEL: Record<string, string> = {
  strong: "قوية", weak: "ضعيفة",
  supported: "توصية مدعومة", insufficient: "توصية غير كافية", criterion_mismatch: "لا تطابق المعيار",
  unknown: "غير مسجلة",
};
export const outcomeLabel = (k?: string | null) => (k ? OUTCOME_LABEL[k] ?? k : "—");

export const REASON_LABEL: Record<string, string> = {
  complete: "مكتملة", wrong_team: "فريق غير مدعوم", wrong_document: "مستند غير مناسب",
  missing_performance: "تنقصها حجة الأداء", missing_spread: "تنقصها حجة التقارب", weak_arguments: "حجج غير صحيحة",
};
export const TOOL_LABEL: Record<string, string> = { mean: "المتوسط", median: "الوسيط", range: "المدى", sd: "الانحراف المعياري", iqr: "المدى الربيعي" };
export const TEAM_LABEL: Record<string, string> = { marwan: "فريق مروان", mahmoud: "فريق محمود" };

export const STAGE_LABEL: Record<string, string> = {
  "company-briefing": "التكليف", travel: "الطريق", "velaro-street": "الشارع", arrival: "الوصول", inquiry: "التحقيق",
  reflection: "التفكير", framing: "صياغة المشكلة", "email-send": "إرسال التقرير", "mansour-receives": "استلام منصور",
  "incoming-call": "مكالمة واردة", "phone-call": "المكالمة", result: "النتيجة", "time-up": "انتهى الوقت",
  celebration: "الاحتفال", debate: "النقاش", briefing: "التكليف", hub: "المكتب", sales: "مقابلة المبيعات", hr: "مقابلة HR",
  workbench: "التحليل", recommendation: "التوصية", meeting: "الاجتماع", resolution: "المكالمات", debrief: "الخلاصة",
  unknown: "غير مسجلة",
};
export const stageLabel = (k?: string | null) => (k ? STAGE_LABEL[k] ?? k : "—");

export const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "incomplete", label: "غير مكتملة" },
  { value: "submitted", label: "قُدّم التقرير/التوصية" },
  { value: "completed", label: "مكتملة" },
  { value: "timed_out", label: "انتهى الوقت" },
  { value: "o:strong", label: "النتيجة: قوية" },
  { value: "o:weak", label: "النتيجة: ضعيفة" },
  { value: "o:supported", label: "النتيجة: توصية مدعومة" },
  { value: "o:insufficient", label: "النتيجة: غير كافية" },
  { value: "o:criterion_mismatch", label: "النتيجة: لا تطابق المعيار" },
];

/** Higher is better, per game; used for "best result". */
export const OUTCOME_RANK: Record<string, number> = { weak: 1, strong: 2, criterion_mismatch: 1, insufficient: 2, supported: 3 };

export function roundStatus(r: { completed_at?: string | null; timed_out_at?: string | null; submitted_at?: string | null; started_at?: string | null }) {
  if (r.completed_at) return "مكتملة";
  if (r.timed_out_at) return "انتهى الوقت";
  if (r.submitted_at) return "قُدّم التقرير";
  return "غير مكتملة";
}

export function fmtMs(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
