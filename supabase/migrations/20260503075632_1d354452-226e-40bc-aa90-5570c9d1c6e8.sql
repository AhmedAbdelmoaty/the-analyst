ALTER TABLE public.completed_players
  ADD COLUMN IF NOT EXISTS qualified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS framing_correct integer,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_completed_players_qualified_duration
  ON public.completed_players (qualified, duration_ms ASC);

ALTER TABLE public.completed_players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.completed_players;