CREATE TABLE public.game_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id text NOT NULL,
  screen text,
  category text NOT NULL CHECK (category IN ('technical','gameplay','idea')),
  option text NOT NULL,
  note text CHECK (note IS NULL OR length(note) <= 1000),
  device text,
  viewport text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.game_feedback TO authenticated;
GRANT ALL ON public.game_feedback TO service_role;
ALTER TABLE public.game_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players send own feedback" ON public.game_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read feedback" ON public.game_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.game_ratings (
  user_id uuid NOT NULL,
  game_id text NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);
GRANT SELECT, INSERT, UPDATE ON public.game_ratings TO authenticated;
GRANT ALL ON public.game_ratings TO service_role;
ALTER TABLE public.game_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own rating" ON public.game_ratings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Players add own rating" ON public.game_ratings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Players change own rating" ON public.game_ratings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.game_rating_summary()
RETURNS TABLE(game_id text, avg_stars numeric, total integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT game_id, round(avg(stars)::numeric, 1), count(*)::int FROM public.game_ratings GROUP BY game_id
$$;
GRANT EXECUTE ON FUNCTION public.game_rating_summary() TO anon, authenticated;