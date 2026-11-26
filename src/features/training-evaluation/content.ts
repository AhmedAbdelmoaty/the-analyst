import { supports, type ClaimId, type EvidenceId, type QuestionId } from "./engine";

export type Speaker = "seif" | "tarek" | "player";
export type Mood = "confident" | "thinking" | "surprised" | "happy" | "facepalm";
export interface Line { who: Speaker; text: string; mood?: Mood; thought?: boolean; voice?: string }

export const VOICE_DURATIONS: Record<string, number> = {
  // Seif briefing
  "seif-brief-1.wav": 6.25,
  "seif-brief-2.wav": 15.25,
  // Sayes parking
  "sayes-park.wav": 9.48,
  "sayes-ask.wav": 1.4,
  "sayes-later.wav": 3.55,
  "sayes-ten.wav": 3.4,
  "sayes-fifty.wav": 8.55,
  // Meeting: Tarek & Player
  "tarek-1.wav": 2.3,
  "player-1.wav": 3.9,
  "tarek-2.wav": 12.55,
  "tarek-3.wav": 10.95,
  "player-2.wav": 5.3,
  // Endings: Seif win
  "seif-win.wav": 13.6,
  // Endings: Sayes call cheap
  "sayes-loss-1.wav": 7.75,
  "sayes-loss-2.wav": 30.9,
  "sayes-loss-3.wav": 9.85,
  // Endings: Sayes call fifty
  "sayes-fifty-loss-1.wav": 4.9,
  "sayes-fifty-loss-2.wav": 30.7,
  "sayes-fifty-loss-3.wav": 9.9,
  // Mid-game Sayes popup
  "sayes-popup-later.wav": 12.65,
  "sayes-popup-paid.wav": 9.43,
  "sayes-popup-ten.wav": 11.03,
  "sayes-popup-ten-paid.wav": 6.89,
  "sayes-popup-fifty-wrong.wav": 10.59,
  "sayes-popup-fifty.wav": 5.42,
  "sayes-popup-paid-correct.wav": 2.75,
  "sayes-timeout.wav": 1.5,
};

export const TITLE = "Training Evaluation";
export const SUBTITLE_AR = "كورس تدريبي واحد.. مجموعتان.. وقرار مصيري مستني رأيك.";

export const BRIEF: Line[] = [{
  who: "seif",
  mood: "thinking",
  text: "دلوقتي الشركة عندنا متعاقدة مع شركة تدريب وقدمولنا كورس لمجموعتين من الموظفين من نفس الإدارة",
  voice: "seif-brief-1.wav",
}, {
  who: "seif",
  mood: "thinking",
  text: "تقييم المجموعة الأولى طلع 90% وبعدها لما المجموعة التانية أخدوا الكورس التقييم طلع 78%، ودلوقتي مش عارفين نجدد لنفس الشركة ولا نغيرها.. روح لطارق مدير التدريب افهم منه الصورة كاملة وقولي شايف الصح إيه.",
  voice: "seif-brief-2.wav",
}];

export const MEETING: Line[] = [
  { who: "tarek", mood: "happy", text: "يا مرحب يا مرحب.. إيه الأخبار؟", voice: "tarek-1.wav" },
  { who: "player", text: "تمام يا أستاذ طارق.. احكيلي كده القصة كلها من الأول خليني افهم.", voice: "player-1.wav" },
  { who: "tarek", mood: "confident", text: "شوف يا سيدي, احنا اتعاقدنا مع شركة تدريب لمجموعتين من نفس الادارة, المجموعة الاولى كان تقيمها 90% وبعد شهر المجموعة التانية أخدت الكورس وتقييمهم كان 78%", voice: "tarek-2.wav" },
  { who: "tarek", mood: "confident", text: "الاستبيان ده اتعمل في آخر محاضرة، وطبعاً زي ما أنت عارف بنحاول نملاه مع أكبر عدد ممكن من الناس، وواضح إن التقييم قل في المجموعة التانية عن الأولى.. عايز أعرف ليه التقييم قل.", voice: "tarek-3.wav" },
  { who: "player", text: "تمام يا أستاذ طارق، هدخل مكتبي أراجع الأرقام وارجع لمستر سيف بالتوصية المظبوطة.", voice: "player-2.wav" },
];

