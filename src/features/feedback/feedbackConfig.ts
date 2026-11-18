import type { GameId } from '@/features/discovery/catalog';

export const BASE_CATEGORIES = {
  technical: { label: '🐞 مشكلة تقنية', options: ['الصوت فيه مشكلة', 'جزء من الشاشة مقصوص', 'زر مش بيستجيب', 'اللعبة علّقت'], other: 'مشكلة تانية...' },
  gameplay: { label: '🎯 طريقة اللعب والواجهة', options: ['وقت الجولة محتاج تعديل', 'الخطوط أو الكتابة مش واضحة', 'شرح طريقة اللعب محتاج تبسيط'], other: 'ملاحظة تانية...' },
  idea: { label: '💡 فكرة وتطوير', options: ['فكرة تحدي جديد للعبة دي', 'اقتراح لتطوير الشكل أو الأصوات', 'فكرة لعبة جديدة للمنصة'], other: 'فكرة تانية...' },
} as const;

export type FeedbackCategoryId = keyof typeof BASE_CATEGORIES;
export type FeedbackCategory = { label: string; options: readonly string[]; other: string };

const GAME_FEEDBACK: Record<GameId, { ratingTitle: string; ratingPrompt: string; accent: string; gameplay: readonly string[]; idea: readonly string[] }> = {
  'problem-framing': {
    ratingTitle: 'قيّم تجربة «اسأل صح»', ratingPrompt: 'هل ساعدتك القضية تسأل قبل ما تستعجل الحل؟', accent: '354 72% 46%',
    gameplay: ['الأسئلة أو الاختيارات محتاجة توضيح', 'وقت القضية محتاج تعديل', 'الانتقال بين المشاهد محتاج تحسين'],
    idea: ['فكرة قضية جديدة نتعلم منها نسأل صح', 'اقتراح لتطوير المقابلات أو الأدلة', 'فكرة تلميح يساعد من غير ما يكشف الحل'],
  },
  'reward-decision': {
    ratingTitle: 'قيّم تجربة «قرار التكريم»', ratingPrompt: 'هل الاجتماع والقرار حسّسوك إنك محلل داخل القضية؟', accent: '43 92% 52%',
    gameplay: ['الحوار سريع أو طويل', 'المتوسط والوسيط محتاجين عرض أوضح', 'كروت القرار محتاجة تحسين'],
    idea: ['فكرة قضية تكريم جديدة', 'اقتراح لمؤشر أو أداة تحليل في مستوى قادم', 'فكرة رد فعل جديد بعد القرار'],
  },
  'behind-the-dots': {
    ratingTitle: 'قيّم تجربة «ورا النقط»', ratingPrompt: 'هل قراءة العلاقات بين النقط كانت ممتعة وواضحة؟', accent: '185 74% 43%',
    gameplay: ['الشارت أو المحاور محتاجين توضيح', 'الوقت أو القلوب محتاجين تعديل', 'التوصية النهائية محتاجة تبسيط'],
    idea: ['فكرة بيانات أو علاقة جديدة نفحصها', 'اقتراح لتحدي شارت جديد', 'فكرة تفاعل جديد مع دوتّي أو جليتش'],
  },
  'crack-the-code': {
    ratingTitle: 'قيّم تجربة «الشفرة الأخيرة»', ratingPrompt: 'هل الألغاز والخزائن خلّوك تفكر وتستمتع؟', accent: '38 92% 52%',
    gameplay: ['الأدلة محتاجة توضيح', 'لوحة الأرقام أو التحكم محتاج تحسين', 'التلميحات محتاجة تعديل'],
    idea: ['فكرة خزنة أو شفرة جديدة', 'اقتراح لقاعدة منطق مختلفة', 'فكرة قصة أو مكافأة جديدة للمهمة'],
  },
  'decision-matrix': {
    ratingTitle: 'قيّم تجربة «مصفوفة القرار»', ratingPrompt: 'هل موازنة البدائل خلت القرار ممتعًا ومقنعًا؟', accent: '216 78% 55%',
    gameplay: ['المعايير أو الأوزان محتاجة توضيح', 'بطاقات الأدلة محتاجة ترتيب أفضل', 'الحوار أو خطوات القرار محتاجة تحسين'],
    idea: ['فكرة موقف قرار جديد', 'اقتراح لمعيار أو بديل جديد', 'فكرة طريقة مختلفة لعرض المقارنة'],
  },
  'investigation-file': {
    ratingTitle: 'قيّم تجربة «ملف تحت التحقيق»', ratingPrompt: 'هل التحقيق كشف لك الحكاية اللي ورا الأرقام؟', accent: '32 82% 48%',
    gameplay: ['السجلات أو الفلاتر محتاجة توضيح', 'خطوات التحقيق محتاجة تبسيط', 'الخلاصة أو الحكم محتاجين عرض أوضح'],
    idea: ['فكرة ملف تحقيق جديد', 'اقتراح لشاهد أو دليل إضافي', 'فكرة تفاعل جديد مع سجلات الموظفين'],
  },
  'team-performance': {
    ratingTitle: 'قيّم تجربة «أداء الفريق»', ratingPrompt: 'هل المقارنة ساعدتك تشوف اللي الإجمالي كان مخبيه؟', accent: '150 68% 42%',
    gameplay: ['تقسيم الفرق أو المهام محتاج توضيح', 'الأسئلة محتاجة ترتيب أفضل', 'شرح مفارقة النتيجة محتاج تبسيط'],
    idea: ['فكرة فرق أو مهام جديدة للمقارنة', 'اقتراح لمؤشر أداء جديد', 'فكرة قرار إداري جديد بعد التحليل'],
  },
  'profit-paradox': {
    ratingTitle: 'قيّم تجربة «مفارقة الربح»', ratingPrompt: 'هل تفكيك الإيرادات خلّاك تفهم المفارقة بنفسك؟', accent: '278 62% 50%',
    gameplay: ['الشارت أو نسب الإيرادات محتاجة توضيح', 'خطوات التحليل محتاجة تبسيط', 'مراجعة القرار محتاجة تحسين'],
    idea: ['فكرة منتجات أو شهور جديدة للتحليل', 'اقتراح لمفارقة ربح جديدة', 'فكرة تفاعل جديد داخل التقرير'],
  },
};

const fallbackConfig = { ratingTitle: 'قيّم تجربتك في اللعبة', ratingPrompt: 'رأيك يساعدنا نخلي التجربة أحسن.', accent: '354 72% 46%', gameplay: BASE_CATEGORIES.gameplay.options, idea: BASE_CATEGORIES.idea.options };

export const feedbackConfigFor = (id: string) => GAME_FEEDBACK[id as GameId] ?? fallbackConfig;

export const feedbackCategoriesFor = (id: string): Record<FeedbackCategoryId, FeedbackCategory> => {
  const config = feedbackConfigFor(id);
  return {
    technical: BASE_CATEGORIES.technical,
    gameplay: { ...BASE_CATEGORIES.gameplay, options: config.gameplay },
    idea: { ...BASE_CATEGORIES.idea, options: config.idea },
  };
};

const meaningfulNote = (note: string) => note.trim().replace(/\s+/g, ' ').length >= 12;

export const feedbackReady = (category: FeedbackCategoryId, option: string | null, note: string, other: string) =>
  Boolean(option) && (category === 'idea' ? meaningfulNote(note) : option === other ? note.trim().length >= 3 : true);
