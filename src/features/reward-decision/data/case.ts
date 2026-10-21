export type TeamId = 'marwan' | 'mahmoud';
export type ToolId = 'mean' | 'median' | 'range' | 'sd' | 'iqr';
export type DocumentId = 'sales-summary' | 'individual-records' | 'policy';
export type ArgumentKind = 'performance' | 'spread' | 'weak';
export type ArgumentId =
  | 'median-mahmoud' | 'records-coverage' | 'mean-marwan'
  | 'median-proves-all' | 'range-mahmoud' | 'sd-mahmoud' | 'iqr-mahmoud'
  | 'spread-proves-level' | 'spread-predicts-future';
export type Outcome = 'supported' | 'insufficient' | 'criterion_mismatch';

export const TEAMS: Record<TeamId, { name: string; members: { id: string; name: string; value: number }[] }> = {
  marwan: { name: 'فريق مروان', members: [['m01','عمرو',72],['m02','باسم',75],['m03','تامر',78],['m04','خالد',80],['m05','زياد',82],['m06','سيف',84],['m07','طارق',99],['m08','عادل',112],['m09','كريم',119],['m10','وليد',149]].map(([id,name,value]) => ({ id: String(id), name: String(name), value: Number(value) })) },
  mahmoud: { name: 'فريق محمود', members: [['b01','أحمد',85],['b02','إيهاب',86],['b03','رامي',87],['b04','سامح',87],['b05','شادي',88],['b06','عمر',88],['b07','فادي',89],['b08','محمد',89],['b09','هاني',90],['b10','يوسف',91]].map(([id,name,value]) => ({ id: String(id), name: String(name), value: Number(value) })) },
};

export const POLICY = 'يُعتبر الموظف محققًا لمعيار الأداء عند وصول نسبة إنجازه إلى 85% أو أكثر من مستهدفه خلال فترة التقييم.';

export const DOCUMENTS: Record<DocumentId, { title: string; source: string }> = {
  'sales-summary': { title: 'تقرير المبيعات المجمع', source: 'إدارة المبيعات' },
  'individual-records': { title: 'كشف نتائج الأفراد', source: 'إدارة المبيعات' },
  policy: { title: 'ملف معيار الأداء', source: 'إدارة الموارد البشرية — شركة روّاد' },
};

export const TOOLS: Record<ToolId, { title: string; short: string }> = {
  mean: { title: 'المتوسط الحسابي', short: 'Mean' },
  median: { title: 'الوسيط', short: 'Median' },
  range: { title: 'المدى', short: 'Range' },
  sd: { title: 'الانحراف المعياري', short: 'SD' },
  iqr: { title: 'المدى الربيعي', short: 'IQR' },
};
export const TOOL_ORDER = Object.keys(TOOLS) as ToolId[];

export const ARGUMENTS: Record<ArgumentId, { text: string; kind: ArgumentKind; correct: boolean; tool?: ToolId; document?: DocumentId }> = {
  'median-mahmoud': { text: 'وسيط فريق محمود 88% مقابل 83% لفريق مروان؛ مستوى الأداء الأوسط أعلى.', kind: 'performance', correct: true, tool: 'median' },
  'records-coverage': { text: 'كشف الأفراد يوضح أن كل أفراد فريق محمود حققوا معيار 85%.', kind: 'performance', correct: true, document: 'individual-records' },
  'mean-marwan': { text: 'متوسط فريق مروان الأعلى يثبت وحده استحقاق التكريم الجماعي.', kind: 'weak', correct: false, tool: 'mean' },
  'median-proves-all': { text: 'وسيط فريق محمود فوق 85%، إذن كل أفراده فوق المعيار.', kind: 'weak', correct: false, tool: 'median' },
  'range-mahmoud': { text: 'مدى فريق محمود 6 نقاط مقابل 77؛ نتائجه أكثر تقاربًا.', kind: 'spread', correct: true, tool: 'range' },
  'sd-mahmoud': { text: 'الانحراف المعياري لفريق محمود 1.7 مقابل 23.5؛ نتائجه أكثر تقاربًا.', kind: 'spread', correct: true, tool: 'sd' },
  'iqr-mahmoud': { text: 'المدى الربيعي لفريق محمود نقطتان مقابل 34؛ نصفه الأوسط أكثر تقاربًا.', kind: 'spread', correct: true, tool: 'iqr' },
  'spread-proves-level': { text: 'انخفاض التشتت وحده يثبت أن مستوى أداء الفريق مرتفع.', kind: 'weak', correct: false, tool: 'sd' },
  'spread-predicts-future': { text: 'تقارب النتائج يضمن تحسن الفريق في الشهر المقبل.', kind: 'weak', correct: false, tool: 'range' },
};
/* ---- V2 deduction notebook: exactly two questions, four choices, one correct each (stable ids). ---- */
export type QuestionId = 'center' | 'spread';
export interface Choice { id: string; text: string }
export const QUESTIONS: Record<QuestionId, { title: string; prompt: string; choices: Choice[] }> = {
  center: {
    title: 'المركز: المتوسط والوسيط',
    prompt: 'أي عبارة بتوصف العلاقة بين المتوسط الحسابي والوسيط في الفريقين بشكل صحيح؟',
    choices: [
      { id: 'center_a', text: 'متوسط مروان أعلى، لكن وسيطه أقل بوضوح؛ وده معناه إن المتوسط وحده مش كفاية للحكم على شكل أداء الفريق.' },
      { id: 'center_b', text: 'فريق مروان هو الأقوى؛ لأن متوسطه أعلى، والمتوسط هو المؤشر الأدق دائمًا للحكم على الأداء.' },
      { id: 'center_c', text: 'مفيش فرق مهم بين الفريقين؛ لأن متوسط محمود قريب نسبيًا من متوسط مروان.' },
      { id: 'center_d', text: 'الوسيط مش مؤثر هنا؛ لأن الأفضل نحكم على الفريق من أعلى نتائج وصل لها أفراده.' },
    ],
  },
  spread: {
    title: 'التشتت: المدى والانحراف المعياري والمدى الربيعي',
    prompt: 'لما تقارن المدى والانحراف المعياري والمدى الربيعي بين الفريقين، أنهي استنتاج تقدر تدعمه بالأرقام؟',
    choices: [
      { id: 'spread_a', text: 'التشتت الكبير في فريق مروان علامة قوة؛ لأنه بيثبت إن الفريق عنده قدرات أعلى.' },
      { id: 'spread_b', text: 'المدى الصغير في فريق محمود معناه إن الفريق وصل لأقصى إمكانياته ومبقاش عنده فرصة يتحسن.' },
      { id: 'spread_c', text: 'نتائج محمود أكثر تقاربًا خلال الفترة؛ لأن مقاييس التشتت عنده أقل، لكن ده لوحده مش دليل على مستوى الأداء.' },
      { id: 'spread_d', text: 'وجود أداء استثنائي عند بعض أفراد مروان بيخلّي تقارب نتائج باقي الفريق أقل أهمية في المقارنة.' },
    ],
  },
};
export const QUESTION_ORDER: QuestionId[] = ['center', 'spread'];
/** Internal answer key — never rendered. */
export const ANSWER_KEY: Record<QuestionId, string> = { center: 'center_a', spread: 'spread_c' };
