CREATE OR REPLACE FUNCTION public.track_round_event(
  _event_id uuid, _game text, _round_id text, _type text,
  _revision bigint DEFAULT 0, _stage text DEFAULT NULL, _active_ms bigint DEFAULT NULL, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); r public.game_rounds%ROWTYPE; cap bigint; act bigint;
  pf record; rd record; p jsonb := coalesce(_payload, '{}'::jsonb);
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required' USING ERRCODE = '42501'; END IF;
  IF _event_id IS NULL OR _game NOT IN ('problem-framing','reward-decision')
     OR _type NOT IN ('start','stage','submit','complete','timeout')
     OR _round_id IS NULL OR length(_round_id) NOT BETWEEN 1 AND 80
     OR (_stage IS NOT NULL AND length(_stage) > 60)
     OR length(p::text) > 4000 THEN
    RAISE EXCEPTION 'invalid event' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.round_events (event_id, user_id, game, round_id, type)
  VALUES (_event_id, uid, _game, _round_id, _type) ON CONFLICT (event_id) DO NOTHING;
  IF NOT FOUND THEN RETURN 'duplicate'; END IF;

  INSERT INTO public.game_rounds (user_id, game, round_id) VALUES (uid, _game, _round_id)
  ON CONFLICT (user_id, game, round_id) DO NOTHING;
  SELECT * INTO r FROM public.game_rounds WHERE user_id = uid AND game = _game AND round_id = _round_id FOR UPDATE;

  IF _type = 'start' THEN
    -- A late-arriving start never lands after events already received for the round.
    r.started_at := least(coalesce(r.started_at, now()), r.first_seen_at, now());
    r.content_version := coalesce(r.content_version, left(p->>'version', 40));
  END IF;

  IF _active_ms IS NOT NULL AND _active_ms >= 0 THEN
    act := _active_ms;
    IF r.started_at IS NOT NULL THEN
      cap := (extract(epoch FROM (now() - r.started_at)) * 1000)::bigint + 5000;
      act := least(act, cap);
    END IF;
    act := least(act, 86400000);
    r.active_ms := greatest(coalesce(r.active_ms, 0), act);
  END IF;

  IF _stage IS NOT NULL AND _revision > r.stage_revision
     AND (r.completed_at IS NULL AND r.timed_out_at IS NULL OR _type IN ('complete','timeout')) THEN
    r.last_stage := _stage; r.stage_revision := _revision;
  END IF;

  IF _type = 'submit' AND r.submitted_at IS NULL AND r.timed_out_at IS NULL THEN
    r.submitted_at := now();
    IF _game = 'problem-framing' THEN
      SELECT * INTO pf FROM public.pf_evaluate(p->'framing',
        ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'history','[]'::jsonb))),
        coalesce((p->>'trackEntered')::boolean, true));
      r.server_outcome := pf.outcome;
      r.details := r.details || jsonb_build_object('framing', p->'framing', 'correct_count', pf.correct_count, 'full_spine', pf.full_spine);
    ELSE
      SELECT * INTO rd FROM public.rd_evaluate(p->>'teamId', p->>'documentId',
        ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'arguments','[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'usedTools','[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'docs','[]'::jsonb))));
      r.server_outcome := rd.outcome; r.server_reason := rd.reason;
      r.details := r.details || jsonb_build_object('teamId', p->>'teamId', 'documentId', p->>'documentId',
        'arguments', p->'arguments', 'usedTools', p->'usedTools', 'docs', p->'docs');
    END IF;
  END IF;

  IF _type = 'complete' AND r.completed_at IS NULL AND r.timed_out_at IS NULL THEN
    r.completed_at := now();
    r.outcome := left(p->>'outcome', 40);
  END IF;

  IF _type = 'timeout' AND r.timed_out_at IS NULL AND r.completed_at IS NULL AND r.submitted_at IS NULL THEN
    r.timed_out_at := now();
  END IF;

  r.last_activity_at := greatest(r.last_activity_at, now());
  UPDATE public.game_rounds SET started_at = r.started_at, content_version = r.content_version, active_ms = r.active_ms,
    last_stage = r.last_stage, stage_revision = r.stage_revision, submitted_at = r.submitted_at, completed_at = r.completed_at,
    timed_out_at = r.timed_out_at, outcome = r.outcome, server_outcome = r.server_outcome, server_reason = r.server_reason,
    details = r.details, last_activity_at = r.last_activity_at
  WHERE id = r.id;

  IF _game = 'problem-framing' AND r.server_outcome = 'strong' AND r.submitted_at IS NOT NULL AND r.timed_out_at IS NULL THEN
    UPDATE public.completed_players SET qualified = true
    WHERE user_id = uid AND round_id = _round_id AND qualified = false;
  END IF;
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.track_round_event(uuid, text, text, text, bigint, text, bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_round_event(uuid, text, text, text, bigint, text, bigint, jsonb) TO authenticated;