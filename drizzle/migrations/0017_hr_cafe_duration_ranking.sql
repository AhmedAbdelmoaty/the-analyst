ALTER TABLE public.event_challenge ADD COLUMN IF NOT EXISTS results_revealed_at timestamptz;
ALTER TABLE public.event_players ADD COLUMN IF NOT EXISTS play_started_at timestamptz;
ALTER TABLE public.event_results ADD COLUMN IF NOT EXISTS duration_seconds int, ADD COLUMN IF NOT EXISTS voucher_downloaded_at timestamptz;

CREATE OR REPLACE FUNCTION public.event_begin() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT started_at INTO _s FROM event_challenge WHERE id = 1;
 IF _s IS NULL THEN RETURN; END IF;
 IF EXISTS (SELECT 1 FROM event_results WHERE user_id = auth.uid() AND challenge_started_at = _s) THEN RETURN; END IF;
 INSERT INTO event_players (user_id, challenge_started_at, play_started_at) VALUES (auth.uid(), _s, clock_timestamp())
 ON CONFLICT (user_id, challenge_started_at) DO UPDATE SET play_started_at = clock_timestamp();
END $$;

CREATE OR REPLACE FUNCTION public.event_submit(_claim text, _evidence text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s timestamptz; _p timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT started_at INTO _s FROM event_challenge WHERE id = 1;
 IF _s IS NULL THEN RETURN false; END IF;
 INSERT INTO event_players (user_id, challenge_started_at) VALUES (auth.uid(), _s) ON CONFLICT DO NOTHING;
 SELECT coalesce(play_started_at, joined_at) INTO _p FROM event_players WHERE user_id = auth.uid() AND challenge_started_at = _s;
 INSERT INTO event_results (user_id, challenge_started_at, claim, evidence, correct, duration_seconds)
 VALUES (auth.uid(), _s, left(_claim, 40), left(_evidence, 40), _claim = 'notRep' AND _evidence = 'respondents', greatest(0, extract(epoch FROM clock_timestamp() - _p))::int)
 ON CONFLICT (user_id, challenge_started_at) DO NOTHING;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.event_ranked() RETURNS TABLE(rank bigint, user_id uuid, full_name text, completed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT row_number() OVER (ORDER BY coalesce(r.duration_seconds, 2147483647), r.completed_at, r.id), r.user_id,
   trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), r.completed_at
 FROM event_results r JOIN event_challenge c ON c.id = 1 AND r.challenge_started_at = c.started_at
 LEFT JOIN profiles p ON p.user_id = r.user_id
 WHERE r.correct AND (c.results_revealed_at IS NULL OR r.completed_at <= c.results_revealed_at)
 ORDER BY coalesce(r.duration_seconds, 2147483647), r.completed_at, r.id
$$;
REVOKE EXECUTE ON FUNCTION public.event_ranked() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.event_public_state() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c event_challenge; _count int; _done int; _winners jsonb := '[]'::jsonb;
BEGIN
 SELECT * INTO c FROM event_challenge WHERE id = 1;
 SELECT count(*) INTO _count FROM event_players WHERE challenge_started_at = c.started_at;
 SELECT count(*) INTO _done FROM event_results WHERE challenge_started_at = c.started_at;
 IF c.results_revealed_at IS NOT NULL THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('rank', rank, 'name', full_name, 'discount', event_discount(rank)) ORDER BY rank), '[]'::jsonb) INTO _winners FROM event_ranked() WHERE rank <= 50;
 END IF;
 RETURN jsonb_build_object('started_at', c.started_at, 'revealed_at', c.results_revealed_at, 'reveal_step', CASE WHEN c.results_revealed_at IS NULL THEN 0 ELSE 4 END, 'revealed', c.results_revealed_at IS NOT NULL, 'count', _count, 'finished', _done, 'winners', _winners, 'now', clock_timestamp());
END $$;

CREATE OR REPLACE FUNCTION public.event_my_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c event_challenge; _r record; _sub boolean; _dl timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO c FROM event_challenge WHERE id = 1;
 SELECT true, voucher_downloaded_at INTO _sub, _dl FROM event_results WHERE user_id = auth.uid() AND challenge_started_at = c.started_at;
 _sub := coalesce(_sub, false);
 IF c.results_revealed_at IS NULL THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', false); END IF;
 SELECT * INTO _r FROM event_ranked() WHERE user_id = auth.uid();
 IF _r.rank IS NULL OR _r.rank > 50 OR _dl IS NOT NULL THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', true); END IF;
 RETURN jsonb_build_object('submitted', _sub, 'revealed', true, 'voucher', jsonb_build_object('name', _r.full_name, 'rank', _r.rank, 'discount', event_discount(_r.rank), 'code', 'IMP-HRC-2026'));
END $$;

CREATE OR REPLACE FUNCTION public.event_voucher_downloaded() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 UPDATE event_results r SET voucher_downloaded_at = coalesce(r.voucher_downloaded_at, clock_timestamp())
 FROM event_challenge c WHERE c.id = 1 AND r.challenge_started_at = c.started_at AND r.user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.event_admin_start() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 UPDATE event_challenge SET started_at = clock_timestamp(), reveal_step = 0, revealed = false, results_revealed_at = NULL, updated_at = now() WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.event_admin_announce() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 UPDATE event_challenge SET results_revealed_at = coalesce(results_revealed_at, clock_timestamp()), reveal_step = 4, revealed = true, updated_at = now() WHERE id = 1 AND started_at IS NOT NULL;
END $$;

REVOKE ALL ON FUNCTION public.event_begin(), public.event_voucher_downloaded(), public.event_admin_announce(), public.event_my_status(), public.event_submit(text, text), public.event_admin_start() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_begin(), public.event_voucher_downloaded(), public.event_admin_announce(), public.event_my_status(), public.event_submit(text, text), public.event_admin_start() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.event_public_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_public_state() TO anon, authenticated, service_role;