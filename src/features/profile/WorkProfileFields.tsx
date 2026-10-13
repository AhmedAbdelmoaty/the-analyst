import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEPARTMENTS, INDUSTRIES, OTHER_MAX_LENGTH, type WorkProfile } from "@/features/profile/workProfile";

type Props = { value: WorkProfile; onChange: (value: WorkProfile) => void; errors?: Partial<Record<keyof WorkProfile, string>> };
const label = (options: readonly (readonly [string, string])[], id: string | null) => options.find(([key]) => key === id)?.[1] ?? "اختار من القائمة";

function SearchableChoice({ title, options, value, onSelect }: { title: string; options: readonly (readonly [string, string])[]; value: string | null; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => options.filter(([, text]) => text.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);
  const choose = (id: string) => { onSelect(id); setOpen(false); setQuery(""); };
  return <div className="min-w-0">
    <span className="mb-1 block text-sm font-semibold">{title}</span>
    <Popover open={open} onOpenChange={v => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger asChild><Button type="button" role="combobox" aria-label={title} aria-expanded={open} className="h-11 w-full justify-between border-input bg-background px-3 font-normal" dir="rtl"><span className="truncate">{label(options, value)}</span><ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-60" /></Button></PopoverTrigger>
      <PopoverContent align="start" dir="rtl" className="w-[min(22rem,calc(100vw-3rem))] border-neutral-200 bg-white p-2 text-neutral-900 shadow-lg shadow-neutral-900/10">
        <div className="flex items-center gap-2 rounded border border-neutral-200 bg-white px-2"><Search aria-hidden="true" className="h-4 w-4 text-neutral-500"/><input autoFocus role="searchbox" aria-label={`بحث ${title}`} aria-controls={`options-${title}`} aria-activedescendant={filtered[activeIndex] ? `option-${filtered[activeIndex][0]}` : undefined} dir="auto" value={query} onChange={e => { setQuery(e.target.value); setActiveIndex(0); }} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); } if (e.key === "Enter" && filtered[activeIndex]) { e.preventDefault(); choose(filtered[activeIndex][0]); } }} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500" /></div>
        <div id={`options-${title}`} role="listbox" aria-label={title} className="mt-1 max-h-56 overflow-y-auto">
          {filtered.map(([id, text], index) => <button id={`option-${id}`} type="button" role="option" aria-selected={value === id} key={id} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(id)} className={`flex min-h-10 w-full items-center justify-between rounded px-2 text-start text-sm transition-colors hover:bg-[#F8ECEC] hover:text-[#7F171C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A61E25] ${activeIndex === index || value === id ? "bg-[#F8ECEC] text-[#7F171C]" : ""}`}><span>{text}</span>{value === id && <Check className="h-4 w-4 text-[#A61E25]" />}</button>)}
          {!filtered.length && <p className="p-3 text-sm text-neutral-500">لا توجد نتائج</p>}
        </div>
      </PopoverContent>
    </Popover>
  </div>;
}

function OtherField({ id, label: fieldLabel, value, error, onChange }: { id: string; label: string; value: string | null; error?: string; onChange: (v: string) => void }) {
  return <div><label className="mb-1 block text-sm font-semibold" htmlFor={id}>{fieldLabel}</label><input id={id} dir="auto" required maxLength={OTHER_MAX_LENGTH} value={value ?? ""} onChange={e => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/><p className="mt-1 text-end text-xs text-muted-foreground" dir="ltr">{(value ?? "").length}/{OTHER_MAX_LENGTH}</p>{error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error === "too_long" ? `الحد الأقصى ${OTHER_MAX_LENGTH} حرفًا` : "اكتب قيمة قصيرة"}</p>}</div>;
}

export default function WorkProfileFields({ value, onChange, errors = {} }: Props) {
  const update = (patch: Partial<WorkProfile>) => onChange({ ...value, ...patch });
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" dir="rtl">
    <div><SearchableChoice title="بتشتغل في أنهي قسم؟" options={DEPARTMENTS} value={value.department} onSelect={department => update({ department, department_other: department === "other" ? value.department_other : null })}/>{errors.department && <p role="alert" className="mt-1 text-xs text-destructive">اختار قسم</p>}</div>
    <div><SearchableChoice title="شركتك في أنهي قطاع؟" options={INDUSTRIES} value={value.industry} onSelect={industry => update({ industry, industry_other: industry === "other" ? value.industry_other : null })}/>{errors.industry && <p role="alert" className="mt-1 text-xs text-destructive">اختار قطاع</p>}</div>
    {value.department === "other" && <OtherField id="department_other" label="اكتب القسم" value={value.department_other} error={errors.department_other} onChange={department_other => update({ department_other })}/>}
    {value.industry === "other" && <OtherField id="industry_other" label="اكتب القطاع" value={value.industry_other} error={errors.industry_other} onChange={industry_other => update({ industry_other })}/>}
  </div>;
}
