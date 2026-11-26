ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_category_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_other_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_industry_category_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_industry_other_check;

CREATE OR REPLACE FUNCTION public.event_admin_history()
RETURNS TABLE(challenge_started_at timestamptz, rank bigint, full_name text, phone text, email text, company_name text, department text, duration_seconds integer, finished_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 RETURN QUERY
 SELECT r.challenge_started_at,
   row_number() OVER (PARTITION BY r.challenge_started_at ORDER BY r.duration_seconds, r.call_ended_at, r.id),
   trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')),
   p.phone, p.email, p.company_name, coalesce(nullif(p.department_other,''), p.department),
   r.duration_seconds, r.call_ended_at
 FROM event_results r
 LEFT JOIN profiles p ON p.user_id = r.user_id
 WHERE r.correct AND r.call_ended_at IS NOT NULL AND r.duration_seconds IS NOT NULL AND NOT has_role(r.user_id, 'admin')
 ORDER BY r.challenge_started_at DESC, 2;
END $$;
REVOKE ALL ON FUNCTION public.event_admin_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_admin_history() TO authenticated;