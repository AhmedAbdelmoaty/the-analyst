CREATE POLICY "Admins can delete completed players"
ON public.completed_players
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));