export const THOUGHTS = {
  guess: "أكيد محتاج أعرف ليه التقييم قل من 90% لـ 78%؟",
  data: "💭 محتاج أبص على الداتا.. عشان الأرقام بتتكلم ومبتكدبش.",
  ask: "محتاج أسأل شوية أسئلة الأول عشان أفهم الوضع.",
} as const;

export const GUESSES = [
  { id: "trainer" as const, text: "المشكلة في المحاضر وطريقة شرحه." },
  { id: "trainees" as const, text: "المشكلة في المتدربين ومش متوفر فيهم المهارات الأساسية." },
  { id: "data" as const, text: "محتاج أبص على الداتا الأول عشان مفيش أي دليل واضح." },
];

export interface Metric {
  id: EvidenceId;
  label: string;
  labelAr: string;
  source: "LMS" | "Survey";
  a: number;
  b: number;
  unit?: "%";
  max: number;
  note: string;
}

export const METRICS_LIST: Metric[] = [
  { id: "participants", label: "Course Participants", labelAr: "إجمالي المشاركين في الكورس", source: "LMS", a: 50, b: 50, max: 60, note: "عدد المسجلين رسمياً في السيستم لكل مجموعة." },
  { id: "complaintsRate", label: "Complaints Rate", labelAr: "نسبة الشكاوى من المستجيبين", source: "Survey", a: 10, b: 22, unit: "%", max: 30, note: "نسبة من أبدوا ملاحظات سلبية من بين من ملأوا الاستبيان." },
  { id: "complaints", label: "Complaints Count", labelAr: "عدد الشكاوى المسجلة", source: "Survey", a: 3, b: 10, max: 12, note: "إجمالي الشكاوى الفردية المرصودة في نماذج الاستبيان." },
  { id: "satisfaction", label: "Satisfaction Rate", labelAr: "نسبة الرضا العامة", source: "Survey", a: 90, b: 78, unit: "%", max: 100, note: "متوسط تقييم جودة التدريب في الاستبيان الورقي." },
  { id: "attendance", label: "Attendance Rate", labelAr: "نسبة الحضور الفعلي", source: "LMS", a: 75, b: 95, unit: "%", max: 100, note: "سجلات الحضور عبر البصمة الإلكترونية للقاعات." },
  { id: "assignments", label: "Assignment Submission", labelAr: "تسليم الواجبات الدورية", source: "LMS", a: 35, b: 35, max: 50, note: "عدد المتدربين المسلمين للواجبات عبر منصة LMS." },
  { id: "projects", label: "Project Submission", labelAr: "تسليم المشاريع العملية", source: "LMS", a: 30, b: 35, max: 50, note: "المشاريع النهائية المعتمدة من مقيّم الدورة." },
  { id: "respondents", label: "Survey Respondents", labelAr: "عدد المشاركين في الاستبيان", source: "Survey", a: 30, b: 45, max: 60, note: "عدد النماذج المكتملة التي تم استلامها بنهاية المحاضرة الأخيرة." },
];

export const METRICS: Record<EvidenceId, Metric> = Object.fromEntries(METRICS_LIST.map((m) => [m.id, m])) as Record<EvidenceId, Metric>;

export const QUESTIONS: { id: QuestionId; text: string; shows?: EvidenceId; na?: boolean }[] = [
  { id: "complaintsOfAll", text: "عايز أعرف نسبة الشكاوى من إجمالي الحضور.", na: true },
  { id: "attendance", text: "عايز نسبة الحضور الفعلي للمجموعتين.", shows: "attendance" },
  { id: "respondents", text: "عايز أعرف عدد المشاركين في الاستبيان مقارنة بإجمالي المتدربين.", shows: "respondents" },
  { id: "complaintsCount", text: "عايز عدد الشكاوى اللي اترصدت في الاستبيان.", shows: "complaints" },
  { id: "allData", text: "عايز أبص على الداتا المتاحة." },
];

