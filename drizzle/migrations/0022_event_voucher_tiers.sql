CREATE OR REPLACE FUNCTION public.event_discount(_rank bigint) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN _rank IS NULL OR _rank < 1 THEN 0 WHEN _rank <= 5 THEN (110 - _rank * 10)::int ELSE 50 END
$$;

CREATE OR REPLACE FUNCTION public.event_my_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c event_challenge; _r record; _sub boolean; _dl timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO c FROM event_challenge WHERE id = 1;
 SELECT true, voucher_downloaded_at INTO _sub, _dl FROM event_results WHERE user_id = auth.uid() AND challenge_started_at = c.started_at;
 _sub := coalesce(_sub, false);
 IF c.vouchers_released_at IS NULL THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', false); END IF;
 SELECT * INTO _r FROM event_ranked() WHERE user_id = auth.uid();
 IF _r.rank IS NULL THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', true); END IF;
 RETURN jsonb_build_object('submitted', _sub, 'revealed', true, 'downloaded', _dl IS NOT NULL, 'voucher', jsonb_build_object('name', _r.full_name, 'rank', _r.rank, 'discount', event_discount(_r.rank), 'code', 'IMP-HRC-2026'));
END $$;