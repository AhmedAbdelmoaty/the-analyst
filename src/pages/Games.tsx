import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasWorkProfile } from '@/features/profile/workProfile';
import { GAME_CATALOG } from '@/features/discovery/catalog';
import { getGameProgress } from '@/features/discovery/progress';
import { selectedGame, journeyDestination, selectGame } from '@/features/discovery/journey';
import { onboardingFor, finishOnboarding } from '@/features/discovery/onboarding';
import { useGameAccess } from '@/features/entitlement/useGameAccess';
import PlatformHeader from '@/features/platform-shell/PlatformHeader';
import GameCoverCard from '@/features/platform-shell/GameCoverCard';
import PlayerCenter from '@/features/platform-shell/PlayerCenter';
import { cardAccess } from '@/features/platform-shell/accessPresentation';

export default function Games() {
  const { user, profile, updateProfile } = useAuth();
  const { snapshot, refresh } = useGameAccess();
  const navigate = useNavigate();
  const [, rerender] = useState(0);
  useEffect(() => {
    const update = () => rerender(value => value + 1);
    window.addEventListener('focus', update); window.addEventListener('storage', update);
    return () => { window.removeEventListener('focus', update); window.removeEventListener('storage', update); };
  }, []);
  if (user && onboardingFor(user.id)?.stage === 'plans') return <Navigate to="/plans" replace />;
  const continuation = user && finishOnboarding(user.id);
  if (continuation && continuation !== '/app') return <Navigate to={continuation} replace />;
  if (selectedGame()) return <Navigate to={journeyDestination(true)} replace />;
  const progress = Object.fromEntries(GAME_CATALOG.map(game => [game.id, user ? getGameProgress(game.id, user.id) : { status: 'new' as const }]));
  const needsWork = !hasWorkProfile(profile) && !profile?.work_details_prompt_dismissed_at;
  return <div className="platform hub-world" dir="rtl"><div className="platform-container">
    <PlatformHeader><Link className="platform-button hub-plans-link" to="/plans">الخطط</Link><PlayerCenter snapshot={snapshot} /></PlatformHeader>
    <main>
      <div className="hub-intro platform-heading"><div><p className="platform-kicker">مغامراتك</p><h1>اختار مغامرتك</h1><p className="platform-muted">ادخل الحكاية، افحص الأدلة، وخد القرار بطريقتك.</p></div><span className="hub-library-label">٦ حكايات تستحق التجربة<ArrowLeft /></span></div>
      {needsWork && <aside className="platform-note mb-4 flex items-center justify-between gap-3"><span>ضيف القسم وقطاع العمل من مركز اللاعب.</span><button aria-label="إخفاء الدعوة" className="platform-icon" onClick={() => void updateProfile({ work_details_prompt_dismissed_at: new Date().toISOString() })}><X /></button></aside>}
      <div className="hub-grid">{GAME_CATALOG.map(game => <GameCoverCard key={game.id} game={game} progress={progress[game.id]} snapshot={snapshot} onChoose={() => {
        if (cardAccess(game, progress[game.id], snapshot).decision === 'deny') { selectGame(game.id); navigate('/plans'); }
        else navigate(`${game.route}${progress[game.id].status === 'completed' ? '?showResult=1' : ''}`);
      }} />)}</div>
      <footer className="hub-footer"><p>{snapshot?.enforcement === false ? 'كل الألعاب متاحة حاليًا للحسابات المكتملة أثناء التطوير.' : 'الوصول للألعاب حسب حالة حسابك واشتراكك المتحقق منها.'}</p>{snapshot?.enforcement === null && <button className="platform-button" onClick={() => void refresh()}>إعادة التحقق من الوصول</button>}<p>تقدّم الألعاب محفوظ على المتصفح ده.</p></footer>
    </main>
  </div></div>;
}
