import { ArrowLeft, Play, LockKeyhole, CircleHelp } from 'lucide-react';
import type { CatalogGame } from '@/features/discovery/catalog';
import type { GameProgress } from '@/features/discovery/progress';
import type { GameAccessSnapshot } from '@/features/entitlement/useGameAccess';
import { cardAccess } from './accessPresentation';
import { platformAudio } from '@/features/platform-audio/mixer';

const statusLabels = { new: 'جديدة', 'in-progress': 'قيد اللعب', completed: 'وصلت للنهاية' };
export default function GameCoverCard({ game, progress = { status: 'new' }, snapshot = null, teaser = false, onChoose }: {
  game: CatalogGame; progress?: GameProgress; snapshot?: GameAccessSnapshot | null; teaser?: boolean; onChoose: () => void;
}) {
  const access = cardAccess(game, progress, snapshot);
  const action = teaser ? 'اكتشف المغامرة' : access.action;
  return <button type="button" className="game-cover-card" data-game={game.id} data-status={progress.status} aria-label={`${action}: ${game.title}`} onPointerEnter={event => platformAudio.hover(event.pointerType)} onFocus={() => platformAudio.play('hover')} onPointerDown={() => { platformAudio.unlock(); platformAudio.play(teaser ? 'click' : access.decision === 'deny' ? 'locked' : 'launch'); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { platformAudio.unlock(); platformAudio.play('click'); } }} onClick={onChoose}>
    <span className="game-cover-art"><img src={game.cover} alt="" loading="lazy" draggable={false} /><span className="game-cover-sheen" />
      <span className="game-access">{teaser ? (game.tier === 'free' ? 'مجانية' : 'الخطة السنوية') : access.label}</span>
      <span className="game-cover-title">{game.title}</span>
    </span>
    <span className="game-cover-details"><span className="game-cover-meta"><span>{game.category}</span>{!teaser && <span className="game-status">{statusLabels[progress.status]}</span>}</span>
      <span className="game-cover-bottom"><span className="game-cover-action">{!teaser && (access.decision === 'deny' ? <LockKeyhole /> : access.decision === 'verify' ? <CircleHelp /> : <Play />)}{action}<ArrowLeft /></span>
      {!teaser && progress.hint && <span className="game-hint">{progress.hint}</span>}</span>
    </span>
  </button>;
}
