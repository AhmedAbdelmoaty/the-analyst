
CREATE OR REPLACE FUNCTION public.rd_argument_check(_arg text, _tools text[], _docs text[])
RETURNS TABLE(ok boolean, kind text)
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  WITH a(id, kind, correct, tool, doc) AS (VALUES
    ('median-mahmoud','performance',true,'median',NULL),
    ('records-coverage','performance',true,NULL,'individual-records'),
    ('mean-marwan','weak',false,'mean',NULL),
    ('median-proves-all','weak',false,'median',NULL),
    ('range-mahmoud','spread',true,'range',NULL),
    ('sd-mahmoud','spread',true,'sd',NULL),
    ('iqr-mahmoud','spread',true,'iqr',NULL),
    ('spread-proves-level','weak',false,'sd',NULL),
    ('spread-predicts-future','weak',false,'range',NULL))
  SELECT (a.correct AND (a.tool IS NULL OR a.tool = ANY(coalesce(_tools,'{}'))) AND (a.doc IS NULL OR a.doc = ANY(coalesce(_docs,'{}')))), a.kind
  FROM a WHERE a.id = _arg
$$;

CREATE OR REPLACE FUNCTION public.rd_evaluate(_team text, _doc text, _args text[], _tools text[], _docs text[])
RETURNS TABLE(outcome text, reason text)
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE v1 boolean; v2 boolean; k1 text; k2 text; r text;
BEGIN
  SELECT c.ok, c.kind INTO v1, k1 FROM public.rd_argument_check(_args[1], _tools, _docs) c;
  SELECT c.ok, c.kind INTO v2, k2 FROM public.rd_argument_check(_args[2], _tools, _docs) c;
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

-- ===== Visit tracking =====
CREATE OR REPLACE FUNCTION public.track_visit(_visit_id uuid, _segment_id uuid, _secret text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); seg public.visit_segments%ROWTYPE; ip text; iph text; sh text;
BEGIN
  IF _visit_id IS NULL OR _segment_id IS NULL THEN RETURN false; END IF;
  sh := CASE WHEN _secret IS NULL THEN NULL ELSE encode(sha256(convert_to(_secret,'UTF8')),'hex') END;
  SELECT * INTO seg FROM public.visit_segments WHERE id = _segment_id FOR UPDATE;
  IF FOUND THEN
    IF seg.visit_id <> _visit_id THEN RETURN false; END IF;
    IF seg.user_id IS NOT NULL THEN
      IF uid IS DISTINCT FROM seg.user_id THEN RETURN false; END IF;
    ELSE
      IF uid IS NOT NULL OR sh IS NULL OR seg.secret_hash IS DISTINCT FROM sh THEN RETURN false; END IF;
    END IF;
    IF seg.last_seen_at > now() - interval '50 seconds' THEN RETURN true; END IF;
    UPDATE public.visit_segments SET last_seen_at = now(), hits = hits + 1 WHERE id = _segment_id;
    RETURN true;
  END IF;
  IF uid IS NULL THEN
    IF _secret IS NULL OR length(_secret) < 16 OR length(_secret) > 128 THEN RETURN false; END IF;
    ip := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1);
    iph := encode(sha256(convert_to(ip || ':ta-visit', 'UTF8')), 'hex');
    IF (SELECT count(*) FROM public.visit_segments WHERE ip_hash = iph AND started_at > now() - interval '1 minute') >= 20 THEN RETURN false; END IF;
  ELSE
    IF (SELECT count(*) FROM public.visit_segments WHERE user_id = uid AND started_at > now() - interval '1 minute') >= 20 THEN RETURN false; END IF;
    sh := NULL;
  END IF;
  INSERT INTO public.visit_segments (id, visit_id, user_id, secret_hash, ip_hash)
  VALUES (_segment_id, _visit_id, uid, sh, iph) ON CONFLICT (id) DO NOTHING;
  RETURN true;
END $$;

-- ===== Round tracking (idempotent, order-independent merge) =====
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
    r.started_at := CASE WHEN r.started_at IS NULL THEN now() ELSE least(r.started_at, now()) END;
    r.content_version := coalesce(r.content_version, left(p->>'version', 40));
  END IF;

  -- active play time: never decreases, never negative, never beyond elapsed wall time
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

  -- Leaderboard qualification follows the server evaluation, whichever arrives first.
  IF _game = 'problem-framing' AND r.server_outcome = 'strong' AND r.submitted_at IS NOT NULL AND r.timed_out_at IS NULL THEN
    UPDATE public.completed_players SET qualified = true
    WHERE user_id = uid AND round_id = _round_id AND qualified = false;
  END IF;
  RETURN 'ok';
