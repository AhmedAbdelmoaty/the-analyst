export type CaseId = "T0" | "C1" | "C2" | "C3" | "C4";
export type Pattern = "up" | "down" | "none";

export interface StoryCase {
  id: CaseId;
  title: string;
  question: string;
  xLabel: string;
  yLabel: string;
  xLabelEn: string;
  yLabelEn: string;
  xs: readonly number[];
  ys: readonly number[];
  insight: string;
  halaAfter: string;
  evidenceTitle: string;
  evidenceSummary: string;
  patternTip: string;
}

export const TUTORIAL: StoryCase = {
  id: "T0",
  title: "تدريب: النقط طالعة",
  question: "كل نقطة يوم. بص على الأيام كلها: النقط ماشية فين؟",
  xLabel: "عدد اللي زاروا العربية",
  yLabel: "كوبايات اتباعت",
  xLabelEn: "Visitors",
  yLabelEn: "Ice cream cups sold",
  xs: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  ys: [3, 5, 4, 6, 7, 7, 9, 8, 10, 11],
  insight: "النقط طالعة لفوق. أيام الزوّار الكتير فيها بيع أكتر غالباً.",
  halaAfter: "عاش! دلوقتي نفتح دفتر العربية الحقيقي. من هنا جليتش هيجري، ومعاك ٢٠ ثانية في كل صفحة.",
  evidenceTitle: "تدريب",
  evidenceSummary: "",
  patternTip: "من الشمال لليمين، النقط طالعة.",
};

export const CASES: readonly StoryCase[] = [
  {
    id: "C1",
    title: "الحر والآيس كريم",
    question: "إيه شكل العلاقة بين درجة الحرارة ومبيعات الآيس كريم؟",
    xLabel: "درجة الحرارة (°م)",
    yLabel: "كوبايات اتباعت",
    xLabelEn: "Temperature (°C)",
    yLabelEn: "Cups sold",
    xs: [17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39],
    ys: [16, 35, 19, 42, 24, 58, 34, 69, 45, 80, 61, 95],
    insight: "في العينة دي، الأيام الأحر ارتبطت بمبيعات أعلى.",
    halaAfter: "نقدّر الطلب حسب الجو ونجرّب، وبعدها نراجع النتيجة. الارتباط لوحده ما يثبتش السبب.",
    evidenceTitle: "الحر ↔ الكوبايات",
    evidenceSummary: "الأيام الأحر ارتبطت بمبيعات أعلى في البيانات دي.",
    patternTip: "من الشمال لليمين، النقط طالعة.",
  },
  {
    id: "C2",
    title: "الزحمة والانتظار",
    question: "إيه شكل العلاقة بين عدد الزباين في الساعة ومتوسط الانتظار؟",
    xLabel: "زباين في الساعة",
    yLabel: "متوسط الانتظار (دقيقة)",
    xLabelEn: "Customers per hour",
    yLabelEn: "Average wait (minutes)",
    xs: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52],
    ys: [3, 7, 5, 9, 10, 12, 11, 15, 14, 18, 17, 22],
    insight: "في الساعات اللي فيها زباين أكتر، كان متوسط الانتظار أطول.",
    halaAfter: "وقت الزحمة والانتظار بيتحركوا سوا في السجل؛ نحتاج نحسن سرعة الخدمة ونراجعها.",
    evidenceTitle: "الزحمة ↔ الانتظار",
    evidenceSummary: "الساعات المزدحمة ارتبطت بانتظار أطول في العينة.",
    patternTip: "من الشمال لليمين، النقط طالعة.",
  },
  {
    id: "C3",
    title: "التحضير والبيع",
    question: "هل عدد الكوبايات المحضّرة بيتحرك مع عدد الكوبايات المباعة؟",
    xLabel: "كوبايات اتحضّرت",
    yLabel: "كوبايات اتباعت",
    xLabelEn: "Cups prepared",
    yLabelEn: "Cups sold",
    xs: [52, 58, 63, 69, 74, 80, 86, 91, 98, 104, 111, 118],
    ys: [34, 71, 45, 60, 29, 76, 51, 42, 68, 37, 81, 55],
    insight: "كل المبيعات أقل من التحضير، لكن النقط في العينة دي مش بتوضح اتجاهًا خطيًا.",
    halaAfter: "كل الكوبايات المباعة كانت من اللي اتحضّرت، لكن كمية التحضير وحدها ما بتتنبأش بالمبيعات هنا.",
    evidenceTitle: "التحضير ↔ البيع",
    evidenceSummary: "المباع لم يتجاوز المحضّر؛ لا يظهر اتجاه خطي واضح في العينة.",
    patternTip: "النقط في كل حتة، مش طالعة ولا نازلة بوضوح.",
  },
  {
    id: "C4",
    title: "الانتظار وإتمام الشراء",
    question: "إيه شكل العلاقة بين وقت الانتظار وإتمام الزباين للشراء؟",
    xLabel: "متوسط الانتظار (دقيقة)",
    yLabel: "الزباين اللي كملوا الشراء (%)",
    xLabelEn: "Average wait (minutes)",
    yLabelEn: "Purchase completion (%)",
    xs: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22],
    ys: [95, 91, 87, 83, 80, 74, 69, 64, 59, 53, 49, 44],
    insight: "في السجل، الانتظار الأطول ارتبط بإتمام شراء أقل.",
    halaAfter: "تقليل الانتظار يستحق التجربة، وهنراجع هل نسبة إتمام الشراء اتحسنت فعلًا.",
    evidenceTitle: "الانتظار ↔ إتمام الشراء",
    evidenceSummary: "الانتظار الأطول ارتبط بنسبة إتمام شراء أقل في العينة.",
    patternTip: "من الشمال لليمين، النقط نازلة.",
  },
];

export const ALL_CASE_IDS = CASES.map((c) => c.id);
export const MAX_SCORE = CASES.length * 3;