export const CLAIM_LABELS: Record<ClaimId, string> = {
  aBetter: "المجموعة الأولى أفضل من المجموعة الثانية",
  bBetter: "المجموعة الثانية أفضل من المجموعة الأولى",
  equal: "الفريقان متساويان في المستوى",
  notRep: "عدد المشاركين في الاستبيان لا يمثل المتدربين والبيانات لا تظهر أي مجموعة أفضل من الأخرى بسبب وجود تحيز الاختيار",
  trainer: "المشكلة في المحاضر وطريقة شرحه",
  trainees: "المشكلة في المتدربين وضعف مهاراتهم",
};

export const CONFIRM_PAIR = "هل إنت متأكد إن الدليل ده يتماشى مع الاستنتاج";
export const EMAIL_BODIES: Record<ClaimId, string> = {
  aBetter: "بعد مراجعة البيانات، المجموعة الأولى أفضل من المجموعة الثانية، وأوصي بالتواصل مع مقدم الخدمة التدريبية لحل أسباب انخفاض تقييم المجموعة الثانية عن الأولى والتعهد بالحفاظ على جودة التدريب مع المجموعات المستقبلية وإلا فسخنا التعاقد.",
  bBetter: "بعد مراجعة البيانات، المجموعة الثانية أفضل من المجموعة الأولى، وأوصي بالتواصل مع مقدم الخدمة التدريبية لتطوير الأنشطة التفاعلية لزيادة نسبة الحضور.",
  equal: "بعد مراجعة الأرقام، الفريقين متساويين في المستوى، ولا توجد أي مشكلة.",
  notRep: "بعد مراجعة طريقة تجميع البيانات الخاصة بالاستبيان تبين أن التقييم تم في المحاضرة الاخيرة ولم يشارك فيه 40% من المتدربين اللذين انسحبوا مبكرا لعدة اسباب ربما لأسباب تتعلق بعدم رضاهم عن البرنامج التدريبي أو أسباب أخرى وهذا ما نسميه بتحيز الاختيار.\nوبناء عليه لايمكنني اعتماد نتائج تقييم المجموعة الأولى ولا أتفق مع مدير التدريب أن التقييم انخفض من 90% الى 78 %.\nأوصى باعادة تقييم المجموعة الأولى",
  trainer: "المشكلة في المحاضر وطريقة شرحه، وأوصي بتغيير المحاضر في الكورس القادم.",
  trainees: "المشكلة في المتدربين ومش متوفر فيهم المهارات الأساسية، وأوصي بمراجعة اختيار المرشحين.",
};

export const GENERAL_EMAIL_BODIES: Partial<Record<ClaimId, string>> = {
  aBetter: "بعد مراجعة البيانات المرفقة، المجموعة الأولى أفضل من المجموعة الثانية، ونوصي بالاستمرار مع شركة التدريب الحالية واعتماد أسلوب تدريب المجموعة الأولى كمعيار أساسي.",
  bBetter: "بعد مراجعة البيانات المرفقة، المجموعة الثانية أفضل من المجموعة الأولى، ونوصي بالتواصل مع مقدم الخدمة وتعميم تجربة المجموعة الثانية على باقي الإدارات.",
  equal: "بعد مراجعة البيانات المرفقة، الفريقان متساويان في المستوى العام ولا توجد فروق جوهرية تستدعي تغيير شركة التدريب.",
  notRep: "بناءً على المؤشر المرفق، أرى أن بيانات التقييم غير كافية وأوصي بإعادة مراجعة شمولية العينة قبل اتخاذ القرار.",
};

