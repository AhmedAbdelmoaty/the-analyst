// ============================================================
// Evidence Catalog — REPORT documents (delivered as printed papers)
// ============================================================
// Each "evidence" represents a real report Hisham El Sherif hands over.
// Carries: title, issuer (stamp), date, footnote — to feel like a real document.
// All numeric facts live HERE, never in dialogue text.

export type EvidenceChartType =
  | "bar"
  | "stacked_bar"
  | "grouped_bar"
  | "line"
  | "table"
  | "list";

export interface EvidenceDataRow {
  label: string;
  value?: number;
  // For stacked bars
  individuals?: number;
  corporate?: number;
  // For tables
  cells?: string[];
}

export interface EvidenceData {
  id: string;
  title: string;
  type: EvidenceChartType;
  caption?: string;
  /** Document metadata — gives the report-document feel */
  issuer?: string;          // "الإدارة المالية — VELARO"
  reportDate?: string;      // "مارس 2026"
  footnote?: string;        // small note printed on the paper (legacy single line)
  footnotes?: string[];     // multiple notes, each rendered on its own line
  rows: EvidenceDataRow[];
  series?: { key: "value" | "individuals" | "corporate"; label: string; color?: string }[];
  headers?: string[];
  /** Optional fixed Y axis bounds + ticks — used to exaggerate visual differences on key reports */
  yMax?: number;
  yTicks?: number[];
  /** Optional suffix to append to numeric values in labels, tooltips, and Y axis (e.g. "K"). */
  valueSuffix?: string;
}

