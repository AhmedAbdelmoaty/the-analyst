import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CatalogGame } from './catalog';

export default function GameCard({ game, onChoose, continuing = false }: { game: CatalogGame; onChoose: () => void; continuing?: boolean }) {
  return <article className="discovery-card group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
    <div className="relative overflow-hidden aspect-[16/10]">
      <img src={game.cover} alt={game.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <span className="absolute right-3 top-3 rounded-sm bg-card/95 px-3 py-1 text-xs font-bold text-foreground">{game.tier === 'free' ? 'مجانية' : 'ضمن السنوية'}</span>
    </div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <p className="text-xs font-bold text-primary">{game.category}</p>
      <h3 className="mt-2 text-2xl font-bold leading-normal">{game.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{game.description}</p>
      <Button onClick={onChoose} variant="outline" className="mt-5 min-h-11 w-full justify-between border-border bg-transparent text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground" aria-label={`${continuing ? 'متابعة' : 'ابدأ'} ${game.title}`}><span className="flex items-center gap-2"><Play className="h-4 w-4" />{continuing ? 'متابعة الجولة' : 'ابدأ المغامرة'}</span><ArrowLeft className="h-4 w-4" /></Button>
    </div>
  </article>;
}