export function emailBody(claim: ClaimId, evidence: EvidenceId | null): string {
  if (claim === "trainer" && evidence === "complaints") {
    return "بناءً على أن عدد الشكاوى في المجموعة الثانية أكثر، المشكلة في المحاضر وطريقة شرحه، وأوصي بتغيير المحاضر في الكورس القادم.";
  }
  if (claim === "trainees" && evidence === "attendance") {
    return "المشكلة في المتدربين ومش متوفر فيهم المهارات الأساسية، وأوصي بمراجعة اختيار المرشحين، بناءً على معدل الحضور وعدم الالتزام.";
  }
  if (evidence && supports(claim, evidence)) return EMAIL_BODIES[claim];
  return GENERAL_EMAIL_BODIES[claim] ?? EMAIL_BODIES[claim];
}

export interface Takeaway { q: string; a: string }

export const TAKEAWAYS: Record<"win" | "loss", Takeaway[]> = {
  win: [
    { q: "اللي ظهر في الأول", a: "تقييم المجموعة الأولى كان 90% وتقييم المجموعة الثانية كان 78%، وظاهرياً بدا إن المجموعة الثانية فيها مشكلة أو شكاوى أكتر." },
    { q: "اللي كان مستخبي", a: "في المجموعة الأولى لم يشارك سوى 30 موظفاً من 50 (المتسربون لم يقيموا)، بينما المجموعة الثانية شارك 45 موظفاً بنسبة حضور 95%." },
    { q: "القاعدة التحليلية", a: "متقارنش استبيانات بنسب مئوية قبل ما تتأكد إن نسبة تمثيل العينة متكافئة (تجنب الـ Survivorship Bias)." },
  ],
  loss: [
    { q: "الخطأ اللي حصل", a: "الاعتماد على النتيجة الإجمالية المباشرة دون فحص معدل الاستجابة ونسبة الحضور الفعلي." },
    { q: "الحقيقة في الأرقام", a: "نسبة الاستجابة في المجموعة الأولى كانت 60% فقط مقابل 90% في المجموعة الثانية؛ المقارنة لم تكن عادلة." },
    { q: "الدرس للمستقبل", a: "افحص حجم العينة وتمثيلها قبل إصدار أي توصية إدارية مصيرية." },
  ],
};

export interface Ending { stamp: string; lines: Line[]; title: string; desc: string }

export const WIN: Ending = {
  stamp: "قرار استراتيجي معتمد",
  title: "المحلل الاستراتيجي",
  desc: "كشفت تحيز العينة (Survivorship Bias) في التقييم وحميت الشركة من فسخ تعاقد ممتازة بناءً على أرقام وهمية!",
  lines: [{
    who: "seif",
    mood: "happy",
    text: "الله ينور عليك! هو ده الشغل المظبوط.. فكرت صح وبدأت بالسؤال الصح، مغرقتش في الداتا والأرقام وخلاص ولحقت الشركة من قرار كارثي كان هيكلفنا تغيير شركة تدريب ممتازة!",
    voice: "seif-win.wav",
  }],
};

export const LOSS_GUESS: Ending = {
  stamp: "قرار متسرع",
  title: "المتسرع بالتخمين",
  desc: "ألقيت اللوم دون أي دليل أو مراجعة للأرقام.. القرارات الإدارية لا تُبنى على التخمين!",
  lines: [{ who: "seif", mood: "facepalm", text: "مين قالك إن التقييم قلّ أصلاً؟! إنت مبصتش على الأرقام ولا راجعت مين اللي شارك، ورميت اللوم كده وخلاص من غير أي دليل؟! لبستنا في الحيط وقرارك مبني على الهوا!" }],
};

