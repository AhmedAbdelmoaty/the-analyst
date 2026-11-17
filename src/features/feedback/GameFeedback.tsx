import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareText, Star, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GAME_CATALOG } from '@/features/discovery/catalog';

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export const gameIdFromPath = (path = window.location.pathname) =>
  GAME_CATALOG.find(g => g.route === path)?.id ?? (path.startsWith('/play') ? 'problem-framing' : path.replace(/^\/games\//, '') || 'platform');

const CATEGORIES = {
  technical: { label: '🐞 مشكلة تقنية', options: ['الصوت فيه مشكلة', 'جزء من الشاشة مقصوص', 'زر مش بيستجيب', 'اللعبة علّقت'], other: 'مشكلة تانية...' },
  gameplay: { label: '🎯 طريقة اللعب والواجهة', options: ['وقت الجولة محتاج تعديل', 'الخطوط أو الكتابة مش واضحة', 'شرح طريقة اللعب محتاج تبسيط'], other: 'ملاحظة تانية...' },
  idea: { label: '💡 فكرة وتطوير', options: ['فكرة تحدي جديد للعبة دي', 'اقتراح لتطوير الشكل أو الأصوات', 'فكرة لعبة جديدة للمنصة'], other: 'فكرة تانية...' },
} as const;
type Cat = keyof typeof CATEGORIES;

const device = () => { const w = window.innerWidth; return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'; };

/** Five stars, star 1 on the right (RTL), with an explicit "x من 5" readout. Saves on tap. */
export function StarRating({ gameId, compact = false }: { gameId?: string; compact?: boolean }) {
  const { user } = useAuth();
  const id = gameId ?? gameIdFromPath();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!user) return;
    db.from('game_ratings').select('stars').eq('user_id', user.id).eq('game_id', id).maybeSingle().then(({ data }: any) => data && setStars(data.stars));
  }, [user, id]);
  const rate = async (value: number) => {
    setStars(value); setSaved(false);
    if (!user) return;
    const { error } = await db.from('game_ratings').upsert({ user_id: user.id, game_id: id, stars: value, updated_at: new Date().toISOString() });
    if (!error) setSaved(true);
  };
  const shown = hover || stars;
  return <div className={`gf-rating ${compact ? 'is-compact' : ''}`} dir="rtl">
    {!compact && <p className="gf-rating-title">إيه تقييمك لمغامرة النهاردة؟</p>}
    <p className="gf-rating-value" aria-live="polite">{shown ? `${shown.toLocaleString('ar-EG')} من ٥` : 'اختار من ١ لـ ٥'}{saved && ' ✓'}</p>
    <div className="gf-stars" role="radiogroup" aria-label="تقييم اللعبة" onPointerLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(v => <button key={v} type="button" role="radio" aria-checked={stars === v} aria-label={`${v} من 5`} className={`gf-star ${v <= shown ? 'is-on' : ''} ${saved && v <= stars ? 'is-saved' : ''}`} onPointerEnter={() => setHover(v)} onClick={() => rate(v)}>
        <Star />
        {(v === 1 || v === 5) && <small>{v === 1 ? '١' : '٥'}</small>}
      </button>)}
    </div>
  </div>;
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [cat, setCat] = useState<Cat>('technical');
  const [option, setOption] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const c = CATEGORIES[cat];
  const isOther = option === c.other;
  const canSend = !!user && (option ? (!isOther || note.trim().length >= 3) : note.trim().length >= 3) && state !== 'sending';
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const send = async () => {
    if (!user) return;
    setState('sending');
    const { error } = await db.from('game_feedback').insert({
      user_id: user.id, game_id: gameIdFromPath(), screen: (document.querySelector('[class*="shot-"],[data-screen]') as HTMLElement | null)?.dataset.screen ?? (document.querySelector('[class*="shot-"]')?.className.match(/shot-[\w-]+/)?.[0] ?? null),
      category: cat, option: option ?? 'اقتراح عام', note: note.trim() || null, device: device(), viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    if (error) { setState('error'); return; }
    setState('done'); setTimeout(onClose, 1800);
  };
  return createPortal(<div className="gf-backdrop" onClick={onClose}>
    <div className="gf-sheet" dir="rtl" role="dialog" aria-modal="true" aria-label="شاركنا رأيك" onClick={e => e.stopPropagation()}>
      {state === 'done' ? <div className="gf-done"><span>🎯</span><b>وصل صوتك يا بطل!</b><p>شكراً، هنراجع ملاحظتك.</p></div> : <>
        <header><h2>شاركنا رأيك</h2><button type="button" onClick={onClose} aria-label="إغلاق"><X /></button></header>
        <StarRating compact />
        <div className="gf-tabs" role="tablist">{(Object.keys(CATEGORIES) as Cat[]).map(k => <button key={k} type="button" role="tab" aria-selected={cat === k} className={cat === k ? 'is-active' : ''} onClick={() => { setCat(k); setOption(null); }}>{CATEGORIES[k].label}</button>)}</div>
        <div className="gf-chips">{[...c.options, c.other].map(o => <button key={o} type="button" className={option === o ? 'is-active' : ''} onClick={() => setOption(o)}>{o}</button>)}</div>
        <textarea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} autoFocus={isOther} key={String(isOther)} placeholder={isOther ? 'اكتب لنا ببساطة...' : cat === 'idea' ? 'احكيلنا فكرتك... (اختياري)' : 'حابب تضيف أي تفاصيل تانية؟ (اختياري)'} rows={3} />
        {state === 'error' && <p className="gf-error">حصلت مشكلة في الإرسال، جرّب تاني.</p>}
        <button type="button" className="gf-send" disabled={!canSend} onClick={send}>{state === 'sending' ? 'جارٍ الإرسال...' : 'إرسال'}</button>
      </>}
    </div>
  </div>, document.body);
}

/** Feedback icon button; `onOpen` lets the game pause itself. */
export function FeedbackButton({ className, onOpen, style }: { className?: string; onOpen?: () => void; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className ?? 'gf-fab'} style={style} onClick={() => { onOpen?.(); setOpen(true); }} aria-label="شاركنا رأيك" title="شاركنا رأيك"><MessageSquareText size={20} /></button>
    {open && <FeedbackSheet onClose={() => setOpen(false)} />}
  </>;
}

/** Average rating per game for hub cards; hidden below 3 ratings. */
let summaryCache: Promise<Record<string, { avg: number; total: number }>> | null = null;
export function useRatingSummary() {
  const [data, setData] = useState<Record<string, { avg: number; total: number }>>({});
  useEffect(() => {
    summaryCache ??= db.rpc('game_rating_summary').then(({ data }: any) => Object.fromEntries((data ?? []).map((r: any) => [r.game_id, { avg: Number(r.avg_stars), total: r.total }])));
    summaryCache.then(setData);
  }, []);
  return data;
}
