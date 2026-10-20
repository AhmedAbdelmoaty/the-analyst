import { useAuth } from '@/contexts/AuthContext';
import { BehindTheDotsGame } from '@/features/behind-the-dots/BehindTheDotsGame';
import '@/features/behind-the-dots/behind-the-dots.css';

export default function BehindTheDotsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <BehindTheDotsGame key={user.id} userId={user.id} />;
}
