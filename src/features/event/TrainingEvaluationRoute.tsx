import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Game from "@/features/training-evaluation/Game";
import type { State } from "@/features/training-evaluation/engine";
import { eventBegin, eventCallEnded, eventJoin, eventSubmit } from "./eventApi";
import { useAuth } from "@/contexts/AuthContext";

/** Event wrapper: the server times each play from Start now; vouchers appear only after the admin announces results. */
export default function TrainingEvaluationRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [resultSaved, setResultSaved] = useState(false);
  useEffect(() => { void eventJoin(); }, []);
  const onSubmit = useCallback((s: State) => {
    setError("");
    const send = (left: number): void => { void eventSubmit(s.claim, s.evidence).then(({ data, error: failure }) => {
      if (failure && left > 0) return send(left - 1);
      if (failure || data !== true) setError(failure ? "حفظ النتيجة ما تمش." : "التحدي لسه ما بدأش.");
      else { setResultSaved(true); window.dispatchEvent(new Event("event-result-saved")); }
    }).catch(() => left > 0 ? send(left - 1) : setError("حفظ النتيجة ما تمش.")); };
    send(2);
  }, []);
  const onCallEnd = useCallback(() => { const go = (left: number): void => { void eventCallEnded().then(({ error: e }) => { if (e && left > 0) window.setTimeout(() => go(left - 1), 800); }); }; go(3); }, []);
  const onDone = useCallback(() => navigate("/event/offer", { replace: true }), [navigate]);
  if (!user) return null;
  return <Game userId={user.id} completionSaved={resultSaved} onStart={() => void eventBegin()} onSubmit={onSubmit} onCallEnd={onCallEnd} onDone={onDone} endActions={error ? <p role="alert">{error}</p> : undefined} />;
}
