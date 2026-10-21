-- Reward Decision V2 (rowad-v3) server evaluation — FOR REVIEW ONLY. NOT APPLIED.
-- Requires separate explicit owner approval before applying to the shared database.
-- Additive: rd_evaluate and rd_argument_check are untouched; old rows are never recomputed.

CREATE OR REPLACE FUNCTION public.rd_evaluate_v3(_answers jsonb)
RETURNS TABLE(outcome text, reason text, score integer, awarded_team text)
LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  WITH s AS (
    SELECT (CASE WHEN _answers->>'center' = 'center_a' THEN 1 ELSE 0 END
          + CASE WHEN _answers->>'spread' = 'spread_c' THEN 1 ELSE 0 END) AS n
  )
  SELECT CASE WHEN n = 2 THEN 'supported' ELSE 'insufficient' END,
         CASE WHEN n = 2 THEN 'complete' ELSE 'deduction_' || n END,
         n,
         CASE WHEN n = 2 THEN 'mahmoud' ELSE 'marwan' END
  FROM s
$$;

-- track_round_event: replace ONLY the reward-decision submit branch with the block below
-- (the rest of the current definition stays byte-identical):
--
--    ELSIF p->>'caseVersion' = 'rowad-v3' THEN
--      SELECT * INTO rd FROM public.rd_evaluate_v3(p->'answers');
--      r.server_outcome := rd.outcome; r.server_reason := rd.reason;
--      r.details := r.details || jsonb_build_object('answers', p->'answers', 'score', rd.score,
--        'awardedTeam', rd.awarded_team, 'teamId', rd.awarded_team,
--        'usedTools', p->'usedTools', 'docs', p->'docs');
--    ELSE  -- unchanged legacy path
--      SELECT * INTO rd FROM public.rd_evaluate(p->>'teamId', ... );  (as today)
--
-- `teamId`, `usedTools`, `docs` are kept so admin_games / admin_activity_summary keep working unchanged.

-- ---------------- Validation (read-only) ----------------
-- 1. Before and after: counts must be identical.
--    SELECT server_outcome, count(*) FROM public.game_rounds WHERE game='reward-decision' GROUP BY 1;
-- 2. Parity with the client evaluator (tests/reward-decision-v2.test.ts "four combinations"):
--    SELECT * FROM public.rd_evaluate_v3('{"center":"center_a","spread":"spread_c"}');  -- supported,2,mahmoud
--    SELECT * FROM public.rd_evaluate_v3('{"center":"center_a","spread":"spread_d"}');  -- insufficient,1,marwan
--    SELECT * FROM public.rd_evaluate_v3('{"center":"center_b","spread":"spread_c"}');  -- insufficient,1,marwan
--    SELECT * FROM public.rd_evaluate_v3('{"center":"center_c","spread":"spread_a"}');  -- insufficient,0,marwan
-- 3. Only then set SERVER_V3_EVALUATION_ENABLED = true in src/features/reward-decision/engine/deduction.ts.
