import { ArrowLeft } from 'lucide-react';
import type { CatalogGame } from './catalog';

export default function GameCard({ game, onChoose, continuing = false }: { game: CatalogGame; onChoose: () => void; continuing?: boolean }) {
  const action = continuing ? 'متابعة الجولة' : 'ابدأ المغامرة';
  const tier = game.tier === 'free' ? 'مجانية' : 'ضمن الاشتراك السنوي';

  return <button
    type="button"
    className="discovery-card group flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-border bg-card text-right text-card-foreground"
    onClick={onChoose}
    aria-label={`${action}: ${game.title}`}
  >
    <span className="discovery-card-cover relative block w-full shrink-0 overflow-hidden">
      <img src={game.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <span className="absolute right-3 top-3 rounded-md border border-white/70 bg-white/95 px-2.5 py-1 text-[11px] font-bold leading-5 text-foreground shadow-sm">{tier}</span>
    </span>
    <span className="flex min-h-[176px] w-full flex-1 flex-col p-4">
      <span className="text-xs font-bold leading-5 text-primary">{game.category}</span>
      <span className="mt-1 text-lg font-bold leading-7">{game.title}</span>
      <span className="mt-1.5 line-clamp-3 text-[13px] leading-6 text-muted-foreground">{game.description}</span>
      <span className="discovery-card-action mt-auto flex items-center justify-between pt-3 text-sm font-bold text-primary">
        <span>{action}</span><ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform duration-200" />
      </span>
    </span>
  </button>;
}
