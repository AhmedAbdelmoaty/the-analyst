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
  const [playing, setPlaying] = useState(bgm.isPlaying());

  useEffect(() => {
    bgm.start('hub');
    const off = bgm.subscribe(() => setPlaying(bgm.isPlaying()));
    return () => { off(); bgm.stop(); };
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
    <main dir="rtl" className="arena relative min-h-[100dvh] overflow-hidden px-4 pb-12 pt-4 md:px-8">
      <div className="arena-grid pointer-events-none absolute inset-0" />
      {SPARKS.map((s, i) => <span key={i} className="arena-spark" style={{ left: s.left, width: s.size / 2, height: s.size / 2, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />)}

      <div className="relative mx-auto max-w-6xl">
        <header className="arena-hud flex flex-wrap items-center justify-between gap-3 px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="arena-avatar h-11 w-11 shrink-0"><img src={avatar} alt="" className="h-full w-full object-cover object-top" /></span>
            <div className="min-w-0">
              <p className="arena-title truncate text-lg leading-tight">{profile?.first_name ?? 'البطل'}</p>
              <div className="flex items-center gap-2 text-[11px] font-extrabold">
                <span style={{ color: 'hsl(var(--arena-gold))' }} className="flex items-center gap-1"><Crown className="h-3 w-3" /> محلل مبتدئ</span>
                <span className="arena-muted flex items-center gap-1"><Trophy className="h-3 w-3" />{done}/{GAME_CATALOG.length}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button className="arena-icon-btn" data-on={!musicMuted} aria-label={musicMuted ? 'تشغيل الموسيقى' : 'إيقاف الموسيقى'} onClick={() => { const v = !musicMuted; bgm.setMuted(v); setMusicMuted(v); }}>
              {musicMuted ? <Music2 className="h-4 w-4 opacity-50" /> : <Music className="h-4 w-4" />}
              <span className="arena-eq" data-off={musicMuted || !playing}><i /><i /><i /><i /></span>
            </button>
            <button className="arena-icon-btn" data-on={!sfxMuted} aria-label={sfxMuted ? 'تشغيل المؤثرات' : 'كتم المؤثرات'} onClick={() => { const v = !sfxMuted; sfx.setMuted(v); setSfxMuted(v); if (!v) sfx.play('select'); }}>
              {sfxMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button className="arena-icon-btn" onPointerEnter={() => sfx.play('hover')} onClick={() => go('/profile/work')}><Briefcase className="h-4 w-4" /><span className="hidden sm:inline">بيانات العمل</span></button>
            <button className="arena-icon-btn" onPointerEnter={() => sfx.play('hover')} onClick={() => go('/subscription')}><Crown className="h-4 w-4" /><span className="hidden sm:inline">اشتراكي</span></button>
            <button className="arena-icon-btn" aria-label="تسجيل الخروج" onClick={async () => { sfx.play('tick'); await signOut(); navigate('/'); }}><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        <section className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="arena-chip"><Zap className="h-3.5 w-3.5" /> ساحة التحديات</span>
            <h1 className="arena-title arena-flame-text mt-2 text-4xl leading-tight md:text-5xl">اختار مهمتك</h1>
            <p className="arena-muted mt-1 text-sm font-bold">كل لعبة بتطوّر مهارة مختلفة في التفكير. العب، اكسب، وافتح الإنجازات.</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1 flex justify-between text-xs font-extrabold"><span className="arena-muted">تقدّمك</span><span style={{ color: 'hsl(var(--arena-gold))' }}>{done} / {GAME_CATALOG.length} إنجاز</span></div>
            <div className="arena-xp"><span style={{ width: `${Math.max(3, (done / GAME_CATALOG.length) * 100)}%` }} /></div>
          </div>
        </section>

        {needsWorkDetails && (
          <aside className="arena-panel mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-bold">
            <p>⚡ ضيف القسم والقطاع اللي بتشتغل فيهم عشان التجربة تبقى أقرب ليك.</p>
            <div className="flex items-center gap-2">
              <button className="arena-icon-btn" onClick={() => go('/profile/work')}>استكمال</button>
              <button className="arena-icon-btn" onClick={dismiss} aria-label="إخفاء الدعوة"><X className="h-4 w-4" /></button>
            </div>
          </aside>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_CATALOG.map((game, i) => (
            <ArenaGameCard key={game.id} game={game} index={i} progress={progressByGame[game.id]}
              onChoose={() => navigate(`${game.route}${progressByGame[game.id].status === 'completed' ? '?showResult=1' : ''}`)} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="arena-btn px-8 py-2.5 text-lg" onPointerEnter={() => sfx.play('hover')} onClick={() => go('/plans')}>استعرض الخطط</button>
        </div>
      </div>
    </main>
  );
}
