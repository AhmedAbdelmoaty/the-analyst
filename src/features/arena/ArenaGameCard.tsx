import { useRef } from "react";
import { Play, Trophy, Flame, Sparkles } from "lucide-react";
import type { CatalogGame } from "@/features/discovery/catalog";
import { getCatalogAction, type GameProgress } from "@/features/discovery/progress";
import { sfx } from "./sfx";

const GENRE: Record<string, { label: string; level: number }> = {
  "problem-framing": { label: "مغامرة RPG", level: 1 },
  "reward-decision": { label: "تكتيك", level: 2 },
  "behind-the-dots": { label: "ألغاز", level: 2 },
  "crack-the-code": { label: "هروب وألغاز", level: 3 },
  "decision-matrix": { label: "استراتيجية", level: 2 },
  "investigation-file": { label: "تحقيق تكتيكي", level: 3 },
};
const STATUS = { new: "جديدة", "in-progress": "قيد اللعب", completed: "خلصتها" } as const;

export default function ArenaGameCard({ game, progress, index, onChoose }: { game: CatalogGame; progress: GameProgress; index: number; onChoose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const g = GENRE[game.id] ?? { label: "لعبة", level: 1 };
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${-y * 8}deg`); el.style.setProperty("--ry", `${x * 10}deg`);
  };
  const reset = () => { ref.current?.style.setProperty("--rx", "0deg"); ref.current?.style.setProperty("--ry", "0deg"); };

  return (
    <button ref={ref} type="button" aria-label={`${getCatalogAction(progress.status)}: ${game.title}`}
      className="arena-card group" data-status={progress.status} style={{ animationDelay: `${index * 60}ms` }}
      onPointerEnter={() => sfx.play("hover")} onPointerMove={onMove} onPointerLeave={reset}
      onClick={() => { sfx.play("launch"); setTimeout(onChoose, 350); }}>
      <img src={game.cover} alt="" loading="lazy" />
      <span className="arena-card-shine" />
      <span className="arena-card-top">
        <span className="arena-tag"><Sparkles className="h-3 w-3" style={{ color: "hsl(var(--arena-gold))" }} />{g.label}</span>
        <span className="arena-tag arena-tag-status">
          {progress.status === "completed" ? <Trophy className="h-3 w-3" /> : progress.status === "in-progress" ? <Flame className="h-3 w-3" /> : null}
          {STATUS[progress.status]}
        </span>
      </span>
      <span className="arena-card-body block">
        <span className="flex items-center gap-2 text-[11px] font-extrabold" style={{ color: "hsl(var(--arena-gold))" }}>
          {game.category}
          <span className="flex" aria-label={`الصعوبة ${g.level} من 3`}>
            {[1, 2, 3].map(n => <Flame key={n} className="h-3.5 w-3.5" style={{ color: n <= g.level ? "hsl(var(--arena-ember))" : "hsl(var(--arena-text) / .2)" }} />)}
          </span>
        </span>
        <span className="arena-title mt-0.5 block text-2xl leading-tight">{game.title}</span>
        <span className="arena-card-desc arena-muted block text-xs font-semibold leading-5">
          <span className="line-clamp-2">{progress.hint ?? game.description}</span>
        </span>
        <span className="mt-2 flex items-center justify-between">
          <span className="arena-card-cta arena-title"><Play className="h-4 w-4 fill-current" />{getCatalogAction(progress.status)}</span>
          <span className="arena-title text-3xl leading-none" style={{ color: "hsl(var(--arena-text) / .18)" }}>{String(index + 1).padStart(2, "0")}</span>
        </span>
      </span>
    </button>
  );
}
