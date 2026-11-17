import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { GAMES, gameLabel } from '@/features/admin-stats/labels';
import { cairoDateTime, downloadCsv } from '@/lib/analytics/export';
import { Button } from '@/components/ui/button';

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;
const CAT: Record<string, string> = { technical: 'مشكلة تقنية', gameplay: 'طريقة اللعب', idea: 'فكرة' };

export default function AdminFeedback() {
  const [game, setGame] = useState('all');
  const [cat, setCat] = useState('all');
  const q = useQuery({ queryKey: ['adm-feedback'], queryFn: async () => {
    const [fb, rt, pr] = await Promise.all([
      db.from('game_feedback').select('*').order('created_at', { ascending: false }).limit(1000),
      db.from('game_ratings').select('*').order('updated_at', { ascending: false }).limit(5000),
      db.from('profiles').select('user_id, first_name, last_name, display_name, phone').limit(10000),
    ]);
    if (fb.error) throw fb.error; if (rt.error) throw rt.error;
    const people = Object.fromEntries((pr.data ?? []).map((p: any) => [p.user_id, p]));
    return { feedback: fb.data as any[], ratings: rt.data as any[], people };
  } });
  const d = q.data;
  const name = (id: string) => { const p = d?.people[id]; return p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || '—' : '—'; };
  const rows = useMemo(() => (d?.feedback ?? []).filter(r => (game === 'all' || r.game_id === game) && (cat === 'all' || r.category === cat)), [d, game, cat]);
  const stats = useMemo(() => {
    const m: Record<string, { sum: number; n: number }> = {};
    (d?.ratings ?? []).forEach(r => { (m[r.game_id] ??= { sum: 0, n: 0 }); m[r.game_id].sum += r.stars; m[r.game_id].n++; });
    return m;
  }, [d]);
  const rating = (uid: string, g: string) => d?.ratings.find(r => r.user_id === uid && r.game_id === g)?.stars ?? '';
  const exportCsv = () => downloadCsv({ name: 'feedback', headers: ['التاريخ', 'اللاعب', 'الهاتف', 'اللعبة', 'النوع', 'الاختيار', 'النص', 'التقييم', 'الجهاز', 'الشاشة'],
    rows: rows.map(r => [cairoDateTime(r.created_at), name(r.user_id), d?.people[r.user_id]?.phone ?? '', gameLabel(r.game_id), CAT[r.category] ?? r.category, r.option, r.note ?? '', rating(r.user_id, r.game_id), r.device ?? '', r.screen ?? '']) } as any, 'player-feedback.csv');
  if (q.isLoading) return <p className="py-6 text-muted-foreground">جارٍ التحميل...</p>;
  if (q.error) return <p className="py-6 text-destructive">تعذر تحميل الآراء.</p>;
  return <div className="space-y-4 py-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(stats).map(([g, s]) => <div key={g} className="rounded-lg border border-border bg-card p-3"><div className="text-sm text-muted-foreground">{gameLabel(g)}</div><div className="text-xl font-bold">★ {(s.sum / s.n).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">({s.n} تقييم)</span></div></div>)}
      {!Object.keys(stats).length && <p className="text-sm text-muted-foreground">لا توجد تقييمات بعد.</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <select value={game} onChange={e => setGame(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"><option value="all">كل الألعاب</option>{GAMES.map((g: any) => <option key={g.id ?? g} value={g.id ?? g}>{gameLabel(g.id ?? g)}</option>)}</select>
      <select value={cat} onChange={e => setCat(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"><option value="all">كل الأنواع</option>{Object.entries(CAT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <span className="text-sm text-muted-foreground">{rows.length} ملاحظة</span>
      <Button variant="outline" size="sm" className="ms-auto" onClick={exportCsv} disabled={!rows.length}>تصدير CSV</Button>
    </div>
    <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr>{['التاريخ', 'اللاعب', 'الهاتف', 'اللعبة', 'النوع', 'الاختيار', 'النص', 'التقييم', 'الجهاز'].map(h => <th key={h} className="p-2 text-start">{h}</th>)}</tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} className="border-t border-border align-top"><td className="p-2 whitespace-nowrap" dir="ltr">{cairoDateTime(r.created_at)}</td><td className="p-2">{name(r.user_id)}</td><td className="p-2" dir="ltr">{d?.people[r.user_id]?.phone ?? '—'}</td><td className="p-2">{gameLabel(r.game_id)}</td><td className="p-2">{CAT[r.category]}</td><td className="p-2">{r.option}</td><td className="p-2 max-w-xs whitespace-pre-wrap">{r.note ?? '—'}</td><td className="p-2">{rating(r.user_id, r.game_id) ? `★ ${rating(r.user_id, r.game_id)}` : '—'}</td><td className="p-2">{r.device}</td></tr>)}
      {!rows.length && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">لا توجد ملاحظات بعد.</td></tr>}</tbody></table></div>
  </div>;
}
