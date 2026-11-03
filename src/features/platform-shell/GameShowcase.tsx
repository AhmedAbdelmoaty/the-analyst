import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { GAME_CATALOG, type CatalogGame } from '@/features/discovery/catalog';
import GameCoverCard from './GameCoverCard';
import { platformAudio } from '@/features/platform-audio/mixer';
import { usePlatformAudio } from '@/features/platform-audio/PlatformAudio';

export default function GameShowcase({ onChoose }: { onChoose: (game: CatalogGame) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const touching = useRef(false);
  const lastManualAt = useRef(0);
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const { reducedMotion } = usePlatformAudio();
  const autoAvailable = !systemReduced && !reducedMotion;
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!autoAvailable) return;
    const timer = window.setInterval(() => {
      const el = strip.current;
      if (!el || document.hidden || hovered.current || focused.current || touching.current || Date.now() - lastManualAt.current < 4000) return;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const width = el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth;
      if (Math.abs(el.scrollLeft) >= el.scrollWidth - el.clientWidth - 3) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: -(width + gap), behavior: 'smooth' });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [autoAvailable]);
  const behavior = (): ScrollBehavior => window.matchMedia('(prefers-reduced-motion: reduce)').matches || platformAudio.snapshot().reducedMotion ? 'instant' : 'smooth';
  const scroll = (direction: number) => {
    const el = strip.current; if (!el) return;
    lastManualAt.current = Date.now();
    const width = el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: -direction * (width + gap), behavior: behavior() }); platformAudio.play('click');
  };
  return <div className="game-showcase">
    <div className="showcase-stage"><button className="platform-icon showcase-nav" disabled={edges.start} aria-label="الألعاب السابقة" onClick={() => scroll(-1)}><ArrowRight /></button>
    <div ref={strip} className="showcase-strip" role="region" aria-label="استكشف الألعاب" tabIndex={0}
      onPointerEnter={event => { if (event.pointerType === 'mouse') hovered.current = true; }} onPointerLeave={() => { hovered.current = false; }}
      onFocus={() => { focused.current = true; }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) focused.current = false; }}
      onScroll={event => { const el = event.currentTarget; setEdges({ start: Math.abs(el.scrollLeft) < 3, end: Math.abs(el.scrollLeft) >= el.scrollWidth - el.clientWidth - 3 }); }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scroll(event.key === 'ArrowLeft' ? 1 : -1); }
        if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); lastManualAt.current = Date.now(); event.currentTarget.scrollTo({ left: event.key === 'Home' ? 0 : -event.currentTarget.scrollWidth, behavior: behavior() }); }
      }}
      onPointerDown={event => { suppressClick.current = false; touching.current = true; lastManualAt.current = Date.now(); if (event.pointerType === 'mouse' && event.button === 0) drag.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false }; }}
      onPointerMove={event => {
        const current = drag.current; if (!current) return;
        const delta = event.clientX - current.x;
        if (Math.abs(delta) > 6) { current.moved = true; suppressClick.current = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragging = 'true'; }
        if (current.moved) { event.preventDefault(); event.currentTarget.scrollLeft = current.scroll - delta; }
      }}
      onPointerUp={event => { drag.current = null; touching.current = false; lastManualAt.current = Date.now(); delete event.currentTarget.dataset.dragging; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={event => { drag.current = null; touching.current = false; delete event.currentTarget.dataset.dragging; }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      {GAME_CATALOG.map(game => <GameCoverCard key={game.id} game={game} teaser onChoose={() => onChoose(game)} />)}
    </div><button className="platform-icon showcase-nav" disabled={edges.end} aria-label="الألعاب التالية" onClick={() => scroll(1)}><ArrowLeft /></button></div>
  </div>;
}
