import TeamPerformanceGame from '@/features/team-performance/TeamPerformanceGame';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamPerformanceRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <main className="h-[100dvh] w-full overflow-hidden">
      <TeamPerformanceGame key={user.id} userId={user.id} />
    </main>
  );
}
