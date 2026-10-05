ALTER TABLE public.completed_players ADD COLUMN IF NOT EXISTS round_id text;
CREATE UNIQUE INDEX IF NOT EXISTS completed_players_user_round_uniq ON public.completed_players (user_id, round_id);