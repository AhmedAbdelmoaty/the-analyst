import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, MoveHorizontal } from 'lucide-react';
import { GAME_CATALOG, type CatalogGame } from '@/features/discovery/catalog';
import GameCoverCard from './GameCoverCard';
import { platformAudio } from '@/features/platform-audio/mixer';

export default function GameShowcase({ onChoose }: { onChoose: (game: CatalogGame) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [edges, setEdges] = useState({ start: true, end: false });
  const behavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches || platformAudio.snapshot().reducedMotion ? 'instant' : 'smooth';
  const scroll = (direction: number) => {
    const el = strip.current; if (!el) return;
    const width = el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth;
    el.scrollBy({ left: -direction * (width + 18), behavior: behavior() }); platformAudio.play('click');
  };
  return <div className="game-showcase">
    <div className="showcase-controls"><span><MoveHorizontal />اسحب واكتشف الحكايات</span><div><button className="platform-icon" disabled={edges.start} aria-label="الألعاب السابقة" onClick={() => scroll(-1)}><ArrowRight /></button><button className="platform-icon" disabled={edges.end} aria-label="الألعاب التالية" onClick={() => scroll(1)}><ArrowLeft /></button></div></div>
    <div ref={strip} className="showcase-strip" role="region" aria-label="استكشف الألعاب" tabIndex={0}
      onScroll={event => { const el = event.currentTarget; setEdges({ start: Math.abs(el.scrollLeft) < 3, end: Math.abs(el.scrollLeft) >= el.scrollWidth - el.clientWidth - 3 }); }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scroll(event.key === 'ArrowLeft' ? 1 : -1); }
        if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); event.currentTarget.scrollTo({ left: event.key === 'Home' ? 0 : -event.currentTarget.scrollWidth, behavior: behavior() }); }
      }}
      onPointerDown={event => { suppressClick.current = false; if (event.pointerType === 'mouse' && event.button === 0) drag.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false }; }}
      onPointerMove={event => {
        const current = drag.current; if (!current) return;
        const delta = event.clientX - current.x;
        if (Math.abs(delta) > 6) { current.moved = true; suppressClick.current = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragging = 'true'; }
        if (current.moved) { event.preventDefault(); event.currentTarget.scrollLeft = current.scroll - delta; }
      }}
      onPointerUp={event => { drag.current = null; delete event.currentTarget.dataset.dragging; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={event => { drag.current = null; delete event.currentTarget.dataset.dragging; }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      {GAME_CATALOG.map(game => <GameCoverCard key={game.id} game={game} teaser onChoose={() => onChoose(game)} />)}
    </div>
  </div>;
}
