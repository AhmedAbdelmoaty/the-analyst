DROP FUNCTION IF EXISTS public.event_admin_export();
CREATE FUNCTION public.event_admin_export() RETURNS TABLE(rank bigint, full_name text, phone text, email text, company_name text, department text, lead_status text, correct boolean, duration_seconds integer, finished_at timestamptz, joined_at timestamptz, challenge_started_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 RETURN QUERY
 SELECT CASE WHEN ep.challenge_started_at = c.started_at THEN rk.rank END,
   coalesce(nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''), p.display_name, ''),
   p.phone, p.email, p.company_name,
   coalesce(nullif(p.department_other,''), p.department), p.lead_status, coalesce(r.correct, false),
   CASE WHEN r.call_ended_at IS NOT NULL THEN r.duration_seconds END, r.call_ended_at, p.created_at, ep.challenge_started_at
 FROM profiles p
 JOIN event_challenge c ON c.id = 1
 LEFT JOIN LATERAL (SELECT e.* FROM event_players e WHERE e.user_id = p.user_id ORDER BY e.challenge_started_at DESC LIMIT 1) ep ON true
 LEFT JOIN event_results r ON r.user_id = p.user_id AND r.challenge_started_at = ep.challenge_started_at
 LEFT JOIN event_ranked() rk ON rk.user_id = p.user_id AND ep.challenge_started_at = c.started_at
 WHERE NOT has_role(p.user_id, 'admin')
 ORDER BY p.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.event_admin_export() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.event_admin_export() TO authenticated;