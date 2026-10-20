export type CaseId = "T0" | "C1" | "C2" | "C3";
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
  halaAfter: "عاش! دلوقتي نفتح دفتر العربية الحقيقي. من هنا جليتش هيجري، ومعاك ٣٠ ثانية في كل صفحة.",
  evidenceTitle: "تدريب",
  evidenceSummary: "",
  patternTip: "من الشمال لليمين، النقط طالعة.",
};

export const CASES: readonly StoryCase[] = [
  {
    id: "C1",
    title: "الحر والآيس كريم",
    question: "كل نقطة يوم. لما الجو يسخن، بنبيع كوبايات أكتر؟",
    xLabel: "درجة الحرارة",
    yLabel: "كوبايات اتباعت",
    xLabelEn: "Temperature (°C)",
    yLabelEn: "Cups sold",
    xs: [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38],
    ys: [11, 15, 12, 19, 22, 21, 28, 26, 35, 33, 39, 42],
    insight: "النقط طالعة. في الأيام السخنة غالباً بنبيع كوبايات أكتر.",
    halaAfter: "حلو! نجهّز أكتر للأيام الحر، ونشوف النتيجة. الرسم لوحده ما يقولش إن الحر هو السبب الوحيد.",
    evidenceTitle: "الحر ↔ الكوبايات",
    evidenceSummary: "حرارة أعلى مع بيع أكتر في الأيام اللي سجلناها.",
    patternTip: "من الشمال لليمين، النقط طالعة.",
  },
  {
    id: "C2",
    title: "التجهيز والانتظار",
    question: "لما نجهّز كوبايات من بدري، الناس بتستنى وقت أقل؟",
    xLabel: "كوبايات جاهزة بدري",
    yLabel: "دقايق انتظار",
    xLabelEn: "Cups ready early",
    yLabelEn: "Wait minutes",
    xs: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
    ys: [18, 16, 17, 15, 13, 14, 10, 11, 8, 7, 6, 4],
    insight: "النقط نازلة. كوبايات جاهزة أكتر مع انتظار أقل.",
    halaAfter: "التحضير بدري شكله فكرة تستاهل التجربة. بس لازم نجرب عشان نتأكد إنه السبب.",
    evidenceTitle: "التجهيز ↔ الانتظار",
    evidenceSummary: "تجهيز أكتر مع دقايق انتظار أقل في الدفتر.",
    patternTip: "من الشمال لليمين، النقط نازلة.",
  },
  {
    id: "C3",
    title: "البالونات والبيع",
    question: "جليتش بيقول البالونات بتزود البيع. النقط موافقة؟",
    xLabel: "عدد البالونات",
    yLabel: "كوبايات اتباعت",
    xLabelEn: "Balloons",
    yLabelEn: "Cups sold",
    xs: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
    ys: [28, 11, 36, 20, 33, 18, 25, 39, 14, 35, 19, 27],
    insight: "النقط متبعثرة. مفيش اتجاه واضح بين البالونات والبيع هنا.",
    halaAfter: "جليتش كان بيهزر! الرسم ده ما بيقولش إن البالونات هتزود البيع.",
    evidenceTitle: "البالونات ↔ الكوبايات",
    evidenceSummary: "البالونات والبيع: مفيش اتجاه واضح في الأيام دي.",
    patternTip: "النقط في كل حتة، مش طالعة ولا نازلة بوضوح.",
  },
];

export const ALL_CASE_IDS = CASES.map((c) => c.id);
export const MAX_SCORE = CASES.length * 3;
