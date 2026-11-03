import { decideAccess } from '@/features/entitlement/access';
import type { GameAccessSnapshot } from '@/features/entitlement/useGameAccess';
import type { CatalogGame } from '@/features/discovery/catalog';
import { getCatalogAction, type GameProgress } from '@/features/discovery/progress';

export function cardAccess(game: CatalogGame, progress: GameProgress, snapshot: GameAccessSnapshot | null) {
  const decision = decideAccess(snapshot?.enforcement ?? null, game.tier, snapshot?.entitled ?? null);
  return {
    decision,
    action: decision === 'deny' ? 'افتح الوصول' : decision === 'verify' ? 'تحقّق من الوصول' : getCatalogAction(progress.status),
    label: game.tier === 'free' ? 'مجانية' : decision === 'verify' ? 'السنوية · نتحقق من الوصول' : decision === 'deny' ? 'تحتاج الاشتراك السنوي' : snapshot?.enforcement === false ? 'سنوية · متاحة حاليًا' : 'سنوية · الوصول متاح',
  };
}
