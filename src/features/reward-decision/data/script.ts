import type { DocumentId } from './case';

export type Speaker = 'sherif' | 'hossam' | 'dalia' | 'marwan' | 'mahmoud' | 'player' | 'narrator';
export interface Line { id: string; speaker: Speaker; text: string; documentId?: DocumentId }

export const SPEAKERS: Record<Speaker, { name: string; role: string; tone: 'light' | 'dark' }> = {
  sherif: { name: 'شريف', role: 'الرئيس التنفيذي', tone: 'dark' },
  hossam: { name: 'حسام', role: 'مدير المبيعات', tone: 'dark' },
  dalia: { name: 'داليا', role: 'مديرة الموارد البشرية', tone: 'light' },
  marwan: { name: 'مروان', role: 'قائد الفريق الأول', tone: 'light' },
  mahmoud: { name: 'محمود', role: 'قائد الفريق الثاني', tone: 'dark' },
  player: { name: 'أنت', role: 'المحلل', tone: 'light' },
  narrator: { name: 'الخلاصة', role: 'The Analyst', tone: 'dark' },
};
const L = (id: string, speaker: Speaker, text: string, documentId?: DocumentId): Line => ({ id, speaker, text, documentId });

export const SCRIPT = {
  celebration: [
    L('celebration_01', 'hossam', 'مبروك يا مروان. فريقك حقق أعلى متوسط الشهر ده، ورفعت ترشيحه للتكريم.'),
    L('celebration_02', 'marwan', 'شكرًا يا أستاذ حسام. الفريق تعب، ومستنيين الاعتماد الرسمي.'),
    L('celebration_03', 'hossam', 'نستنى قرار الإدارة الأول، وبعدها نعلن النتيجة.'),
  ],
  debate: [
    L('debate_01', 'hossam', 'فريق مروان متوسطه 95%، وفريق محمود 88%. الترشيح واضح من التقرير المجمع.'),
    L('debate_02', 'dalia', 'الأرقام معتمدة، لكن التكريم له سياسة لازم تتطبق على نتائج الأفراد.'),
    L('debate_03', 'hossam', 'تمام. نرفع التقرير والسياسة لشريف، والمحلل يراجعهم قبل الاجتماع.'),
  ],
  briefing: [
    L('briefing_01', 'sherif', 'قدامي ترشيح لتكريم فريق مروان، ولسه الاعتماد متوقف. راجع نتائج الفريقين وسياسة التكريم، وارجع لي بتوصية مبنية على اللي لقيته.'),
    L('briefing_02', 'player', 'هراجع المستندات وأقارن أداء الفريقين، وبعدها أجهز التوصية.'),
    L('briefing_03', 'sherif', 'تمام. حسام وداليا منتظرينك في مكاتبهم.'),
  ],
  sales: [
    L('sales_01', 'hossam', 'التقرير المجمع عندك. الفريقين عن نفس الشهر، وعدد الأفراد والأهداف موحدة.', 'sales-summary'),
    L('sales_02', 'player', 'محتاج كمان أشوف النتائج على مستوى كل فرد.'),
    L('sales_03', 'hossam', 'وده كشف نتائج الأفراد المعتمد. هتلاقي المستندين في ملف التحليل.', 'individual-records'),
  ],
  hr: [
    L('hr_01', 'dalia', 'دي السياسة المعتمدة للتكريم. فيها معيار الأداء المطلوب من كل فرد وأساس التكريم الجماعي.', 'policy'),
    L('hr_02', 'player', 'هطبق نفس السياسة على بيانات الفريقين وأبني التوصية.'),
    L('hr_03', 'dalia', 'تمام. القرار لازم يكون مبرره واضح في الاجتماع.'),
  ],
} satisfies Record<string, Line[]>;

export const ALL_LINES = Object.values(SCRIPT).flat();