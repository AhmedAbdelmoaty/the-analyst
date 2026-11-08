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

/** Reward Decision V2 script. Only gendered fragments use v(male, female). */
export const SOURCE_SCRIPT = {
  celebration: [
    L('celebration_01', 'hossam', 'إيه يا عم مروان، ألف مبروك! كده فريقك جاب أعلى مبيعات وخطف التكريم!'),
    L('celebration_02', 'marwan', 'الله يبارك فيك يا أستاذ حسام! والله الشباب تعبوا جامد الشهر ده.'),
    L('celebration_03', 'hossam', 'يستاهلوا يا سيدي! بس إوعى الفرحة تنسيك التارجت بتاع الشهر الجاي!'),
    L('celebration_04', 'marwan', 'يا عم سيبنا نفرح يومين بس، ده إحنا لسه ما لحقناش نجيب التورتة!'),
  ],
  debate: [
    L('debate_01', 'hossam', 'صباح الفل يا داليا! فريق مروان كسر الدنيا الشهر ده، وبعتلك ترشيح التكريم بتاعهم.'),
    L('debate_02', 'dalia', 'يا سلام! ألف مبروك ليهم. بس طبعًا لازم نراجع الملف قبل ما شريف يعتمد التكريم.'),
    L('debate_03', 'hossam', 'تمام يا ستي، راجعي براحتك. أنا واثق إن الشباب عملوا شغل جامد!'),
  ],
  briefing: [
    L('briefing_01', 'sherif', [v('بص', 'بصي'), '، عندنا ترشيح لتكريم فريق من المبيعات، ولسه مستني المراجعة النهائية. عايزك ', v('تشوف', 'تشوفي'), ' المستندات ', v('وتبعتلي', 'وتبعتيلي'), ' تقرير واضح أقدر أعتمد عليه.']),
    L('briefing_02', 'player', 'تمام، هراجع البيانات وأشوف المستندات اللي اتبنى عليها الترشيح.'),
    L('briefing_03', 'sherif', ['حسام وداليا عندهم الملفات. وخلي ', v('بالك', 'بالكِ'), '، التقرير ده هيطلع باسمك، يعني كل كلمة فيه مسؤوليتك.']),
  ],
  sales: [
    L('sales_01', 'hossam', [v('اتفضل', 'اتفضلي'), '، ده تقرير المبيعات بتاع الفريقين، كله موجود فيه.'], 'sales-summary'),
    L('sales_02', 'player', ['تمام يا أستاذ حسام، بس ', v('محتاج', 'محتاجة'), ' أشوف نتائج كل واحد في الفريقين كمان.']),
    L('sales_03', 'hossam', ['أهو كشف نتائج الأفراد كمان. ', v('راجعه', 'راجعيه'), ' براحتك، ولو ', v('احتجت', 'احتجتي'), ' أي حاجة أنا موجود.'], 'individual-records'),
  ],
  hr: [
    L('hr_01', 'dalia', ['ده ملف معيار الأداء المعتمد عندنا. ', v('خد', 'خدي'), ' نسختك، وهتلاقي فيه القاعدة اللي بنقيس بيها تحقيق التارجت.'], 'policy'),
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
