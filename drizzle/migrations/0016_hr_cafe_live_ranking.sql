CREATE OR REPLACE FUNCTION public.event_public_state() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c event_challenge; _count int; _winners jsonb;
BEGIN
 SELECT * INTO c FROM event_challenge WHERE id = 1;
 SELECT count(*) INTO _count FROM event_players WHERE challenge_started_at = c.started_at;
 SELECT coalesce(jsonb_agg(jsonb_build_object('rank', rank, 'name', full_name, 'discount', event_discount(rank)) ORDER BY rank), '[]'::jsonb) INTO _winners FROM event_ranked() WHERE rank <= 50;
 RETURN jsonb_build_object('started_at', c.started_at, 'reveal_step', CASE WHEN c.started_at IS NULL THEN 0 ELSE 4 END, 'revealed', c.started_at IS NOT NULL, 'count', _count, 'winners', _winners);
END $$;
CREATE OR REPLACE FUNCTION public.event_my_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c event_challenge; _r record; _sub boolean;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO c FROM event_challenge WHERE id = 1;
 SELECT EXISTS(SELECT 1 FROM event_results WHERE user_id = auth.uid() AND challenge_started_at = c.started_at) INTO _sub;
 SELECT * INTO _r FROM event_ranked() WHERE user_id = auth.uid();
 IF _r.rank IS NULL OR _r.rank > 50 THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', c.started_at IS NOT NULL); END IF;
 RETURN jsonb_build_object('submitted', _sub, 'revealed', true, 'voucher', jsonb_build_object('name', _r.full_name, 'rank', _r.rank, 'discount', event_discount(_r.rank), 'code', 'IMP-HRC-2026'));
END $$;
CREATE OR REPLACE FUNCTION public.event_submit(_claim text, _evidence text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT started_at INTO _s FROM event_challenge WHERE id = 1;
 IF _s IS NULL THEN RETURN false; END IF;
 INSERT INTO event_players (user_id, challenge_started_at) VALUES (auth.uid(), _s) ON CONFLICT DO NOTHING;
 INSERT INTO event_results (user_id, challenge_started_at, claim, evidence, correct) VALUES (auth.uid(), _s, left(_claim, 40), left(_evidence, 40), _claim = 'notRep' AND _evidence = 'respondents') ON CONFLICT (user_id, challenge_started_at) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.event_public_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_public_state() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.event_my_status(), public.event_submit(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_my_status(), public.event_submit(text, text) TO authenticated, service_role;