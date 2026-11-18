import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareText, Star, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GAME_CATALOG } from '@/features/discovery/catalog';
import { feedbackCategoriesFor, feedbackConfigFor, feedbackReady, type FeedbackCategoryId } from './feedbackConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export const gameIdFromPath = (path = window.location.pathname) =>
  GAME_CATALOG.find(g => g.route === path)?.id ?? (path.startsWith('/play') ? 'problem-framing' : path.replace(/^\/games\//, '') || 'platform');

const device = () => { const w = window.innerWidth; return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'; };

/** End-of-game experience rating. Performance stars remain owned by each game. */
export function StarRating({ gameId, onRated }: { gameId?: string; onRated?: (stars: number) => void }) {
  const { user } = useAuth();
  const id = gameId ?? gameIdFromPath();
  const config = feedbackConfigFor(id);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!user) return;
    db.from('game_ratings').select('stars').eq('user_id', user.id).eq('game_id', id).maybeSingle().then(({ data }: any) => data && setStars(data.stars));
  }, [user, id]);
  const rate = async (value: number) => {
    setStars(value); setSaved(false);
    onRated?.(value);
    if (!user) return;
    const { error } = await db.from('game_ratings').upsert({ user_id: user.id, game_id: id, stars: value, updated_at: new Date().toISOString() });
    if (!error) setSaved(true);
  };
  const shown = hover || stars;
  return <section className="gf-rating gf-ending-rating" dir="rtl" data-game={id} style={{ '--gf-accent': config.accent } as CSSProperties} aria-label="تقييم تجربة اللعبة">
    <span className="gf-rating-kicker">رأيك يفرق معانا ✨</span>
    <p className="gf-rating-title">{config.ratingTitle}</p>
    <p className="gf-rating-value" aria-live="polite">{saved ? 'شكرًا! تقييمك وصل ⭐' : shown ? `${shown.toLocaleString('ar-EG')} من ٥` : config.ratingPrompt}</p>
    <div className="gf-stars" role="radiogroup" aria-label="تقييم اللعبة" onPointerLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(v => <button key={v} type="button" role="radio" aria-checked={stars === v} aria-label={`${v} من 5`} className={`gf-star ${v <= shown ? 'is-on' : ''} ${saved && v <= stars ? 'is-saved' : ''}`} onPointerEnter={() => setHover(v)} onClick={() => rate(v)}>
        <Star />
      </button>)}
    </div>
  </section>;
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [cat, setCat] = useState<FeedbackCategoryId>('technical');
  const [option, setOption] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const id = gameIdFromPath();
  const categories = useMemo(() => feedbackCategoriesFor(id), [id]);
  const c = categories[cat];
  const isOther = option === c.other;
  const ideaRequired = cat === 'idea';
  const canSend = !!user && feedbackReady(cat, option, note, c.other) && state !== 'sending';
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const send = async () => {
    if (!user) return;
    setState('sending');
    const { error } = await db.from('game_feedback').insert({
      user_id: user.id, game_id: id, screen: (document.querySelector('[class*="shot-"],[data-screen]') as HTMLElement | null)?.dataset.screen ?? (document.querySelector('[class*="shot-"]')?.className.match(/shot-[\w-]+/)?.[0] ?? null),
      category: cat, option: option ?? 'اقتراح عام', note: note.trim() || null, device: device(), viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    if (error) { setState('error'); return; }
    setState('done'); setTimeout(onClose, 1800);
  };
  return createPortal(<div className="gf-backdrop" onClick={onClose}>
    <div className="gf-sheet" dir="rtl" role="dialog" aria-modal="true" aria-label="شاركنا رأيك" onClick={e => e.stopPropagation()}>
      {state === 'done' ? <div className="gf-done"><span>🎯</span><b>وصل صوتك يا بطل!</b><p>شكراً، هنراجع ملاحظتك.</p></div> : <>
        <header><h2>شاركنا رأيك</h2><button type="button" onClick={onClose} aria-label="إغلاق"><X /></button></header>
        <div className="gf-tabs" role="tablist">{(Object.keys(categories) as FeedbackCategoryId[]).map(k => <button key={k} type="button" role="tab" aria-selected={cat === k} className={cat === k ? 'is-active' : ''} onClick={() => { setCat(k); setOption(null); setNote(''); setState('idle'); }}>{categories[k].label}</button>)}</div>
        <div className="gf-chips">{[...c.options, c.other].map(o => <button key={o} type="button" className={option === o ? 'is-active' : ''} onClick={() => setOption(o)}>{o}</button>)}</div>
        {ideaRequired && <p className="gf-required-note">اشرح فكرتك وإزاي تتخيلها عشان نقدر نفهمها ونشتغل عليها.</p>}
        <textarea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} autoFocus={isOther} key={`${cat}-${String(isOther)}`} required={ideaRequired || isOther} aria-required={ideaRequired || isOther} placeholder={ideaRequired ? 'احكيلنا تفاصيل الفكرة أو الاقتراح...' : isOther ? 'اكتب لنا التفاصيل...' : 'حابب تضيف أي تفاصيل تانية؟ (اختياري)'} rows={3} />
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
