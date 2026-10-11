import RewardDecisionGame from '@/features/reward-decision/RewardDecisionGame';
import { GameErrorBoundary } from '@/features/reward-decision/components/GameErrorBoundary';
import { SoundProvider } from '@/hooks/useSoundEffects';
import '@/features/reward-decision/reward-decision.css';

export default function RewardDecisionRoute() {
  return <SoundProvider><GameErrorBoundary><RewardDecisionGame /></GameErrorBoundary></SoundProvider>;
}
