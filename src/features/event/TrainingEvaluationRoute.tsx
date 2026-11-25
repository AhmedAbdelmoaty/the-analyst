import { useCallback, useEffect } from "react";
import Game from "@/features/training-evaluation/Game";
import type { State } from "@/features/training-evaluation/engine";
import { eventJoin, eventSubmit } from "./eventApi";
import EventSubmitted from "./EventSubmitted";

export default function TrainingEvaluationRoute() {
  useEffect(() => { void eventJoin(); }, []);
  const onSubmit = useCallback((s: State) => { void eventSubmit(s.claim, s.evidence); }, []);
  return <Game onSubmit={onSubmit} submittedView={<EventSubmitted />} />;
}
