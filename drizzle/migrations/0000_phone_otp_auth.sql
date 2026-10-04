-- Profiles: phone is server-written only
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles(phone) WHERE phone IS NOT NULL;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, display_name, gender, avatar_choice) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, phone, first_name, last_name, display_name)
  VALUES (
    NEW.id, NEW.email,
    CASE WHEN NEW.phone IS NULL OR NEW.phone = '' THEN NULL ELSE '+' || ltrim(NEW.phone, '+') END,
    NULLIF(left(NEW.raw_user_meta_data->>'first_name', 50), ''),
    NULLIF(left(NEW.raw_user_meta_data->>'last_name', 50), ''),
    NULLIF(left(NEW.raw_user_meta_data->>'first_name', 50), '')
  ) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Game results linked to the signed-in user
ALTER TABLE public.completed_players ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS completed_players_user_id_idx ON public.completed_players(user_id);
DROP POLICY IF EXISTS "Anyone can record completion" ON public.completed_players;
REVOKE INSERT ON public.completed_players FROM anon;
CREATE POLICY "Signed-in players record their own completion" ON public.completed_players
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(trim(first_name)) BETWEEN 1 AND 50
    AND length(trim(last_name)) BETWEEN 1 AND 50
  );

-- OTP challenges (server only)
CREATE TABLE public.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup','recovery')),
  code_hmac text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  reset_token_hmac text,
  reset_expires_at timestamptz,
  reset_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.otp_challenges TO service_role;
REVOKE ALL ON public.otp_challenges FROM anon, authenticated;
ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX otp_challenges_lookup ON public.otp_challenges(phone, purpose, created_at DESC);

CREATE TABLE public.otp_rate_events (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  phone text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.otp_rate_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.otp_rate_events_id_seq TO service_role;
REVOKE ALL ON public.otp_rate_events FROM anon, authenticated;
ALTER TABLE public.otp_rate_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX otp_rate_phone ON public.otp_rate_events(kind, phone, created_at DESC);
CREATE INDEX otp_rate_ip ON public.otp_rate_events(kind, ip, created_at DESC);

-- Atomic attempt: row lock serializes concurrent verifies
CREATE OR REPLACE FUNCTION public.otp_attempt(_challenge_id uuid, _code_hmac text)
RETURNS TABLE(status text, user_id uuid, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.otp_challenges%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.otp_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'no_challenge'::text, NULL::uuid, 0; RETURN; END IF;
  IF c.consumed_at IS NOT NULL OR c.invalidated_at IS NOT NULL THEN
    RETURN QUERY SELECT 'used'::text, NULL::uuid, 0; RETURN; END IF;
  IF c.expires_at <= now() THEN RETURN QUERY SELECT 'expired'::text, NULL::uuid, 0; RETURN; END IF;
  IF c.attempts >= c.max_attempts THEN RETURN QUERY SELECT 'locked'::text, NULL::uuid, 0; RETURN; END IF;
  UPDATE public.otp_challenges SET attempts = attempts + 1 WHERE id = c.id;
  IF c.code_hmac = _code_hmac THEN
    UPDATE public.otp_challenges SET consumed_at = now() WHERE id = c.id;
    RETURN QUERY SELECT 'ok'::text, c.user_id, c.max_attempts - c.attempts - 1;
  ELSE
    RETURN QUERY SELECT
      CASE WHEN c.attempts + 1 >= c.max_attempts THEN 'locked' ELSE 'invalid' END,
      NULL::uuid, c.max_attempts - c.attempts - 1;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.otp_attempt(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otp_attempt(uuid, text) TO service_role;

-- Look up an auth user by phone (server only)
CREATE OR REPLACE FUNCTION public.auth_user_by_phone(_phone text)
RETURNS TABLE(id uuid, phone_confirmed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT u.id, (u.phone_confirmed_at IS NOT NULL)
  FROM auth.users u WHERE u.phone = ltrim(_phone, '+') LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.auth_user_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_by_phone(text) TO service_role;