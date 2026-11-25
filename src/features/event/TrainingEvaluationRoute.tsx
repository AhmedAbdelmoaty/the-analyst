import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Game from "@/features/training-evaluation/Game";
import type { State } from "@/features/training-evaluation/engine";
import { eventJoin, eventSubmit } from "./eventApi";

export default function TrainingEvaluationRoute() {
  const navigate = useNavigate();
  useEffect(() => { void eventJoin(); }, []);
  const onSubmit = useCallback((s: State) => { void eventSubmit(s.claim, s.evidence); }, []);
  const endActions = <div style={{ textAlign: "center", width: "100%" }}>
    <p style={{ fontWeight: 800, marginBottom: 12, lineHeight: 1.7 }}>تم توثيق توصيتك بنجاح! سيتم إعلان المراكز الأولى بعد قليل.</p>
    <button className="g-btn primary big" onClick={() => navigate("/event/offer", { replace: true })}>متابعة</button>
  </div>;
  return <Game onSubmit={onSubmit} endActions={endActions} />;
}
