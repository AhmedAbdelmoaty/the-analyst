import { useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasWorkProfile } from '@/features/profile/workProfile';
import analystMark from '@/assets/brand/the-analyst-mark.png';
import { Button } from '@/components/ui/button';
import { GAME_CATALOG } from '@/features/discovery/catalog';
import GameCard from '@/features/discovery/GameCard';
import { getGameProgress } from '@/features/discovery/progress';
import { onboardingStage, selectedGame, journeyDestination } from '@/features/discovery/journey';
import { Navigate } from 'react-router-dom';
import '@/styles/auth.css';
import '@/styles/discovery.css';

export default function Games() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const progressByGame = Object.fromEntries(GAME_CATALOG.map((game) => [game.id, user ? getGameProgress(game.id, user.id) : { status: 'new' as const }]));
  const needsWorkDetails = !hasWorkProfile(profile) && !profile?.work_details_prompt_dismissed_at;
  const dismiss = () => { void updateProfile({ work_details_prompt_dismissed_at: new Date().toISOString() }); };
  if (onboardingStage() === 'plans') return <Navigate to="/plans" replace />;
  if (selectedGame()) return <Navigate to={journeyDestination(true)} replace />;
  return <main className="auth-theme discovery min-h-[100dvh] bg-background text-foreground" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 md:px-10">
      <img className="h-10 w-auto" src={analystMark} alt="The Analyst" />
      <div className="flex flex-wrap items-center gap-2"><span className="hidden text-sm text-muted-foreground sm:inline">أهلاً، {profile?.first_name}</span><Button onClick={() => navigate('/profile/work')}>بيانات العمل</Button><Button className="text-primary" onClick={() => navigate('/subscription')}>اشتراكي</Button><Button className="h-10 w-10 p-0" aria-label="تسجيل الخروج" onClick={async () => { await signOut(); navigate('/'); }}><LogOut className="h-4 w-4" /></Button></div>
    </header>
    <section className="mx-auto max-w-6xl px-5 py-10 md:py-14"><p className="text-sm font-bold text-primary">تجارب The Analyst</p><h1 className="mt-2 text-3xl font-bold md:text-5xl">اختار قضيتك</h1><p className="mt-3 max-w-xl leading-7 text-muted-foreground">كل لعبة بتدرّب زاوية مختلفة من طريقة التفكير التحليلي.</p>
      {needsWorkDetails && <aside className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3 text-sm"><p>أضف القسم والقطاع المرتبطين بخبرتك.</p><div className="flex items-center gap-2"><Button onClick={() => navigate('/profile/work')} className="text-primary">استكمال البيانات</Button><Button onClick={dismiss} aria-label="إخفاء الدعوة" className="h-9 w-9 p-0"><X className="h-4 w-4" /></Button></div></aside>}
      <Button onClick={() => navigate('/plans')} className="mt-4 min-h-11 border-primary px-4 font-bold text-primary">استعرض الخطط</Button>
      <div className="discovery-grid mt-6 grid">{GAME_CATALOG.map(game => <GameCard key={game.id} game={game} progress={progressByGame[game.id]} onChoose={() => navigate(`${game.route}${progressByGame[game.id].status === 'completed' ? '?showResult=1' : ''}`)} />)}</div>
    </section>
  </main>;
}