END $$;

CREATE OR REPLACE FUNCTION public.set_completed_player_qualified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- The client never decides qualification; it comes from the server-side evaluation of the same round.
  NEW.qualified := EXISTS (
    SELECT 1 FROM public.game_rounds g
    WHERE g.user_id = NEW.user_id AND g.game = 'problem-framing' AND g.round_id = NEW.round_id
      AND g.server_outcome = 'strong' AND g.submitted_at IS NOT NULL AND g.timed_out_at IS NULL);
  RETURN NEW;
END $$;

-- ===== Legacy results (re-runnable, keeps original id and source) =====
CREATE OR REPLACE FUNCTION public.backfill_legacy_results()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.game_rounds (user_id, game, round_id, source, legacy_ref, completed_at, outcome, details, first_seen_at, last_activity_at, last_stage)
  SELECT c.user_id, 'problem-framing', coalesce(c.round_id, 'legacy-' || c.id::text), 'legacy', c.id, c.completed_at, c.outcome,
    jsonb_build_object('framing_correct', c.framing_correct, 'wall_duration_ms', c.duration_ms, 'reported_started_at', c.started_at, 'source_table', 'completed_players'),
    c.completed_at, c.completed_at, 'result'
  FROM public.completed_players c
  WHERE c.completed_at < coalesce((SELECT value FROM public.analytics_meta WHERE key = 'rounds_since'), now())
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ===== Admin helpers =====
CREATE OR REPLACE FUNCTION public.analytics_excluded(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _uid IS NOT NULL AND (public.has_role(_uid, 'admin') OR EXISTS (SELECT 1 FROM public.account_flags f WHERE f.user_id = _uid AND f.is_test))
$$;

CREATE OR REPLACE FUNCTION public.analytics_round_matches(r public.game_rounds, _game text, _status text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT (_game IS NULL OR r.game = _game) AND (
    _status IS NULL
    OR (_status = 'incomplete' AND r.completed_at IS NULL AND r.timed_out_at IS NULL)
    OR (_status = 'submitted' AND r.submitted_at IS NOT NULL)
    OR (_status = 'completed' AND r.completed_at IS NOT NULL)
    OR (_status = 'timed_out' AND r.timed_out_at IS NOT NULL)
    OR (_status LIKE 'o:%' AND r.outcome = substr(_status, 3))
    OR (_status LIKE 's:%' AND r.server_outcome = substr(_status, 3)))
$$;

CREATE OR REPLACE FUNCTION public.admin_overview(_from date, _to date, _game text DEFAULT NULL, _status text DEFAULT NULL, _include boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f timestamptz; t timestamptz; res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  f := (_from::timestamp AT TIME ZONE 'Africa/Cairo'); t := ((_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo');
  WITH u AS (
    SELECT au.id, au.created_at, (au.phone_confirmed_at IS NOT NULL OR au.email_confirmed_at IS NOT NULL) AS confirmed
    FROM auth.users au WHERE _include OR NOT public.analytics_excluded(au.id)
  ), seg AS (
    SELECT s.* FROM public.visit_segments s
    WHERE s.started_at < t AND s.last_seen_at >= f AND (_include OR s.user_id IS NULL OR NOT public.analytics_excluded(s.user_id))
  ), rr AS (
    SELECT g.* FROM public.game_rounds g
    WHERE public.analytics_round_matches(g, _game, _status) AND (_include OR g.user_id IS NULL OR NOT public.analytics_excluded(g.user_id))
  ), ev AS (
    SELECT e.user_id, e.received_at FROM public.round_events e
    WHERE e.received_at >= f AND e.received_at < t AND (_game IS NULL OR e.game = _game)
      AND (_include OR NOT public.analytics_excluded(e.user_id))
  ), started AS (SELECT * FROM rr WHERE started_at >= f AND started_at < t),
  days AS (SELECT d::date AS day FROM generate_series(_from, _to, interval '1 day') d)
  SELECT jsonb_build_object(
    'accounts_total', (SELECT count(*) FROM u),
    'accounts_confirmed', (SELECT count(*) FROM u WHERE confirmed),
    'accounts_unconfirmed', (SELECT count(*) FROM u WHERE NOT confirmed),
    'accounts_new', (SELECT count(*) FROM u WHERE created_at >= f AND created_at < t),
    'active_users', (SELECT count(DISTINCT x) FROM (SELECT user_id x FROM seg WHERE user_id IS NOT NULL AND _game IS NULL UNION SELECT user_id FROM ev) z),
    'game_players', CASE WHEN _game IS NULL THEN NULL ELSE (SELECT count(DISTINCT user_id) FROM rr WHERE user_id IS NOT NULL AND ((started_at >= f AND started_at < t) OR (last_activity_at >= f AND last_activity_at < t))) END,
    'visits', (SELECT count(DISTINCT visit_id) FROM seg),
    'visits_signed_in', (SELECT count(DISTINCT visit_id) FROM seg WHERE user_id IS NOT NULL),
    'rounds_started', (SELECT count(*) FROM started),
    'rounds_started_completed', (SELECT count(*) FROM started WHERE completed_at IS NOT NULL),
    'rounds_completed', (SELECT count(*) FROM rr WHERE completed_at >= f AND completed_at < t),
    'rounds_timed_out', (SELECT count(*) FROM rr WHERE timed_out_at >= f AND timed_out_at < t),
    'tracking_since', (SELECT jsonb_object_agg(key, value) FROM public.analytics_meta),
    'daily', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'new_accounts', (SELECT count(*) FROM u WHERE (created_at AT TIME ZONE 'Africa/Cairo')::date = d.day),
        'active_users', (SELECT count(DISTINCT x) FROM (
            SELECT user_id x FROM seg WHERE user_id IS NOT NULL AND _game IS NULL
              AND (started_at AT TIME ZONE 'Africa/Cairo')::date <= d.day AND (last_seen_at AT TIME ZONE 'Africa/Cairo')::date >= d.day
            UNION SELECT user_id FROM ev WHERE (received_at AT TIME ZONE 'Africa/Cairo')::date = d.day) z),
        'visits', (SELECT count(DISTINCT visit_id) FROM seg WHERE (started_at AT TIME ZONE 'Africa/Cairo')::date <= d.day AND (last_seen_at AT TIME ZONE 'Africa/Cairo')::date >= d.day),
        'starts', (SELECT count(*) FROM started WHERE (started_at AT TIME ZONE 'Africa/Cairo')::date = d.day),
        'completions', (SELECT count(*) FROM rr WHERE (completed_at AT TIME ZONE 'Africa/Cairo')::date = d.day)
      ) ORDER BY d.day), '[]'::jsonb) FROM days d),
    'games', (SELECT coalesce(jsonb_agg(jsonb_build_object('game', gg.game,
        'players', (SELECT count(DISTINCT user_id) FROM started s WHERE s.game = gg.game),
        'starts', (SELECT count(*) FROM started s WHERE s.game = gg.game),
        'started_completed', (SELECT count(*) FROM started s WHERE s.game = gg.game AND s.completed_at IS NOT NULL),
        'completions', (SELECT count(*) FROM rr WHERE rr.game = gg.game AND completed_at >= f AND completed_at < t),
        'outcomes', (SELECT coalesce(jsonb_object_agg(o, n), '{}'::jsonb) FROM (SELECT coalesce(outcome,'unknown') o, count(*) n FROM rr WHERE rr.game = gg.game AND completed_at >= f AND completed_at < t GROUP BY 1) q),
        'stuck_stages', (SELECT coalesce(jsonb_object_agg(st, n), '{}'::jsonb) FROM (SELECT coalesce(last_stage,'unknown') st, count(*) n FROM started s WHERE s.game = gg.game AND s.completed_at IS NULL AND s.timed_out_at IS NULL GROUP BY 1) q)
      )), '[]'::jsonb) FROM (SELECT unnest(ARRAY['problem-framing','reward-decision']) game) gg WHERE _game IS NULL OR gg.game = _game)
  ) INTO res;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.admin_users(_from date, _to date, _game text DEFAULT NULL, _status text DEFAULT NULL, _include boolean DEFAULT false,
  _search text DEFAULT NULL, _sort text DEFAULT 'created_at', _dir text DEFAULT 'desc', _limit integer DEFAULT 25, _offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f timestamptz; t timestamptz; res jsonb; q text := nullif(trim(coalesce(_search,'')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _sort NOT IN ('name','created_at','last_activity','visits','attempts','completed') THEN _sort := 'created_at'; END IF;
  f := (_from::timestamp AT TIME ZONE 'Africa/Cairo'); t := ((_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo');
  WITH base AS (
    SELECT au.id AS user_id, p.first_name, p.last_name, p.phone, au.created_at,
      (au.phone_confirmed_at IS NOT NULL OR au.email_confirmed_at IS NOT NULL) AS confirmed,
      coalesce(fl.is_test, false) AS is_test, public.has_role(au.id, 'admin') AS is_admin,
      greatest((SELECT max(last_seen_at) FROM public.visit_segments s WHERE s.user_id = au.id),
               (SELECT max(last_activity_at) FROM public.game_rounds g WHERE g.user_id = au.id)) AS last_activity,
      (SELECT count(DISTINCT visit_id) FROM public.visit_segments s WHERE s.user_id = au.id AND s.started_at < t AND s.last_seen_at >= f) AS visits,
      (SELECT count(*) FROM public.game_rounds g WHERE g.user_id = au.id AND g.started_at >= f AND g.started_at < t AND public.analytics_round_matches(g, _game, _status)) AS attempts,
      (SELECT count(*) FROM public.game_rounds g WHERE g.user_id = au.id AND g.completed_at >= f AND g.completed_at < t AND public.analytics_round_matches(g, _game, _status)) AS completed
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    LEFT JOIN public.account_flags fl ON fl.user_id = au.id
    WHERE (_include OR NOT public.analytics_excluded(au.id))
      AND (q IS NULL OR concat_ws(' ', p.first_name, p.last_name) ILIKE '%' || q || '%' OR p.phone LIKE '%' || q || '%' OR au.email ILIKE '%' || q || '%')
  ), sorted AS (
    SELECT * FROM base ORDER BY
      CASE WHEN _dir = 'asc' THEN CASE _sort WHEN 'name' THEN concat_ws(' ', first_name, last_name) END END ASC NULLS LAST,
      CASE WHEN _dir <> 'asc' THEN CASE _sort WHEN 'name' THEN concat_ws(' ', first_name, last_name) END END DESC NULLS LAST,
      CASE WHEN _dir = 'asc' THEN CASE _sort WHEN 'created_at' THEN created_at WHEN 'last_activity' THEN last_activity END END ASC NULLS LAST,
      CASE WHEN _dir <> 'asc' THEN CASE _sort WHEN 'created_at' THEN created_at WHEN 'last_activity' THEN last_activity END END DESC NULLS LAST,
      CASE WHEN _dir = 'asc' THEN CASE _sort WHEN 'visits' THEN visits WHEN 'attempts' THEN attempts WHEN 'completed' THEN completed END END ASC NULLS LAST,
      CASE WHEN _dir <> 'asc' THEN CASE _sort WHEN 'visits' THEN visits WHEN 'attempts' THEN attempts WHEN 'completed' THEN completed END END DESC NULLS LAST,
      user_id
  )
  SELECT jsonb_build_object('total', (SELECT count(*) FROM base),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM (SELECT * FROM sorted LIMIT least(greatest(_limit,1), 100000) OFFSET greatest(_offset,0)) s), '[]'::jsonb))
  INTO res;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.admin_user_detail(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'user_id', au.id, 'first_name', p.first_name, 'last_name', p.last_name, 'phone', p.phone, 'gender_choice', p.gender,
    'created_at', au.created_at, 'confirmed', (au.phone_confirmed_at IS NOT NULL OR au.email_confirmed_at IS NOT NULL),
    'is_test', coalesce(fl.is_test, false), 'is_admin', public.has_role(au.id, 'admin'),
    'visits_total', (SELECT count(DISTINCT visit_id) FROM public.visit_segments s WHERE s.user_id = au.id),
    'first_visit', (SELECT min(started_at) FROM public.visit_segments s WHERE s.user_id = au.id),
    'last_visit', (SELECT max(last_seen_at) FROM public.visit_segments s WHERE s.user_id = au.id),
    'rounds', coalesce((SELECT jsonb_agg(jsonb_build_object('game', g.game, 'round_id', g.round_id, 'source', g.source,
        'content_version', g.content_version, 'started_at', g.started_at, 'first_seen_at', g.first_seen_at, 'last_activity_at', g.last_activity_at,
        'last_stage', g.last_stage, 'active_ms', g.active_ms, 'submitted_at', g.submitted_at, 'completed_at', g.completed_at,
        'timed_out_at', g.timed_out_at, 'outcome', g.outcome, 'server_outcome', g.server_outcome, 'server_reason', g.server_reason, 'details', g.details)
        ORDER BY coalesce(g.started_at, g.completed_at, g.first_seen_at)) FROM public.game_rounds g WHERE g.user_id = au.id), '[]'::jsonb)
  ) INTO res
  FROM auth.users au LEFT JOIN public.profiles p ON p.user_id = au.id LEFT JOIN public.account_flags fl ON fl.user_id = au.id
  WHERE au.id = _user_id;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.admin_games(_from date, _to date, _status text DEFAULT NULL, _include boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f timestamptz; t timestamptz; res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  f := (_from::timestamp AT TIME ZONE 'Africa/Cairo'); t := ((_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo');
  WITH rr AS (
    SELECT g.* FROM public.game_rounds g
    WHERE public.analytics_round_matches(g, NULL, _status) AND (_include OR g.user_id IS NULL OR NOT public.analytics_excluded(g.user_id))
  ), started AS (SELECT * FROM rr WHERE started_at >= f AND started_at < t),
  done AS (SELECT * FROM rr WHERE completed_at >= f AND completed_at < t),
  ranked AS (
    SELECT user_id, game, content_version, completed_at,
      CASE coalesce(server_outcome, outcome) WHEN 'strong' THEN 2 WHEN 'weak' THEN 1 WHEN 'supported' THEN 3 WHEN 'insufficient' THEN 2 WHEN 'criterion_mismatch' THEN 1 END AS rank
    FROM done WHERE user_id IS NOT NULL AND source = 'live'
  ), firstlast AS (
    SELECT game, user_id, content_version,
      (array_agg(rank ORDER BY completed_at))[1] AS first_rank, (array_agg(rank ORDER BY completed_at DESC))[1] AS last_rank, count(*) n
    FROM ranked GROUP BY game, user_id, content_version HAVING count(*) >= 2
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'game', gg.game,
    'players', (SELECT count(DISTINCT user_id) FROM started s WHERE s.game = gg.game),
    'attempts', (SELECT count(*) FROM started s WHERE s.game = gg.game),
    'started_completed', (SELECT count(*) FROM started s WHERE s.game = gg.game AND s.completed_at IS NOT NULL),
    'completed', (SELECT count(*) FROM done d WHERE d.game = gg.game),
    'completed_legacy', (SELECT count(*) FROM done d WHERE d.game = gg.game AND d.source = 'legacy'),
    'timed_out', (SELECT count(*) FROM rr WHERE rr.game = gg.game AND timed_out_at >= f AND timed_out_at < t),
    'replayers', (SELECT count(*) FROM (SELECT user_id FROM started s WHERE s.game = gg.game AND user_id IS NOT NULL GROUP BY user_id HAVING count(*) >= 2) q),
    'outcomes', (SELECT coalesce(jsonb_object_agg(o, n), '{}'::jsonb) FROM (SELECT coalesce(outcome,'unknown') o, count(*) n FROM done d WHERE d.game = gg.game GROUP BY 1) q),
    'server_outcomes', (SELECT coalesce(jsonb_object_agg(o, n), '{}'::jsonb) FROM (SELECT server_outcome o, count(*) n FROM done d WHERE d.game = gg.game AND server_outcome IS NOT NULL GROUP BY 1) q),
    'active_ms_avg', (SELECT round(avg(active_ms)) FROM done d WHERE d.game = gg.game AND d.started_at IS NOT NULL AND d.active_ms IS NOT NULL),
    'active_ms_median', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY active_ms) FROM done d WHERE d.game = gg.game AND d.started_at IS NOT NULL AND d.active_ms IS NOT NULL),
    'timed_rounds', (SELECT count(*) FROM done d WHERE d.game = gg.game AND d.started_at IS NOT NULL AND d.active_ms IS NOT NULL),
    'stuck_stages', (SELECT coalesce(jsonb_object_agg(st, n), '{}'::jsonb) FROM (SELECT coalesce(last_stage,'unknown') st, count(*) n FROM started s WHERE s.game = gg.game AND s.completed_at IS NULL AND s.timed_out_at IS NULL GROUP BY 1) q),
    'improvement', (SELECT jsonb_build_object('players', count(*), 'improved', count(*) FILTER (WHERE last_rank > first_rank),
        'same', count(*) FILTER (WHERE last_rank = first_rank), 'worse', count(*) FILTER (WHERE last_rank < first_rank)) FROM firstlast fl WHERE fl.game = gg.game),
    'extra', CASE gg.game
      WHEN 'reward-decision' THEN jsonb_build_object(
        'teams', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT details->>'teamId' k, count(*) n FROM rr WHERE rr.game = gg.game AND submitted_at >= f AND submitted_at < t AND details ? 'teamId' GROUP BY 1) q),
        'tools', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT tl k, count(*) n FROM rr, jsonb_array_elements_text(coalesce(rr.details->'usedTools','[]'::jsonb)) tl WHERE rr.game = gg.game AND submitted_at >= f AND submitted_at < t GROUP BY 1) q),
        'reasons', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT server_reason k, count(*) n FROM rr WHERE rr.game = gg.game AND submitted_at >= f AND submitted_at < t AND server_reason IS NOT NULL GROUP BY 1) q))
      ELSE jsonb_build_object(
        'framing_correct', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT coalesce(details->>'correct_count', details->>'framing_correct') k, count(*) n FROM rr WHERE rr.game = gg.game AND ((submitted_at >= f AND submitted_at < t) OR (source = 'legacy' AND completed_at >= f AND completed_at < t)) AND coalesce(details->>'correct_count', details->>'framing_correct') IS NOT NULL GROUP BY 1) q))
    END
  )), '[]'::jsonb) INTO res
  FROM (SELECT unnest(ARRAY['problem-framing','reward-decision']) game) gg;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.admin_export_rounds(_from date, _to date, _game text DEFAULT NULL, _status text DEFAULT NULL, _include boolean DEFAULT false)
