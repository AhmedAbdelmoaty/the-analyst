import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/** Return to the authenticated game catalog after synchronously saving/pausing the current game. */
export function useGamePlatformExit(beforeExit?: () => void) {
  const navigate = useNavigate();
  return useCallback(() => {
    beforeExit?.();
    navigate("/app");
  }, [beforeExit, navigate]);
}
