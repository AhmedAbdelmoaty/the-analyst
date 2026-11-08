import { useAuth } from '@/contexts/AuthContext';
import ProfitParadoxGame from '@/features/profit-paradox/ProfitParadoxGame';

export default function ProfitParadoxRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <ProfitParadoxGame key={user.id} userId={user.id} />;
}
