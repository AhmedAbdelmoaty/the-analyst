ALTER TABLE public.event_challenge ADD COLUMN IF NOT EXISTS vouchers_released_at timestamptz;
ALTER TABLE public.event_results ADD COLUMN IF NOT EXISTS call_ended_at timestamptz;

CREATE OR REPLACE FUNCTION public.event_admin_start() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 UPDATE event_challenge SET started_at = clock_timestamp(), reveal_step = 0, revealed = false, results_revealed_at = NULL, vouchers_released_at = NULL, updated_at = now() WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.event_admin_release_vouchers() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 UPDATE event_challenge SET vouchers_released_at = coalesce(vouchers_released_at, clock_timestamp()), updated_at = now() WHERE id = 1 AND results_revealed_at IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.event_admin_release_vouchers() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.event_admin_release_vouchers() TO authenticated;

CREATE OR REPLACE FUNCTION public.event_submit(_claim text, _evidence text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _s timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT started_at INTO _s FROM event_challenge WHERE id = 1;
 IF _s IS NULL THEN RETURN false; END IF;
 INSERT INTO event_players (user_id, challenge_started_at) VALUES (auth.uid(), _s) ON CONFLICT DO NOTHING;
 INSERT INTO event_results (user_id, challenge_started_at, claim, evidence, correct)
 VALUES (auth.uid(), _s, left(_claim, 40), left(_evidence, 40), _claim = 'notRep' AND _evidence = 'respondents')
 ON CONFLICT (user_id, challenge_started_at) DO NOTHING;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.event_call_ended() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _s timestamptz; _p timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT started_at INTO _s FROM event_challenge WHERE id = 1;
 IF _s IS NULL THEN RETURN; END IF;
 SELECT coalesce(play_started_at, joined_at) INTO _p FROM event_players WHERE user_id = auth.uid() AND challenge_started_at = _s;
 UPDATE event_results SET call_ended_at = clock_timestamp(), completed_at = clock_timestamp(),
   duration_seconds = greatest(0, extract(epoch FROM clock_timestamp() - coalesce(_p, _s)))::int
 WHERE user_id = auth.uid() AND challenge_started_at = _s AND call_ended_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.event_call_ended() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.event_call_ended() TO authenticated;

CREATE OR REPLACE FUNCTION public.event_ranked() RETURNS TABLE(rank bigint, user_id uuid, full_name text, completed_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT row_number() OVER (ORDER BY r.duration_seconds, r.call_ended_at, r.id), r.user_id,
   trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), r.call_ended_at
 FROM event_results r JOIN event_challenge c ON c.id = 1 AND r.challenge_started_at = c.started_at
 LEFT JOIN profiles p ON p.user_id = r.user_id
 WHERE r.correct AND r.call_ended_at IS NOT NULL AND NOT has_role(r.user_id, 'admin')
   AND (c.results_revealed_at IS NULL OR r.call_ended_at <= c.results_revealed_at)
 ORDER BY r.duration_seconds, r.call_ended_at, r.id
$$;
REVOKE ALL ON FUNCTION public.event_ranked() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.event_public_state() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c event_challenge; _count int; _done int; _winners jsonb := '[]'::jsonb; _admin boolean := has_role(auth.uid(), 'admin');
BEGIN
 SELECT * INTO c FROM event_challenge WHERE id = 1;
 IF NOT _admin THEN RETURN jsonb_build_object('started_at', c.started_at, 'revealed', c.results_revealed_at IS NOT NULL, 'now', clock_timestamp()); END IF;
 SELECT count(*) INTO _count FROM event_players WHERE challenge_started_at = c.started_at AND NOT has_role(user_id, 'admin');
 SELECT count(*) INTO _done FROM event_results WHERE challenge_started_at = c.started_at AND call_ended_at IS NOT NULL AND NOT has_role(user_id, 'admin');
 IF c.results_revealed_at IS NOT NULL THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('rank', rank, 'name', full_name, 'discount', event_discount(rank)) ORDER BY rank), '[]'::jsonb) INTO _winners FROM event_ranked();
 END IF;
 RETURN jsonb_build_object('started_at', c.started_at, 'revealed_at', c.results_revealed_at, 'vouchers_released_at', c.vouchers_released_at, 'reveal_step', CASE WHEN c.results_revealed_at IS NULL THEN 0 ELSE 4 END, 'revealed', c.results_revealed_at IS NOT NULL, 'count', _count, 'finished', _done, 'winners', _winners, 'now', clock_timestamp());
END $$;

CREATE OR REPLACE FUNCTION public.event_my_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c event_challenge; _r record; _sub boolean; _dl timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO c FROM event_challenge WHERE id = 1;
 SELECT true, voucher_downloaded_at INTO _sub, _dl FROM event_results WHERE user_id = auth.uid() AND challenge_started_at = c.started_at;
 _sub := coalesce(_sub, false);
 IF c.vouchers_released_at IS NULL THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', false); END IF;
 SELECT * INTO _r FROM event_ranked() WHERE user_id = auth.uid();
 IF _r.rank IS NULL OR _r.rank > 50 THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', true); END IF;
 RETURN jsonb_build_object('submitted', _sub, 'revealed', true, 'downloaded', _dl IS NOT NULL, 'voucher', jsonb_build_object('name', _r.full_name, 'rank', _r.rank, 'discount', event_discount(_r.rank), 'code', 'IMP-HRC-2026'));
END $$;

DROP FUNCTION IF EXISTS public.event_admin_export();
CREATE FUNCTION public.event_admin_export() RETURNS TABLE(rank bigint, full_name text, phone text, email text, company_name text, department text, lead_status text, correct boolean, duration_seconds integer, finished_at timestamptz, joined_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 RETURN QUERY
 SELECT rk.rank, trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), p.phone, p.email, p.company_name,
   coalesce(nullif(p.department_other,''), p.department), p.lead_status, coalesce(r.correct, false),
   CASE WHEN r.call_ended_at IS NOT NULL THEN r.duration_seconds END, r.call_ended_at, ep.joined_at
 FROM event_players ep JOIN event_challenge c ON c.id = 1 AND ep.challenge_started_at = c.started_at
 LEFT JOIN event_results r ON r.user_id = ep.user_id AND r.challenge_started_at = c.started_at
 LEFT JOIN event_ranked() rk ON rk.user_id = ep.user_id
 LEFT JOIN profiles p ON p.user_id = ep.user_id
 WHERE NOT has_role(ep.user_id, 'admin')
 ORDER BY rk.rank NULLS LAST, r.call_ended_at NULLS LAST, ep.joined_at;
END $$;
REVOKE ALL ON FUNCTION public.event_admin_export() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.event_admin_export() TO authenticated;