RETURNS TABLE(game text, source text, first_name text, last_name text, phone text, round_id text, content_version text, started_at timestamptz,
  submitted_at timestamptz, completed_at timestamptz, timed_out_at timestamptz, last_stage text, last_activity_at timestamptz,
  active_ms bigint, outcome text, server_outcome text, server_reason text, details jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f timestamptz; t timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  f := (_from::timestamp AT TIME ZONE 'Africa/Cairo'); t := ((_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo');
  RETURN QUERY SELECT g.game, g.source, p.first_name, p.last_name, p.phone, g.round_id, g.content_version, g.started_at, g.submitted_at,
    g.completed_at, g.timed_out_at, g.last_stage, g.last_activity_at, g.active_ms, g.outcome, g.server_outcome, g.server_reason, g.details
  FROM public.game_rounds g LEFT JOIN public.profiles p ON p.user_id = g.user_id
  WHERE public.analytics_round_matches(g, _game, _status)
    AND (_include OR g.user_id IS NULL OR NOT public.analytics_excluded(g.user_id))
    AND ((g.started_at >= f AND g.started_at < t) OR (g.completed_at >= f AND g.completed_at < t) OR (g.timed_out_at >= f AND g.timed_out_at < t))
  ORDER BY coalesce(g.started_at, g.completed_at);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_test_flag(_user_id uuid, _is_test boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.account_flags (user_id, is_test, updated_at, updated_by) VALUES (_user_id, _is_test, now(), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET is_test = EXCLUDED.is_test, updated_at = now(), updated_by = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.admin_log_export(_kind text, _format text, _filters jsonb, _rows integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.admin_export_log (admin_id, kind, format, filters, row_count)
  VALUES (auth.uid(), left(_kind, 40), left(_format, 10), coalesce(_filters, '{}'::jsonb) - 'search', _rows);
END $$;

-- ===== Execute grants =====
REVOKE ALL ON FUNCTION public.track_visit(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_visit(uuid, uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.track_round_event(uuid, text, text, text, bigint, text, bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_round_event(uuid, text, text, text, bigint, text, bigint, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.backfill_legacy_results() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_excluded(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_excluded(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_overview(date, date, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview(date, date, text, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_users(date, date, text, text, boolean, text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_users(date, date, text, text, boolean, text, text, text, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_user_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_detail(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_games(date, date, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_games(date, date, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_export_rounds(date, date, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_rounds(date, date, text, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_test_flag(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_test_flag(uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_log_export(text, text, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_log_export(text, text, jsonb, integer) TO authenticated;
