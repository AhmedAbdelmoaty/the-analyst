import RewardDecisionGame from '@/features/reward-decision/RewardDecisionGame';
import { GameErrorBoundary } from '@/features/reward-decision/components/GameErrorBoundary';
import '@/features/reward-decision/reward-decision.css';

export default function RewardDecisionRoute() {
  return <GameErrorBoundary><RewardDecisionGame /></GameErrorBoundary>;
}
