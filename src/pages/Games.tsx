import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { LogOut, X, Music, Music2, Volume2, VolumeX, Briefcase, Crown, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasWorkProfile } from '@/features/profile/workProfile';
import { GAME_CATALOG } from '@/features/discovery/catalog';
import { getGameProgress } from '@/features/discovery/progress';
import { onboardingStage, selectedGame, journeyDestination } from '@/features/discovery/journey';
import ArenaGameCard from '@/features/arena/ArenaGameCard';
import { sfx } from '@/features/arena/sfx';
import { bgm } from '@/features/arena/bgm';
import analystImg from '@/assets/characters/analyst.webp';
import saraImg from '@/assets/characters/sara.webp';
import '@/features/arena/arena.css';

const SPARKS = Array.from({ length: 14 }, (_, i) => ({ left: `${(i * 37) % 100}%`, size: 4 + (i % 4) * 3, dur: 7 + (i % 5) * 2, delay: -i * 1.3 }));

export default function Games() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [sfxMuted, setSfxMuted] = useState(sfx.isMuted());
  const [musicMuted, setMusicMuted] = useState(bgm.isMuted());

  useEffect(() => {
    const kick = () => bgm.start();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    return () => { window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); bgm.stop(); };
  }, []);

  if (onboardingStage() === 'plans') return <Navigate to="/plans" replace />;
  if (selectedGame()) return <Navigate to={journeyDestination(true)} replace />;

  const progressByGame = Object.fromEntries(GAME_CATALOG.map((game) => [game.id, user ? getGameProgress(game.id, user.id) : { status: 'new' as const }]));
  const done = Object.values(progressByGame).filter(p => p.status === 'completed').length;
  const needsWorkDetails = !hasWorkProfile(profile) && !profile?.work_details_prompt_dismissed_at;
  const avatar = profile?.avatar_choice === 'sara' || profile?.gender === 'female' ? saraImg : analystImg;
  const dismiss = () => { sfx.play('tick'); void updateProfile({ work_details_prompt_dismissed_at: new Date().toISOString() }); };
  const go = (path: string) => { sfx.play('select'); navigate(path); };

  return (
    <main dir="rtl" className="arena relative min-h-[100dvh] overflow-hidden px-4 pb-14 pt-4 md:px-8">
      <div className="arena-grid pointer-events-none absolute inset-0" />
      {SPARKS.map((s, i) => <span key={i} className="arena-spark" style={{ left: s.left, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />)}

      <div className="relative mx-auto max-w-6xl">
        <header className="arena-hud flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <span className="arena-avatar h-14 w-14 shrink-0"><img src={avatar} alt="" className="h-full w-full object-cover object-top" /></span>
            <div className="min-w-0">
              <p className="arena-title truncate text-xl leading-tight">{profile?.first_name ?? 'البطل'}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="arena-chip !py-0 text-[11px]"><Crown className="h-3 w-3" /> محلل مبتدئ</span>
                <span className="flex items-center gap-1 text-xs font-extrabold"><Trophy className="h-3.5 w-3.5" style={{ color: 'hsl(var(--arena-gold))' }} />{done}/{GAME_CATALOG.length}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="arena-icon-btn" aria-label={musicMuted ? 'تشغيل الموسيقى' : 'إيقاف الموسيقى'} onClick={() => { const v = !musicMuted; bgm.setMuted(v); setMusicMuted(v); }}>
              {musicMuted ? <Music2 className="h-4 w-4 opacity-40" /> : <Music className="h-4 w-4" />}
            </button>
            <button className="arena-icon-btn" aria-label={sfxMuted ? 'تشغيل المؤثرات' : 'كتم المؤثرات'} onClick={() => { const v = !sfxMuted; sfx.setMuted(v); setSfxMuted(v); if (!v) sfx.play('select'); }}>
              {sfxMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button className="arena-icon-btn" onPointerEnter={() => sfx.play('hover')} onClick={() => go('/profile/work')}><Briefcase className="h-4 w-4" /><span className="hidden sm:inline">بيانات العمل</span></button>
            <button className="arena-icon-btn" onPointerEnter={() => sfx.play('hover')} onClick={() => go('/subscription')}><Crown className="h-4 w-4" /><span className="hidden sm:inline">اشتراكي</span></button>
            <button className="arena-icon-btn" aria-label="تسجيل الخروج" onClick={async () => { sfx.play('tick'); await signOut(); navigate('/'); }}><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        <section className="mt-8 text-center">
          <span className="arena-chip"><Zap className="h-3.5 w-3.5" /> ساحة التحديات</span>
          <h1 className="arena-title arena-flame-text mt-3 text-5xl leading-tight md:text-7xl">اختار مهمتك</h1>
          <p className="mx-auto mt-2 max-w-xl text-base font-bold" style={{ color: 'hsl(0 0% 100%)', textShadow: '0 2px 0 hsl(var(--arena-ink))' }}>كل لعبة بتطوّر مهارة مختلفة في التفكير. اكسب، اتعلم، وافتح الإنجازات.</p>
          <div className="mx-auto mt-4 flex max-w-md items-center gap-2">
            <div className="arena-xp flex-1"><span style={{ width: `${Math.max(4, (done / GAME_CATALOG.length) * 100)}%` }} /></div>
            <span className="arena-title text-lg" style={{ color: 'hsl(0 0% 100%)', textShadow: '0 2px 0 hsl(var(--arena-ink))' }}>{done} إنجاز</span>
          </div>
        </section>

        {needsWorkDetails && (
          <aside className="arena-panel mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl p-3 text-sm font-bold">
            <p>⚡ ضيف القسم والقطاع اللي بتشتغل فيهم عشان التجربة تبقى أقرب ليك.</p>
            <div className="flex items-center gap-2">
              <button className="arena-icon-btn" onClick={() => go('/profile/work')}>استكمال</button>
              <button className="arena-icon-btn" onClick={dismiss} aria-label="إخفاء الدعوة"><X className="h-4 w-4" /></button>
            </div>
          </aside>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_CATALOG.map((game, i) => (
            <ArenaGameCard key={game.id} game={game} index={i} progress={progressByGame[game.id]}
              onChoose={() => navigate(`${game.route}${progressByGame[game.id].status === 'completed' ? '?showResult=1' : ''}`)} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <button className="arena-btn px-8 py-3 text-xl" onPointerEnter={() => sfx.play('hover')} onClick={() => go('/plans')}>استعرض الخطط</button>
        </div>
      </div>
    </main>
  );
}
