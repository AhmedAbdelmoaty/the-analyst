import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { IframeGameShell } from '@/components/game/IframeGameShell';

export default function InvestigationFileRoute() {
  const { user } = useAuth();
  const showResult = new URLSearchParams(useLocation().search).get('showResult') === '1';
  if (!user) return null;

  return <IframeGameShell userId={user.id} title="ملف تحت التحقيق — مفارقة سمبسون" src={`/investigation-file/index.html${showResult ? '?showResult=1' : ''}`} background="#fbf7ee" />;
}
