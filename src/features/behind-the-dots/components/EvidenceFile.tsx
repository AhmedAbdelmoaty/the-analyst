import { FolderOpen } from "lucide-react";
import { CASES, type CaseId, type StoryCase } from "../data/cases";
import { PATTERN_LABELS } from "../engine/correlation";
import type { CaseResult } from "../engine/gameState";
import { ScatterPlot } from "./ScatterPlot";

export function EvidenceCard({ id, result, selected, onClick, storyCase }: { id: CaseId; result?: CaseResult | undefined; selected?: boolean; onClick?: () => void; storyCase?: StoryCase | undefined }) {
  const c = storyCase ?? CASES.find((x) => x.id === id)!;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      className={`animate-pop rounded-xl border bg-card p-3 text-right shadow-card transition ${selected ? "border-primary ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-bold">{c.evidenceTitle}</div>
        {result && (
          <span className="rounded-md bg-primary-soft px-2 py-0.5 text-sm font-bold text-primary">
            {PATTERN_LABELS[result.actual]}
          </span>
        )}
      </div>
      <div className="my-2 rounded-md bg-muted/60 p-1">
        <ScatterPlot compact xs={c.xs} ys={c.ys} xLabel={c.xLabel} yLabel={c.yLabel} />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{c.evidenceSummary}</p>
    </Tag>
  );
}

export function EvidenceTray({ evidence }: { evidence: CaseId[] }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      <FolderOpen className="h-4 w-4 text-primary" />
      <span>صفحات خلصناها</span>
      <span className="font-latin font-semibold text-foreground">{evidence.length} من {CASES.length}</span>
      <div className="flex gap-1">
        {CASES.map((c) => (
          <span key={c.id} className={`h-2 w-5 rounded-full ${evidence.includes(c.id) ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}
