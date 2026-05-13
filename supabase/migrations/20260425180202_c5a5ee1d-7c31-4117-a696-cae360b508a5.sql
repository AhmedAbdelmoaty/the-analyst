
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. RLS for user_roles: users can see their own roles; only admins can see all. No client-side writes.
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create completed_players table
CREATE TABLE public.completed_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.completed_players ENABLE ROW LEVEL SECURITY;

-- 6. RLS for completed_players
-- Anyone (including anonymous) can insert their completion
CREATE POLICY "Anyone can record completion"
ON public.completed_players
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(first_name)) > 0
  AND length(trim(first_name)) <= 50
  AND length(trim(last_name)) > 0
  AND length(trim(last_name)) <= 50
);

-- Only admins can view the leaderboard
CREATE POLICY "Only admins can view completed players"
ON public.completed_players
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for ordering
CREATE INDEX idx_completed_players_completed_at ON public.completed_players(completed_at ASC);
