import { useRef } from "react";
import { Play, Trophy, Flame, Swords } from "lucide-react";
import type { CatalogGame } from "@/features/discovery/catalog";
import { getCatalogAction, type GameProgress } from "@/features/discovery/progress";
import { sfx } from "./sfx";

const GENRE: Record<string, { label: string; hue: string; level: number }> = {
  "problem-framing": { label: "مغامرة RPG", hue: "--arena-flame", level: 1 },
  "reward-decision": { label: "تكتيك", hue: "--arena-violet", level: 2 },
  "behind-the-dots": { label: "ألغاز", hue: "--arena-sky-deep", level: 2 },
  "crack-the-code": { label: "هروب وألغاز", hue: "--arena-flame-hot", level: 3 },
  "decision-matrix": { label: "استراتيجية", hue: "--arena-lime", level: 2 },
  "investigation-file": { label: "تكتيك", hue: "--arena-gold", level: 3 },
};
const STATUS = { new: "مهمة جديدة", "in-progress": "قيد اللعب", completed: "تم الإنجاز" } as const;

export default function ArenaGameCard({ game, progress, index, onChoose }: { game: CatalogGame; progress: GameProgress; index: number; onChoose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const g = GENRE[game.id] ?? { label: "لعبة", hue: "--arena-flame", level: 1 };
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${-y * 10}deg`); el.style.setProperty("--ry", `${x * 12}deg`);
  };
  const reset = () => { ref.current?.style.setProperty("--rx", "0deg"); ref.current?.style.setProperty("--ry", "0deg"); };

  return (
    <button ref={ref} type="button" aria-label={`${getCatalogAction(progress.status)}: ${game.title}`}
      className="arena-card group text-right" data-status={progress.status}
      style={{ ["--card-hue" as string]: `var(${g.hue})`, animationDelay: `${index * 80}ms` }}
      onPointerEnter={() => sfx.play("hover")} onPointerMove={onMove} onPointerLeave={reset}
      onClick={() => { sfx.play("launch"); setTimeout(onChoose, 380); }}>
      <span className="arena-card-cover">
        <img src={game.cover} alt="" loading="lazy" />
        <span className="arena-card-shine" />
        <span className="arena-chip absolute right-3 top-3" style={{ background: `hsl(var(${g.hue}))` }}><Swords className="h-3.5 w-3.5" />{g.label}</span>
        <span className="arena-card-status absolute left-3 top-3">
          {progress.status === "completed" ? <Trophy className="h-3.5 w-3.5" /> : progress.status === "in-progress" ? <Flame className="h-3.5 w-3.5" /> : null}
          {STATUS[progress.status]}
        </span>
        <span className="arena-card-num arena-title">{String(index + 1).padStart(2, "0")}</span>
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold" style={{ color: `hsl(var(${g.hue}))` }}>{game.category}</span>
          <span className="flex gap-0.5" aria-label={`الصعوبة ${g.level} من 3`}>
            {[1, 2, 3].map(n => <Flame key={n} className="h-4 w-4" style={{ color: n <= g.level ? "hsl(var(--arena-flame))" : "hsl(var(--arena-ink) / 0.2)" }} />)}
          </span>
        </span>
        <span className="arena-title text-2xl leading-tight">{game.title}</span>
        <span className="line-clamp-2 text-[13px] font-semibold leading-6 opacity-75">{game.description}</span>
        {progress.hint && <span className="text-xs font-bold opacity-70">{progress.hint}</span>}
        <span className="arena-card-cta arena-title mt-auto">
          <Play className="h-5 w-5 fill-current" />
          {getCatalogAction(progress.status)}
        </span>
      </span>
    </button>
  );
}
