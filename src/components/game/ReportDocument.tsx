import { motion } from "framer-motion";
import { FileText, Stamp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvidenceData } from "@/lib/pf-case/evidence-catalog";

interface ReportDocumentProps {
  evidence: EvidenceData;
  /** Compact rendering when shown inline in dialogue (smaller height) */
  compact?: boolean;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted-foreground))",
};

/**
 * ReportDocument — renders a chart/table as a printed paper report,
 * with a header (title + issuer + date), the chart body, and a
 * stamp + footnote on the bottom. This makes evidence feel like an
 * artifact Hisham El Sherif hands over, not a chat-bubble data dump.
 */
export const ReportDocument = ({ evidence, compact = false }: ReportDocumentProps) => {
  const chartHeight = compact ? "h-52" : "h-72";
  const suffix = evidence.valueSuffix ?? "";
  const fmt = (v: number | string) => `${v}${suffix}`;
  const tooltipFormatter = (v: number | string, name: string) => [fmt(v), name];
  const yAxisProps = evidence.yMax
    ? {
        domain: [0, evidence.yMax] as [number, number],
        ticks: evidence.yTicks,
        tickFormatter: (v: number) => fmt(v),
      }
    : { tickFormatter: (v: number) => fmt(v) };

  return (
    <motion.div
      className="relative rounded-lg overflow-hidden border-2 border-border/70 shadow-lg"
      initial={{ opacity: 0, scale: 0.9, y: 36, rotate: -2.5 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      dir="rtl"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--imp-paper)) 0%, hsl(42 32% 91%) 100%)",
        color: "hsl(20 14% 18%)",
        fontFamily: "inherit",
      }}
    >
      {/* Paper "lines" texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 23px, hsl(20 14% 18%) 23px, hsl(20 14% 18%) 24px)",
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        initial={{ x: "-40%" }}
        animate={{ x: "320%" }}
        transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
      />

      {/* Header */}
      <div className="relative px-4 pt-4 pb-3 border-b-2 border-dashed border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 opacity-70" />
              <span className="text-[10px] uppercase tracking-widest opacity-60">
                تقرير رسمي
              </span>
            </div>
            <h4 className="text-sm font-bold leading-tight">{evidence.title}</h4>
          </div>
          {evidence.reportDate && (
            <div className="text-[10px] opacity-70 text-left shrink-0 leading-tight">
              <div>تاريخ الإصدار</div>
              <div className="font-bold mt-0.5">{evidence.reportDate}</div>
            </div>
          )}
        </div>
        {evidence.issuer && (
          <div className="text-[11px] opacity-70 mt-1">
            صادر عن: <span className="font-semibold">{evidence.issuer}</span>
          </div>
        )}
        {evidence.caption && (
          <p className="text-xs opacity-80 mt-2 leading-relaxed">
            {evidence.caption}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="relative px-3 py-3">
        {evidence.type === "bar" && (
          <div className={`${chartHeight} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evidence.rows} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 14% 18% / 0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} {...yAxisProps} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--imp-paper))",
                    border: "1px solid hsl(20 14% 18% / 0.3)",
                    fontSize: 12,
                    color: "hsl(20 14% 18%)",
                  }}
                  formatter={tooltipFormatter}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationBegin={180} animationDuration={900} animationEasing="ease-out">
                  {evidence.rows.map((_, i) => (
                    <Cell key={i} fill={COLORS.primary} />
                  ))}
                  <LabelList dataKey="value" position="top" formatter={fmt} style={{ fontSize: 11, fontWeight: 700, fill: "hsl(20 14% 18%)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {evidence.type === "stacked_bar" && (
          <div className={`${chartHeight} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evidence.rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 14% 18% / 0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} {...yAxisProps} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--imp-paper))",
                    border: "1px solid hsl(20 14% 18% / 0.3)",
                    fontSize: 12,
                    color: "hsl(20 14% 18%)",
                  }}
                  formatter={tooltipFormatter}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "hsl(20 14% 18%)" }} />
                <Bar dataKey="individuals" name="أفراد" stackId="a" fill={COLORS.primary} isAnimationActive animationBegin={180} animationDuration={900} animationEasing="ease-out" />
                <Bar dataKey="corporate" name="تحويلات من فروع أخرى" stackId="a" fill={COLORS.accent} radius={[6, 6, 0, 0]} isAnimationActive animationBegin={280} animationDuration={900} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {evidence.type === "grouped_bar" && (
          <div className={`${chartHeight} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evidence.rows} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="25%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 14% 18% / 0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} {...yAxisProps} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--imp-paper))",
                    border: "1px solid hsl(20 14% 18% / 0.3)",
                    fontSize: 12,
                    color: "hsl(20 14% 18%)",
                  }}
                  formatter={tooltipFormatter}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "hsl(20 14% 18%)" }} />
                <Bar dataKey="individuals" name="أفراد" fill={COLORS.primary} radius={[6, 6, 0, 0]} isAnimationActive animationBegin={180} animationDuration={900} animationEasing="ease-out">
                  <LabelList dataKey="individuals" position="top" formatter={fmt} style={{ fontSize: 10, fontWeight: 700, fill: "hsl(20 14% 18%)" }} />
                </Bar>
                <Bar dataKey="corporate" name="تحويلات من فروع أخرى" fill={COLORS.accent} radius={[6, 6, 0, 0]} isAnimationActive animationBegin={280} animationDuration={900} animationEasing="ease-out">
                  <LabelList dataKey="corporate" position="top" formatter={fmt} style={{ fontSize: 10, fontWeight: 700, fill: "hsl(20 14% 18%)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {evidence.type === "line" && (
          <div className={`${chartHeight} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evidence.rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 14% 18% / 0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(20 14% 18%)" }} {...yAxisProps} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--imp-paper))",
                    border: "1px solid hsl(20 14% 18% / 0.3)",
                    fontSize: 12,
                    color: "hsl(20 14% 18%)",
                  }}
                  formatter={tooltipFormatter}
                />
                <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationBegin={180} animationDuration={1000} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {evidence.type === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-border/60">
                  {evidence.headers?.map((h) => (
                    <th key={h} className="text-right py-2 px-2 font-bold opacity-80">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evidence.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {row.cells?.map((c, j) => (
                      <td key={j} className={`py-2 px-2 ${j === 0 ? "font-bold" : ""}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {evidence.type === "list" && (
          <ul className="space-y-1.5 py-1">
            {evidence.rows.map((row, i) => (
              <motion.li
                key={i}
                className="text-xs flex items-start gap-2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.08 }}
              >
                <span className="opacity-60 mt-0.5">•</span>
                <span>{row.label}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer with stamp + footnote(s) */}
      <div className="relative px-4 pt-2 pb-3 border-t-2 border-dashed border-border/60 flex items-end justify-between gap-3">
        <div className="text-[10px] opacity-70 leading-snug flex-1 space-y-1">
          {evidence.footnotes && evidence.footnotes.length > 0 ? (
            evidence.footnotes.map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p>{evidence.footnote || "ملاحظة: التقرير للاستخدام الداخلي فقط."}</p>
          )}
        </div>
        {/* Faux ink stamp */}
        <motion.div
          className="shrink-0 flex flex-col items-center justify-center rounded-md border-2 px-2 py-1 -rotate-6 select-none"
          initial={{ opacity: 0, scale: 1.8, rotate: -18 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ delay: 0.38, type: "spring", damping: 10, stiffness: 220 }}
          style={{
            borderColor: "hsl(var(--imp-red) / 0.72)",
            color: "hsl(var(--imp-red) / 0.88)",
          }}
        >
          <Stamp className="w-3 h-3 mb-0.5" />
          <span className="text-[9px] font-bold tracking-widest">معتمد</span>
        </motion.div>
      </div>
    </motion.div>
  );
};
