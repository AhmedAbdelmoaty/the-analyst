REVOKE ALL ON public.analytics_meta, public.visit_segments, public.game_rounds, public.round_events, public.account_flags, public.admin_export_log FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.pf_evaluate(jsonb, text[], boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rd_evaluate(text, text, text[], text[], text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rd_argument_check(text, text[], text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analytics_round_matches(public.game_rounds, text, text) FROM PUBLIC, anon;