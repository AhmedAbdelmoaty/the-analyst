GRANT UPDATE (company_name, email) ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.event_admin_export();
CREATE FUNCTION public.event_admin_export() RETURNS TABLE(rank bigint, full_name text, phone text, email text, company_name text, department text, lead_status text, correct boolean, duration_seconds integer, finished_at timestamptz, joined_at timestamptz, challenge_started_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 RETURN QUERY
 SELECT CASE WHEN ep.challenge_started_at = c.started_at THEN rk.rank END,
   coalesce(nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''), p.display_name, ''),
   p.phone, p.email, p.company_name,
   coalesce(nullif(p.department_other,''), p.department), p.lead_status, coalesce(r.correct, false),
   CASE WHEN r.call_ended_at IS NOT NULL THEN r.duration_seconds END, r.call_ended_at, ep.joined_at, ep.challenge_started_at
 FROM event_players ep
 JOIN event_challenge c ON c.id = 1
 LEFT JOIN event_results r ON r.user_id = ep.user_id AND r.challenge_started_at = ep.challenge_started_at
 LEFT JOIN event_ranked() rk ON rk.user_id = ep.user_id
 LEFT JOIN profiles p ON p.user_id = ep.user_id
 WHERE NOT has_role(ep.user_id, 'admin')
 ORDER BY ep.challenge_started_at DESC, rk.rank NULLS LAST, r.call_ended_at NULLS LAST, ep.joined_at;
END $$;
REVOKE ALL ON FUNCTION public.event_admin_export() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.event_admin_export() TO authenticated;