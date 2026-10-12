CREATE OR REPLACE FUNCTION public.admin_activity_summary(_from date, _to date, _game text DEFAULT NULL, _include boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f timestamptz := _from::timestamp AT TIME ZONE 'Africa/Cairo'; t timestamptz := (_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo'; res jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 WITH rr AS (
 SELECT g.*, CASE WHEN timed_out_at IS NOT NULL THEN 'loss' WHEN completed_at IS NULL THEN NULL WHEN coalesce(server_outcome,outcome) IN ('strong','supported') THEN 'win' WHEN coalesce(server_outcome,outcome) IN ('weak','insufficient','criterion_mismatch') THEN 'loss' ELSE NULL END AS result
 FROM public.game_rounds g WHERE (_game IS NULL OR g.game=_game) AND (_include OR g.user_id IS NULL OR NOT public.analytics_excluded(g.user_id))
 ), period AS (
 SELECT * FROM rr WHERE coalesce(started_at,completed_at,timed_out_at,first_seen_at)>=f AND coalesce(started_at,completed_at,timed_out_at,first_seen_at)<t
 ), finished AS (
 SELECT * FROM rr WHERE coalesce(completed_at,timed_out_at)>=f AND coalesce(completed_at,timed_out_at)<t
 )
 SELECT jsonb_build_object(
 'tracking_since',(SELECT jsonb_object_agg(key,value) FROM public.analytics_meta),
 'games',(SELECT jsonb_agg(jsonb_build_object('game',k,'attempts',(SELECT count(*) FROM period WHERE game=k),'players',(SELECT count(DISTINCT user_id) FROM period WHERE game=k),'completed',(SELECT count(*) FROM finished WHERE game=k),'legacy',(SELECT count(*) FROM period WHERE game=k AND source='legacy'),'tracked_starts',(SELECT count(*) FROM rr WHERE game=k AND source='live' AND started_at>=f AND started_at<t),'tracked_finished',(SELECT count(*) FROM rr WHERE game=k AND source='live' AND started_at>=f AND started_at<t AND (completed_at IS NOT NULL OR timed_out_at IS NOT NULL)),'wins',(SELECT count(*) FROM finished WHERE game=k AND result='win'),'losses',(SELECT count(*) FROM finished WHERE game=k AND result='loss'),'unknown',(SELECT count(*) FROM finished WHERE game=k AND result IS NULL))) FROM unnest(ARRAY['problem-framing','reward-decision']) k WHERE _game IS NULL OR k=_game),
 'users',(SELECT coalesce(jsonb_object_agg(u.id::text,jsonb_build_object('attempts',(SELECT count(*) FROM period WHERE user_id=u.id),'completed',(SELECT count(*) FROM finished WHERE user_id=u.id),'visits',CASE WHEN u.created_at<(SELECT value FROM public.analytics_meta WHERE key='visits_since') AND NOT EXISTS(SELECT 1 FROM public.visit_segments s WHERE s.user_id=u.id) THEN NULL ELSE (SELECT count(DISTINCT visit_id) FROM public.visit_segments s WHERE s.user_id=u.id AND s.started_at<t AND s.last_seen_at>=f) END,'last_activity',greatest((SELECT max(last_seen_at) FROM public.visit_segments WHERE user_id=u.id),(SELECT max(last_activity_at) FROM rr WHERE user_id=u.id)))),'{}'::jsonb) FROM auth.users u WHERE _include OR NOT public.analytics_excluded(u.id))
 ) INTO res;
 RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.admin_activity_summary(date,date,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_activity_summary(date,date,text,boolean) TO authenticated;