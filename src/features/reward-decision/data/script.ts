import { renderGenderText, v, type Gender, type GenderText } from '@/lib/genderText';
import type { DocumentId } from './case';

export type Speaker = 'sherif' | 'hossam' | 'dalia' | 'marwan' | 'mahmoud' | 'player' | 'narrator';
/** A rendered line: one dialogue turn, one bubble. Gendered source text is rendered before display. */
export interface Line { id: string; speaker: Speaker; text: string; documentId?: DocumentId }
export interface SourceLine { id: string; speaker: Speaker; text: GenderText; documentId?: DocumentId }

export const SPEAKERS: Record<Speaker, { name: string; role: string; tone: 'light' | 'dark' }> = {
  sherif: { name: 'شريف', role: 'الرئيس التنفيذي', tone: 'dark' },
  hossam: { name: 'حسام', role: 'مدير المبيعات', tone: 'dark' },
  dalia: { name: 'داليا', role: 'مديرة الموارد البشرية', tone: 'light' },
  marwan: { name: 'مروان', role: 'قائد الفريق الأول', tone: 'light' },
  mahmoud: { name: 'محمود', role: 'قائد الفريق الثاني', tone: 'dark' },
  player: { name: 'أنت', role: 'المحلل', tone: 'light' },
  narrator: { name: 'الخلاصة', role: 'The Analyst', tone: 'dark' },
};
const L = (id: string, speaker: Speaker, text: GenderText, documentId?: DocumentId): SourceLine => ({ id, speaker, text, documentId });

/** Approved V2 script — exact owner-supplied wording. Only gendered fragments use v(male, female). */
export const SOURCE_SCRIPT = {
  celebration: [
    L('celebration_01', 'hossam', 'بص يا مروان، أنا رفعت ترشيح فريقك للتكريم. الأرقام قوية، بس متجريش تقول للناس مبروك… لسه شريف ما اعتمدش حاجة.'),
    L('celebration_02', 'marwan', 'طب أعمل إيه دلوقتي؟ أقول للشباب يستنوا المفاجأة ولا أعمل نفسي مش عارف حاجة؟'),
    L('celebration_03', 'hossam', 'اعمل نفسك مش عارف، أحسن ما نرجع نوزع اعتذارات بدل المكافآت!'),
  ],
  debate: [
    L('debate_01', 'dalia', 'يا حسام، ترشيح مروان وصلني، بس محتاجين نتأكد إن ملف المراجعة كامل قبل الاعتماد.'),
    L('debate_02', 'hossam', 'كل حاجة موجودة يا داليا. متوسط مروان أعلى، وعشان كده رشحته. والبيانات التفصيلية موجودة برضه لو حد عايز يراجعها.'),
    L('debate_03', 'dalia', 'تمام، أنا مش بقول إن الرقم غلط. بس خلّينا نمشي بالإجراءات صح، عشان محدش يرجع يفتح الموضوع من أوله.'),
    L('debate_04', 'hossam', 'اتفقنا. ابعتيه لشريف، وأنا واثق من الترشيح.'),
  ],
  briefing: [
    L('briefing_01', 'sherif', [v('بص', 'بصي'), '، عندنا ترشيح لتكريم فريق من المبيعات، ولسه مستني المراجعة النهائية. عايزك ', v('تشوف', 'تشوفي'), ' المستندات ', v('وتبعتلي', 'وتبعتيلي'), ' تقرير واضح أقدر أعتمد عليه.']),
    L('briefing_02', 'player', 'تمام، هراجع البيانات وأشوف المستندات اللي اتبنى عليها الترشيح.'),
    L('briefing_03', 'sherif', ['حسام وداليا عندهم الملفات. وخلي ', v('بالك', 'بالكِ'), '، التقرير ده هيطلع باسمك، يعني كل كلمة فيه مسؤوليتك.']),
  ],
  sales: [
    L('sales_01', 'hossam', [v('اتفضل', 'اتفضلي'), '، ده تقرير المبيعات المجمع للفريقين. نفس الفترة ونفس طريقة حساب المستهدف.'], 'sales-summary'),
    L('sales_02', 'player', ['تمام، بس ', v('محتاج', 'محتاجة'), ' أشوف نتائج كل فرد في الفريقين كمان.']),
    L('sales_03', 'hossam', ['وده كشف نتائج الأفراد، كل واحد حقق كام من المستهدف بتاعه. ', v('راجع', 'راجعي'), ' براحتك، بس ', v('خلّص', 'خلّصي'), ' لنا الموضوع قبل ما مروان يفرش السجادة الحمرا في المكتب!'], 'individual-records'),
  ],
  hr: [
    L('hr_01', 'dalia', ['ده ملف معيار الأداء المعتمد عندنا. ', v('خد', 'خدي'), ' نسختك، وهتلاقي فيه القاعدة اللي بنقيس بيها تحقيق المستهدف.'], 'policy'),
    L('hr_02', 'player', 'تمام، هضيفه مع باقي المستندات.'),
    L('hr_03', 'dalia', 'كويس. يهمني التقرير يكون واضح، سواء اتفق مع الترشيح الموجود أو لأ.'),
  ],
} satisfies Record<string, SourceLine[]>;

export type ScriptKey = keyof typeof SOURCE_SCRIPT;
export const renderLines = (lines: readonly SourceLine[], gender: Gender): Line[] =>
  lines.map(l => ({ id: l.id, speaker: l.speaker, text: renderGenderText(l.text, gender), ...(l.documentId ? { documentId: l.documentId } : {}) }));
export const scriptFor = (gender: Gender): Record<ScriptKey, Line[]> =>
  Object.fromEntries(Object.entries(SOURCE_SCRIPT).map(([k, lines]) => [k, renderLines(lines, gender)])) as Record<ScriptKey, Line[]>;

/** Male rendering, kept for callers that only need ids/speakers. */
export const SCRIPT = scriptFor('male');
export const ALL_LINES = Object.values(SCRIPT).flat();