export const EVIDENCE: Record<string, EvidenceData> = {
  // === SPINE ===
  ev_year_vs_year: {
    id: "ev_year_vs_year",
    title: "تقرير مبيعات شهرية — فبراير 2025 / فبراير 2026",
    type: "bar",
    issuer: "الإدارة المالية — VELARO",
    reportDate: "مارس 2026",
    caption: "مقارنة إجمالي المبيعات بين شهر فبراير 2026 وشهر فبراير 2025",
    footnote: "الأرقام بالألف جنيه مصري، صافي مبيعات بعد المرتجعات.",
    valueSuffix: "K",
    rows: [
      { label: "فبراير 2025", value: 720 },
      { label: "فبراير 2026", value: 500 },
    ],
    series: [{ key: "value", label: "ألف جنيه" }],
    yMax: 800,
    yTicks: [0, 100, 200, 300, 400, 500, 600, 700, 800],
  },
  ev_three_year: {
    id: "ev_three_year",
    title: "تقرير مبيعات فبراير — على مدى 3 سنين",
    type: "bar",
    issuer: "الإدارة المالية — VELARO",
    reportDate: "مارس 2026",
    caption: "مبيعات شهر فبراير في السنوات الثلاث الأخيرة.",
    footnote: "الأرقام بالألف جنيه مصري، صافي مبيعات بعد المرتجعات.",
    valueSuffix: "K",
    rows: [
      { label: "فبراير 2024", value: 480 },
      { label: "فبراير 2025", value: 720 },
      { label: "فبراير 2026", value: 500 },
    ],
    series: [{ key: "value", label: "ألف جنيه" }],
    yMax: 800,
    yTicks: [0, 100, 200, 300, 400, 500, 600, 700, 800],
  },
  ev_breakdown: {
    id: "ev_breakdown",
    title: "تقرير تفصيلي — تقسيم مبيعات فبراير حسب نوع البيع",
    type: "grouped_bar",
    issuer: "الإدارة المالية — VELARO",
    reportDate: "مارس 2026",
    caption: "مبيعات شهر فبراير أخر 3 سنوات مقسمة حسب نوعية المبيعات.",
    footnotes: [
      "الأرقام بالألف جنيه مصري، صافي مبيعات بعد المرتجعات.",
      "ملاحظة المحاسبة: في فبراير 2025 دخلت تحويلات استثنائية من فروع أخرى (حوالي 290 ألف).",
    ],
    valueSuffix: "K",
    rows: [
      { label: "فبراير 2024", individuals: 390, corporate: 90 },
      { label: "فبراير 2025", individuals: 430, corporate: 290 },
      { label: "فبراير 2026", individuals: 480, corporate: 20 },
    ],
    series: [
      { key: "individuals", label: "أفراد" },
      { key: "corporate", label: "تحويلات من فروع أخرى" },
    ],
    yMax: 500,
    yTicks: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
  },

  // === TRACK A ===
  ev_team_performance: {
    id: "ev_team_performance",
    title: "تقرير أداء فريق البيع — فبراير 2026",
    type: "bar",
    issuer: "الإدارة المالية — VELARO",
    reportDate: "مارس 2026",
    caption: "إجمالي مبيعات كل بائع للشهر الحالي.",
    footnote: "الأرقام بالألف جنيه. الفريق مكوّن من 4 بائعين بدوام كامل.",
    valueSuffix: "K",
    rows: [
      { label: "كريم", value: 160 },
      { label: "سامح", value: 105 },
      { label: "وليد", value: 85 },
      { label: "هاني", value: 70 },
    ],
    series: [{ key: "value", label: "ألف جنيه" }],
  },
  ev_team_conversion: {
    id: "ev_team_conversion",
    title: "تقرير نسبة التحويل (الإغلاق) لكل بائع",
    type: "table",
    issuer: "الإدارة المالية — VELARO",
    reportDate: "مارس 2026",
    footnote: "نسبة التحويل = عدد البيعات ÷ عدد الزباين اللي تعامل معاهم البائع.",
    headers: ["البائع", "نسبة الإقفال"],
    rows: [
      { label: "كريم", cells: ["كريم", "29%"] },
      { label: "سامح", cells: ["سامح", "21%"] },
      { label: "وليد", cells: ["وليد", "15%"] },
      { label: "هاني", cells: ["هاني", "13%"] },
    ],
  },

  // === TRACK B ===
  ev_daily_sales: {
    id: "ev_daily_sales",
    title: "تقرير المبيعات اليومية — فبراير 2026",
    type: "line",
    issuer: "الإدارة المالية — VELARO",
    reportDate: "مارس 2026",
    caption: "حركة البيع اليومية على مدار الشهر (عينة كل 3 أيام).",
    footnote: "الأرقام بالألف جنيه/يوم. الإجمالي الشهري حوالي 500 ألف جنيه.",
    valueSuffix: "K",
    rows: [
      { label: "1/2", value: 35 },
      { label: "4/2", value: 45 },
      { label: "7/2", value: 50 },
      { label: "10/2", value: 55 },
      { label: "13/2", value: 60 },
      { label: "16/2", value: 55 },
      { label: "19/2", value: 50 },
      { label: "22/2", value: 55 },
      { label: "25/2", value: 50 },
      { label: "28/2", value: 45 },
    ],
    series: [{ key: "value", label: "ألف جنيه/يوم" }],
    yMax: 80,
    yTicks: [0, 20, 40, 60, 80],
  },
  ev_weekly_sales: {
    id: "ev_weekly_sales",
    title: "تقرير المبيعات الأسبوعية — فبراير 2026",
    type: "bar",
    issuer: "الإدارة المالية — VELARO",
    reportDate: "مارس 2026",
    caption: "إجمالي البيع لكل أسبوع في الشهر.",
    footnote: "الأرقام بالألف جنيه. الأسبوع الرابع هو الأقل بشكل واضح.",
    valueSuffix: "K",
    rows: [
      { label: "أسبوع 1", value: 130 },
      { label: "أسبوع 2", value: 155 },
      { label: "أسبوع 3", value: 120 },
      { label: "أسبوع 4", value: 95 },
    ],
    series: [{ key: "value", label: "ألف جنيه" }],
    yMax: 180,
    yTicks: [0, 45, 90, 135, 180],
  },

  // === TRACK C ===
  ev_competitor_offers: {
    id: "ev_competitor_offers",
    title: "ملخص عروض المنافسين الحاليين",
    type: "list",
    issuer: "متابعة أ. هشام الشخصية",
    reportDate: "فبراير 2026",
    footnote: "ملاحظات مجمّعة من زيارات للمحلات المجاورة.",
    rows: [
      { label: "أزياء النخبة: خصم 10% على المجموعات الكاملة" },
      { label: "بوتيك ليالي: عرض اشتري قطعتين واحصل على الثالثة مجانًا على موديلات مختارة" },
      { label: "ستايل هاوس: حملة سوشيال ميديا + توصيل مجاني" },
      { label: "موضة ميلانو: كوبونات لعملاء الـ Loyalty" },
    ],
  },
  ev_customer_feedback: {
    id: "ev_customer_feedback",
    title: "ملاحظات العملاء الأخيرة",
    type: "list",
    issuer: "مدير الصالة",
    reportDate: "فبراير 2026",
    footnote: "تعليقات شفوية مسجّلة من زباين الفترة الأخيرة.",
    rows: [
      { label: "«السعر غالي شوية مقارنة بالشارع»" },
      { label: "«مفيش عروض الفترة دي»" },
      { label: "«الجودة كويسة بس بدور على خصم»" },
    ],
  },

  // === TRACK D ===
  ev_marketing: {
    id: "ev_marketing",
    title: "ملخص أداء التسويق — فبراير 2025 vs فبراير 2026",
    type: "table",
    issuer: "إدارة التسويق — VELARO",
    reportDate: "مارس 2026",
    footnotes: [
      "بيانات مجمّعة من حسابات السوشيال ميديا والإعلانات الممولة.",
      "الأرقام تشمل الإعلانات المستمرة، حتى في غياب حملات موسمية.",
    ],
    headers: ["المؤشر", "فبراير 2025", "فبراير 2026"],
    rows: [
      { label: "ميزانية", cells: ["ميزانية شهرية", "18 ألف", "12 ألف"] },
      { label: "reach", cells: ["وصول الإعلانات", "420 ألف", "380 ألف"] },
      { label: "engagement", cells: ["نسبة التفاعل", "3.1%", "2.9%"] },
      { label: "campaigns", cells: ["حملات موسمية", "2", "0"] },
    ],
  },
};
