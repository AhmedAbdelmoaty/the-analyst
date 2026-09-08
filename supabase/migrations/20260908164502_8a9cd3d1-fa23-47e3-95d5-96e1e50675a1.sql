ALTER TABLE public.completed_players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.completed_players;