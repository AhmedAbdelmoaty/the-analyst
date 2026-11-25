import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Game from "@/features/training-evaluation/Game";
import type { State } from "@/features/training-evaluation/engine";
import { eventBegin, eventJoin, eventSubmit } from "./eventApi";

/** Event wrapper: the server times each play from Start now; vouchers appear only after the admin announces results. */
export default function TrainingEvaluationRoute() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => { void eventJoin(); }, []);
  const onSubmit = useCallback((s: State) => {
    setError("");
    const send = (left: number): void => { void eventSubmit(s.claim, s.evidence).then(({ data, error: failure }) => {
      if (failure && left > 0) return send(left - 1);
      if (failure || data !== true) setError(failure ? "حفظ النتيجة ما تمش." : "التحدي لسه ما بدأش.");
      else window.dispatchEvent(new Event("event-result-saved"));
    }).catch(() => left > 0 ? send(left - 1) : setError("حفظ النتيجة ما تمش.")); };
    send(2);
  }, []);
  const onDone = useCallback(() => navigate("/event/offer", { replace: true }), [navigate]);
  return <Game onStart={() => void eventBegin()} onSubmit={onSubmit} onDone={onDone} endActions={error ? <p role="alert">{error}</p> : undefined} />;
}
