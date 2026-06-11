DROP POLICY IF EXISTS "Anyone can record completion" ON public.completed_players;

CREATE POLICY "Anyone can record completion"
ON public.completed_players
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(TRIM(BOTH FROM first_name)) > 0
  AND length(TRIM(BOTH FROM first_name)) <= 50
  AND length(TRIM(BOTH FROM last_name)) > 0
  AND length(TRIM(BOTH FROM last_name)) <= 50
  AND qualified = false
);

CREATE POLICY "Admins can update completed players"
ON public.completed_players
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));