export const LOSS_SUPERFICIAL: Ending = {
  stamp: "قرار كارثي",
  title: "ضحية الأرقام السطحية",
  desc: "غرقت في الأرقام الظاهرية وأخذت قراراً بالشبه.. لم تفحص تمثيل العينة وأوقعت الإدارة في حرج كبير!",
  lines: [{ who: "seif", mood: "facepalm", text: "يا باشا ميصحش كده! محلل البيانات يبدأ بالمشكلة ويحددها صح مش يغرق في البيانات على طول كده بالشبه! واخد قرار متسرع وعامل فيها مراجع، روح ذاكر تاني وتعالى!" }],
};

export const TIMEOUT: Ending = {
  stamp: "فات الميعاد!",
  title: "الغرقان في شبر مية",
  desc: "مستر سيف دخل الاجتماع بدون التوصية.. والقرار اتخذ في غيابك!",
  lines: [{ who: "seif", mood: "facepalm", text: "الوقت خلص والديدلاين عدى والاجتماع بدأ وإنت لسه محتار قدام الشاشة ومطلعتش بقرار.. كده عطلت الشركة والقرار اتاخد من غيرنا!" }],
};

export const SEIF_MESSAGES = [
  "يا بطل، اجتماع الشركة التانية كمان شوية ومستنيين قرارك.. طمني وصلت لإيه؟",
  "الوقت بيجري والاجتماع هيبدأ.. ابعتلي الإيميل فوراً عشان ألحق أقرأ توصيتك!",
];

export type SayesPose = "whistle" | "money" | "disgusted" | "smart" | "smug";
export const SAYES_NAME = "سايس الشارع";
export const SAYES_PARK = "اكسر كله وارجع يا باشا، ارجع ارجع، كمان شوية... كمان... تمام كدا يا باشا!";
export const SAYES_ASK = "حاسبني على الباركنج يا باشا.";
export const SAYES_CHOICES = [
  { pay: "later" as const, text: "هحاسبك لما أرجع.", pose: "smug" as SayesPose, voice: "sayes-later.wav", reply: ["ماشي يا باشا... إنت كدا فهلوي وبتشغّل دماغك يعني!"] },
  { pay: "ten" as const, text: "خد 10 جنيه", pose: "disgusted" as SayesPose, voice: "sayes-ten.wav", reply: ["إيه ده يا باشا؟! 10 جنيه؟! أعمل بيها إيه دي؟"] },
  { pay: "fifty" as const, text: "خد 50 جنيه", pose: "smart" as SayesPose, voice: "sayes-fifty.wav", reply: ["ربنا ينور بصيرتك يا باشا! استنى أقولك حاجة... متتسحلش في الداتا يا باشا، واسأل صح... الإجابة في الداتا الناقصة."] },
];
export const SAYES_POPUP = {
  fifty: { pose: "whistle" as SayesPose, text: "الله ينور عليك يا باشا كمل زي ما إنت.. طريق السلامة يا أبو شيماء", voice: "sayes-popup-fifty.wav", auto: true },
  fiftyWrong: {
    pose: "whistle" as SayesPose,
    text: "يا باشا الصفارة دي عشان تفوق! فاكر الـ 50 جنيه؟ قولتلك متتسحلش واسأل صح.. بص على اللي ناقص مش اللي معروض قدامك ومترصص في الجداول!",
    voice: "sayes-popup-fifty-wrong.wav",
  },
  paidCorrect: {
    pose: "smart" as SayesPose,
    text: "أنت صح ابعت التوصية بسرعة",
    voice: "sayes-popup-paid-correct.wav",
  },
  later: {
    pose: "money" as SayesPose,
    text: "يا باشا شكلك نسيتني في الزحمة! طب ظبّطني وأنا هروّق عليك بنصيحة تخلّصك من ورطة مستر سيف دي.. هتدفع ولا تكمل بفهلوتك؟",
    voice: "sayes-popup-later.wav",
    pay: "ادفعله الـ 50 جنيه",
    paid: "يا عيني عليك وعلى كرمك! خد السر: متتسحلش في الداتا، واسأل صح.. الإجابة في الداتا الناقصة يا باشا!",
    paidVoice: "sayes-popup-paid.wav",
    skip: "كمّل بفهلوتك ومن غير ما تدفع",
  },
  ten: {
    pose: "disgusted" as SayesPose,
    text: "العشرة جنيه بتاعتك دي متجيبش كيس شيبسي في الغلا ده يا باشا! كمّلهم 50 وأنا أديك سر الشغلانة اللي هيعديك زي الشعرة من العجين.. ها؟",
    voice: "sayes-popup-ten.wav",
    pay: "كمّلهم 50 جنيه",
    paid: "هو دا الكلام المظبوط! متتسحلش في الداتا، واسأل صح.. الإجابة في الداتا الناقصة!",
    paidVoice: "sayes-popup-ten-paid.wav",
    skip: "لا.. هي الـ 10 دي ورضا أوي",
  },
};

