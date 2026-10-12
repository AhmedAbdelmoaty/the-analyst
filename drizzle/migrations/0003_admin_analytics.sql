
-- ===== Tables =====
CREATE TABLE public.analytics_meta (key text PRIMARY KEY, value timestamptz NOT NULL);
GRANT ALL ON public.analytics_meta TO service_role;
ALTER TABLE public.analytics_meta ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.visit_segments (
  id uuid PRIMARY KEY,
  visit_id uuid NOT NULL,
  user_id uuid,
  secret_hash text,
  ip_hash text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 1
);
CREATE INDEX visit_segments_visit_idx ON public.visit_segments (visit_id);
CREATE INDEX visit_segments_user_idx ON public.visit_segments (user_id, last_seen_at);
CREATE INDEX visit_segments_time_idx ON public.visit_segments (started_at, last_seen_at);
CREATE INDEX visit_segments_ip_idx ON public.visit_segments (ip_hash, started_at);
GRANT ALL ON public.visit_segments TO service_role;
ALTER TABLE public.visit_segments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  game text NOT NULL,
  round_id text NOT NULL,
  content_version text,
  source text NOT NULL DEFAULT 'live',
  legacy_ref uuid UNIQUE,
  started_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_stage text,
  stage_revision bigint NOT NULL DEFAULT 0,
  active_ms bigint,
  submitted_at timestamptz,
  completed_at timestamptz,
  timed_out_at timestamptz,
  outcome text,
  server_outcome text,
  server_reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT game_rounds_user_game_round UNIQUE (user_id, game, round_id),
  CONSTRAINT game_rounds_active_ms_ok CHECK (active_ms IS NULL OR active_ms >= 0)
);
CREATE INDEX game_rounds_game_started_idx ON public.game_rounds (game, started_at);
CREATE INDEX game_rounds_completed_idx ON public.game_rounds (completed_at);
CREATE INDEX game_rounds_user_idx ON public.game_rounds (user_id);
CREATE INDEX game_rounds_activity_idx ON public.game_rounds (last_activity_at);
GRANT ALL ON public.game_rounds TO service_role;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.round_events (
  event_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  game text NOT NULL,
  round_id text NOT NULL,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX round_events_user_time_idx ON public.round_events (user_id, received_at);
CREATE INDEX round_events_time_idx ON public.round_events (received_at);
GRANT ALL ON public.round_events TO service_role;
ALTER TABLE public.round_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_flags (
  user_id uuid PRIMARY KEY,
  is_test boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT ALL ON public.account_flags TO service_role;
ALTER TABLE public.account_flags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_export_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  kind text NOT NULL,
  format text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_export_log TO service_role;
ALTER TABLE public.admin_export_log ENABLE ROW LEVEL SECURITY;

-- ===== Server-side evaluation (mirrors the in-game rules, read-only) =====
CREATE OR REPLACE FUNCTION public.pf_evaluate(_framing jsonb, _history text[], _track_entered boolean)
RETURNS TABLE(outcome text, correct_count integer, full_spine boolean)
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  WITH c AS (
    SELECT (CASE WHEN _framing->>'true_frame' = 'tf_misleading_baseline' THEN 1 ELSE 0 END
          + CASE WHEN _framing->>'next_decision' = 'nd_revalidate_baseline' THEN 1 ELSE 0 END) AS n,
           (NOT coalesce(_track_entered, true) AND coalesce(array_length(_history,1),0) >= 5
            AND NOT EXISTS (SELECT 1 FROM unnest(_history) h WHERE h <> 'correct')) AS spine
  )
  SELECT CASE WHEN spine AND n = 2 THEN 'strong' ELSE 'weak' END, n, spine FROM c
$$;

CREATE OR REPLACE FUNCTION public.rd_evaluate(_team text, _doc text, _args text[], _tools text[], _docs text[])
RETURNS TABLE(outcome text, reason text)
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE
  v1 boolean; v2 boolean; k1 text; k2 text; r text;
  FUNCTION_DUMMY int;
BEGIN
  SELECT a.ok, a.kind INTO v1, k1 FROM (SELECT * FROM public.rd_argument_check(_args[1], _tools, _docs)) a;
  SELECT a.ok, a.kind INTO v2, k2 FROM (SELECT * FROM public.rd_argument_check(_args[2], _tools, _docs)) a;
  v1 := coalesce(v1,false); v2 := coalesce(v2,false);
  IF _team IS DISTINCT FROM 'mahmoud' THEN r := 'wrong_team';
  ELSIF _doc IS DISTINCT FROM 'policy' THEN r := 'wrong_document';
  ELSIF NOT ((v1 AND k1 = 'performance') OR (v2 AND k2 = 'performance')) THEN
    r := CASE WHEN v1 AND v2 THEN 'missing_performance' ELSE 'weak_arguments' END;
  ELSIF NOT ((v1 AND k1 = 'spread') OR (v2 AND k2 = 'spread')) THEN
    r := CASE WHEN v1 AND v2 THEN 'missing_spread' ELSE 'weak_arguments' END;
  ELSE r := 'complete';
  END IF;
  RETURN QUERY SELECT CASE r WHEN 'complete' THEN 'supported' WHEN 'wrong_team' THEN 'criterion_mismatch' ELSE 'insufficient' END, r;
END $$;
