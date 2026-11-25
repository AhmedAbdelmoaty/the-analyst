ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text, ADD COLUMN IF NOT EXISTS lead_status text, ADD COLUMN IF NOT EXISTS lead_at timestamptz;

CREATE TABLE public.event_challenge (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  started_at timestamptz,
  reveal_step int NOT NULL DEFAULT 0,
  revealed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.event_challenge (id) VALUES (1);
GRANT SELECT ON public.event_challenge TO anon, authenticated;
GRANT ALL ON public.event_challenge TO service_role;
ALTER TABLE public.event_challenge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads challenge status" ON public.event_challenge FOR SELECT TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_challenge;

CREATE TABLE public.event_players (
  user_id uuid NOT NULL,
  challenge_started_at timestamptz NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_started_at)
);
GRANT ALL ON public.event_players TO service_role;
ALTER TABLE public.event_players ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.event_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  claim text,
  evidence text,
  correct boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, challenge_started_at)
);
GRANT ALL ON public.event_results TO service_role;
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;
CREATE INDEX event_results_rank_idx ON public.event_results (challenge_started_at, correct, completed_at);

CREATE OR REPLACE FUNCTION public.event_join() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT started_at INTO _s FROM event_challenge WHERE id = 1;
  IF _s IS NULL THEN RETURN; END IF;
  INSERT INTO event_players (user_id, challenge_started_at) VALUES (auth.uid(), _s) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.event_submit(_claim text, _evidence text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s timestamptz; _rev boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT started_at, revealed INTO _s, _rev FROM event_challenge WHERE id = 1;
  IF _s IS NULL OR _rev THEN RETURN false; END IF;
  INSERT INTO event_players (user_id, challenge_started_at) VALUES (auth.uid(), _s) ON CONFLICT DO NOTHING;
  INSERT INTO event_results (user_id, challenge_started_at, claim, evidence, correct)
  VALUES (auth.uid(), _s, left(_claim, 40), left(_evidence, 40), _claim = 'notRep' AND _evidence = 'respondents')
  ON CONFLICT (user_id, challenge_started_at) DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.event_discount(_rank bigint) RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _rank = 1 THEN 100 WHEN _rank = 2 THEN 75 WHEN _rank = 3 THEN 50 WHEN _rank <= 50 THEN 25 ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.event_ranked() RETURNS TABLE(rank bigint, user_id uuid, full_name text, completed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT row_number() OVER (ORDER BY r.completed_at, r.id), r.user_id,
    trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), r.completed_at
  FROM event_results r JOIN event_challenge c ON c.id = 1 AND r.challenge_started_at = c.started_at
  LEFT JOIN profiles p ON p.user_id = r.user_id
  WHERE r.correct
  ORDER BY r.completed_at, r.id
$$;
REVOKE EXECUTE ON FUNCTION public.event_ranked() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.event_public_state() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c event_challenge; _count int; _winners jsonb;
BEGIN
  SELECT * INTO c FROM event_challenge WHERE id = 1;
  SELECT count(*) INTO _count FROM event_players WHERE challenge_started_at = c.started_at;
  SELECT coalesce(jsonb_agg(jsonb_build_object('rank', rank, 'name', full_name, 'discount', event_discount(rank)) ORDER BY rank), '[]'::jsonb)
  INTO _winners FROM event_ranked()
  WHERE rank <= 50 AND (has_role(auth.uid(), 'admin') OR (c.reveal_step >= 1 AND rank = 3) OR (c.reveal_step >= 2 AND rank = 2) OR (c.reveal_step >= 3 AND rank = 1) OR c.reveal_step >= 4);
  RETURN jsonb_build_object('started_at', c.started_at, 'reveal_step', c.reveal_step, 'revealed', c.revealed, 'count', _count, 'winners', _winners);
END $$;

CREATE OR REPLACE FUNCTION public.event_my_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c event_challenge; _r record; _sub boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO c FROM event_challenge WHERE id = 1;
  SELECT EXISTS(SELECT 1 FROM event_results WHERE user_id = auth.uid() AND challenge_started_at = c.started_at) INTO _sub;
  IF NOT c.revealed THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', false); END IF;
  SELECT * INTO _r FROM event_ranked() WHERE user_id = auth.uid();
  IF _r.rank IS NULL OR _r.rank > 50 THEN RETURN jsonb_build_object('submitted', _sub, 'revealed', true); END IF;
  RETURN jsonb_build_object('submitted', _sub, 'revealed', true, 'voucher', jsonb_build_object('name', _r.full_name, 'rank', _r.rank, 'discount', event_discount(_r.rank), 'code', 'IMP-HRC-2026'));
END $$;

CREATE OR REPLACE FUNCTION public.event_admin_start() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE event_challenge SET started_at = clock_timestamp(), reveal_step = 0, revealed = false, updated_at = now() WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.event_admin_reveal(_step int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE event_challenge SET reveal_step = greatest(0, least(_step, 4)), revealed = _step >= 3, updated_at = now() WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.event_admin_export() RETURNS TABLE(rank bigint, full_name text, phone text, company_name text, department text, industry text, interested boolean, correct boolean, completed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT rk.rank, trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), p.phone, p.company_name,
    coalesce(nullif(p.department_other,''), p.department), coalesce(nullif(p.industry_other,''), p.industry),
    p.lead_status = 'high_intent', coalesce(r.correct, false), r.completed_at
  FROM event_players ep JOIN event_challenge c ON c.id = 1 AND ep.challenge_started_at = c.started_at
  LEFT JOIN event_results r ON r.user_id = ep.user_id AND r.challenge_started_at = c.started_at
  LEFT JOIN event_ranked() rk ON rk.user_id = ep.user_id
  LEFT JOIN profiles p ON p.user_id = ep.user_id
  ORDER BY rk.rank NULLS LAST, r.completed_at NULLS LAST, ep.joined_at;
END $$;

REVOKE EXECUTE ON FUNCTION public.event_join(), public.event_submit(text, text), public.event_my_status(), public.event_admin_start(), public.event_admin_reveal(int), public.event_admin_export() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_join(), public.event_submit(text, text), public.event_my_status(), public.event_admin_start(), public.event_admin_reveal(int), public.event_admin_export() TO authenticated;
GRANT EXECUTE ON FUNCTION public.event_public_state() TO anon, authenticated;