export interface SayesCallLine {
  text: string;
  voice?: string;
}

/** Loss/timeout call from the parking attendant; the wording depends only on what the player paid him. */
export const SAYES_LOSS_CALL: Record<"cheap" | "fifty", SayesCallLine[]> = {
  cheap: [
    { text: "يا فهلوي.. من أول ما قلتلي حأحاسبك لما أرجع وانا قلت عليك فهلوي ومش حتعرف تكسب في اللعبة هههههه", voice: "sayes-loss-1.wav" },
    { text: "افهم يا بيه. أصلا انت محددتش المشكلة صح ولو ركزت مش حتلاقي اي دليل ان المجموعة الأولى أحسن من الثانية أو العكس. انت أخذت كلام أستاذ طارق مسلم بيه ان التقييم قل. بس التقييم مقلش أصلا لان البيانات اتجمعت غلط لان فيه 40% من المجموعة الأولى مردوش أصلا على الاستبيان علشان مكملوش الكورس لاخر محاضرة الي تم فيها التقييم . فانت كده اخدت تقييمات الي كملوا الكورس مش الي انسحبوا والي في الغالب مكنوش مبسوطين وده الي بنسميه لامؤاخذه ب selection bias", voice: "sayes-loss-2.wav" },
    { text: "انت وقعت يا بيه ضحية انحيازاتك المعرفية ولو بدأت بالبيانات فدي غلطة تانية لان البيانات أصلا مش بتتكلم وده خليك تقع لامؤاخذه في ال data immersion", voice: "sayes-loss-3.wav" },
  ],
  fifty: [
    { text: "في ايه يا بيه.. عمال أقولك بص على الداتا الناقصة وانت مش معايا خالص", voice: "sayes-fifty-loss-1.wav" },
    { text: "افهم يا بيه. أصلا انت محددتش المشكلة صح ولو ركزت مش حتلاقي اي دليل ان المجموعة الأولى أحسن من الثانية أو العكس. انت أخذت كلام أستاذ طارق مسلم بيه ان التقييم قل. بس التقييم مقلش أصلا لان البيانات اتجمعت غلط لان فيه 40% من المجموعة الأولى مردوش أصلا على الاستبيان علشان مكملوش الكورس لاخر محاضرة الي تم فيها التقييم . فانت كده اخدت تقييمات الي كملوا الكورس مش الي انسحبوا واللي في الغالب مكنوش مبسوطين وده الي بنسميه لامؤاخذه ب selection bias", voice: "sayes-fifty-loss-2.wav" },
    { text: "انت وقعت يا بيه ضحية انحيازاتك المعرفية ولو بدأت بالبيانات فدي غلطة تانية لان البيانات أصلا مش بتتكلم وده خليك تقع لامؤاخذه في ال data immersion", voice: "sayes-fifty-loss-3.wav" },
  ],
};
export const SAYES_TIMEOUT_CALL: SayesCallLine[] = [
  { text: "الديدلاين خلص يا باشا", voice: "sayes-timeout.wav" },
];

export const BOOTH_MESSAGE = "لو عايز تعرف الحل بشكل مفصل تعالى الـ Booth";
