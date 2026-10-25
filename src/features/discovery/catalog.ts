import currentCover from "@/assets/scenes/mansour-office-welcome-male.webp";
import rewardCover from "@/features/reward-decision/assets/rd-cover-l.webp.asset.json";
/** Shared presentation catalog; tiers describe future access, never entitlement. */
export const GAME_CATALOG = [
  { id: 'problem-framing', title: 'اسأل صح', route: '/play', cover: currentCover, description: 'المبيعات أقل من المتوقع… بس مقارنة بإيه؟ انزل للميدان واكتشف السؤال اللي يغيّر القضية.', category: 'صياغة المشكلات', tier: 'free' },
  { id: 'reward-decision', title: 'قرار التكريم', route: '/games/reward-decision', cover: rewardCover.url, description: 'فريقين، وأرقام بتحكي قصتين. افحص الأدلة واكتشف مين يستحق التكريم.', category: 'تحليل البيانات', tier: 'annual' },
  { id: 'behind-the-dots', title: 'ورا النقط', route: '/games/behind-the-dots', cover: '/assets/behind-dots/guide.png', description: 'كل نقطة وراها حكاية. ساعد ليلى تقرأ العلاقات وتختار خطة مبنية على الأدلة.', category: 'الارتباط وفحص الأدلة', tier: 'annual' },
  { id: 'crack-the-code', title: 'الشفرة الأخيرة', route: '/games/crack-the-code', cover: '/crack-the-code/assets/finance-manager-new.jpg', description: 'تلات خزائن وتقرير مختفي. فك ألغاز الأرقام ووصل للشفرة قبل ما تضيع الحقيقة.', category: 'المنطق والاستنتاج', tier: 'annual' },
  { id: 'decision-matrix', title: 'مصفوفة القرار', route: '/games/decision-matrix', cover: '/decision-matrix/assets/boardroom-cartoon.jpg', description: 'أول يوم في الشركة… وأول قرار مش سهل. اجمع الأدلة ووازن البدائل مع الفريق.', category: 'المفاضلة واتخاذ القرار', tier: 'annual' },
] as const;
export type CatalogGame = typeof GAME_CATALOG[number];
export type GameId = CatalogGame['id'];
export const findGame = (id: unknown) => GAME_CATALOG.find(game => game.id === id);