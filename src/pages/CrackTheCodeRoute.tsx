import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { IframeGameShell } from '@/components/game/IframeGameShell';

export default function CrackTheCodeRoute() {
  const { user } = useAuth();
  const showResult = new URLSearchParams(useLocation().search).get('showResult') === '1';
  if (!user) return null;

  return <IframeGameShell userId={user.id} title="Crack the Code — الشفرة الأخيرة" src={`/crack-the-code/index.html${showResult ? '?showResult=1' : ''}`} background="#fff6e7" />;
}
