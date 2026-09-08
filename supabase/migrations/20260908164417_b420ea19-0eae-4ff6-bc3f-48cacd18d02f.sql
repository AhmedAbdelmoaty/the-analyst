CREATE OR REPLACE FUNCTION public.set_completed_player_qualified()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.qualified := (NEW.outcome = 'strong');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_completed_player_qualified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_qualified_on_completed_players ON public.completed_players;
CREATE TRIGGER set_qualified_on_completed_players
BEFORE INSERT ON public.completed_players
FOR EACH ROW EXECUTE FUNCTION public.set_completed_player_qualified();

DROP POLICY IF EXISTS "Anyone can record completion" ON public.completed_players;
CREATE POLICY "Anyone can record completion"
ON public.completed_players FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(first_name)) > 0 AND length(trim(first_name)) <= 50
  AND length(trim(last_name)) > 0 AND length(trim(last_name)) <= 50
);

UPDATE public.completed_players SET qualified = true WHERE outcome = 'strong' AND qualified = false;