-- Forward-only profile and protected audience reporting extension.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS department_other text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS industry_other text,
  ADD COLUMN IF NOT EXISTS work_details_prompt_dismissed_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_department_category_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_department_category_check CHECK (department IS NULL OR department IN
      ('sales','marketing','finance','accounting','human_resources','operations','it_data_bi','customer_service','supply_chain_logistics','procurement','business_development','project_management','general_management','legal','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_industry_category_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_industry_category_check CHECK (industry IS NULL OR industry IN
      ('real_estate_construction','education_training','banking_financial_services','technology_telecom','retail_ecommerce','manufacturing','healthcare_pharmaceuticals','consulting_professional_services','hospitality_tourism','transportation_logistics','energy_utilities','media_advertising','government_public_sector','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_department_other_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_department_other_check CHECK (
      (department = 'other' AND department_other IS NOT NULL AND length(btrim(department_other)) BETWEEN 1 AND 80)
      OR (department IS DISTINCT FROM 'other' AND department_other IS NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_industry_other_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_industry_other_check CHECK (
      (industry = 'other' AND industry_other IS NOT NULL AND length(btrim(industry_other)) BETWEEN 1 AND 80)
      OR (industry IS DISTINCT FROM 'other' AND industry_other IS NULL));
  END IF;
END $$;

-- Existing owner-only RLS remains the row boundary. The allowlist excludes phone, user_id and role data.
GRANT UPDATE (department, department_other, industry, industry_other, work_details_prompt_dismissed_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.profile_country_from_phone(_phone text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _phone IS NULL OR _phone !~ '^\+[1-9][0-9]{7,14}$' THEN 'unknown'
    WHEN _phone LIKE '+1%' OR _phone LIKE '+7%' THEN 'ambiguous'
    WHEN _phone LIKE '+211%' THEN 'SS' WHEN _phone LIKE '+212%' THEN 'MA' WHEN _phone LIKE '+213%' THEN 'DZ' WHEN _phone LIKE '+216%' THEN 'TN' WHEN _phone LIKE '+218%' THEN 'LY'
    WHEN _phone LIKE '+220%' THEN 'GM' WHEN _phone LIKE '+221%' THEN 'SN' WHEN _phone LIKE '+222%' THEN 'MR' WHEN _phone LIKE '+223%' THEN 'ML' WHEN _phone LIKE '+224%' THEN 'GN' WHEN _phone LIKE '+225%' THEN 'CI' WHEN _phone LIKE '+226%' THEN 'BF' WHEN _phone LIKE '+227%' THEN 'NE' WHEN _phone LIKE '+228%' THEN 'TG' WHEN _phone LIKE '+229%' THEN 'BJ' WHEN _phone LIKE '+230%' THEN 'MU' WHEN _phone LIKE '+231%' THEN 'LR' WHEN _phone LIKE '+232%' THEN 'SL' WHEN _phone LIKE '+233%' THEN 'GH' WHEN _phone LIKE '+234%' THEN 'NG' WHEN _phone LIKE '+235%' THEN 'TD' WHEN _phone LIKE '+236%' THEN 'CF' WHEN _phone LIKE '+237%' THEN 'CM' WHEN _phone LIKE '+238%' THEN 'CV' WHEN _phone LIKE '+239%' THEN 'ST' WHEN _phone LIKE '+240%' THEN 'GQ' WHEN _phone LIKE '+241%' THEN 'GA' WHEN _phone LIKE '+242%' THEN 'CG' WHEN _phone LIKE '+243%' THEN 'CD' WHEN _phone LIKE '+244%' THEN 'AO' WHEN _phone LIKE '+245%' THEN 'GW' WHEN _phone LIKE '+246%' THEN 'IO' WHEN _phone LIKE '+248%' THEN 'SC' WHEN _phone LIKE '+249%' THEN 'SD' WHEN _phone LIKE '+250%' THEN 'RW' WHEN _phone LIKE '+251%' THEN 'ET' WHEN _phone LIKE '+252%' THEN 'SO' WHEN _phone LIKE '+253%' THEN 'DJ' WHEN _phone LIKE '+254%' THEN 'KE' WHEN _phone LIKE '+255%' THEN 'TZ' WHEN _phone LIKE '+256%' THEN 'UG' WHEN _phone LIKE '+257%' THEN 'BI' WHEN _phone LIKE '+258%' THEN 'MZ' WHEN _phone LIKE '+260%' THEN 'ZM' WHEN _phone LIKE '+261%' THEN 'MG' WHEN _phone LIKE '+262%' THEN 'ambiguous' WHEN _phone LIKE '+263%' THEN 'ZW' WHEN _phone LIKE '+264%' THEN 'NA' WHEN _phone LIKE '+265%' THEN 'MW' WHEN _phone LIKE '+266%' THEN 'LS' WHEN _phone LIKE '+267%' THEN 'BW' WHEN _phone LIKE '+268%' THEN 'SZ' WHEN _phone LIKE '+269%' THEN 'KM'
    WHEN _phone LIKE '+290%' THEN 'SH' WHEN _phone LIKE '+291%' THEN 'ER' WHEN _phone LIKE '+297%' THEN 'AW' WHEN _phone LIKE '+298%' THEN 'FO' WHEN _phone LIKE '+299%' THEN 'GL'
    WHEN _phone LIKE '+350%' THEN 'GI' WHEN _phone LIKE '+351%' THEN 'PT' WHEN _phone LIKE '+352%' THEN 'LU' WHEN _phone LIKE '+353%' THEN 'IE' WHEN _phone LIKE '+354%' THEN 'IS' WHEN _phone LIKE '+355%' THEN 'AL' WHEN _phone LIKE '+356%' THEN 'MT' WHEN _phone LIKE '+357%' THEN 'CY' WHEN _phone LIKE '+358%' THEN 'FI' WHEN _phone LIKE '+359%' THEN 'BG' WHEN _phone LIKE '+370%' THEN 'LT' WHEN _phone LIKE '+371%' THEN 'LV' WHEN _phone LIKE '+372%' THEN 'EE' WHEN _phone LIKE '+373%' THEN 'MD' WHEN _phone LIKE '+374%' THEN 'AM' WHEN _phone LIKE '+375%' THEN 'BY' WHEN _phone LIKE '+376%' THEN 'AD' WHEN _phone LIKE '+377%' THEN 'MC' WHEN _phone LIKE '+378%' THEN 'SM' WHEN _phone LIKE '+380%' THEN 'UA' WHEN _phone LIKE '+381%' THEN 'RS' WHEN _phone LIKE '+382%' THEN 'ME' WHEN _phone LIKE '+383%' THEN 'XK' WHEN _phone LIKE '+385%' THEN 'HR' WHEN _phone LIKE '+386%' THEN 'SI' WHEN _phone LIKE '+387%' THEN 'BA' WHEN _phone LIKE '+389%' THEN 'MK'
    WHEN _phone LIKE '+420%' THEN 'CZ' WHEN _phone LIKE '+421%' THEN 'SK' WHEN _phone LIKE '+423%' THEN 'LI'
    WHEN _phone LIKE '+500%' THEN 'FK' WHEN _phone LIKE '+501%' THEN 'BZ' WHEN _phone LIKE '+502%' THEN 'GT' WHEN _phone LIKE '+503%' THEN 'SV' WHEN _phone LIKE '+504%' THEN 'HN' WHEN _phone LIKE '+505%' THEN 'NI' WHEN _phone LIKE '+506%' THEN 'CR' WHEN _phone LIKE '+507%' THEN 'PA' WHEN _phone LIKE '+508%' THEN 'PM' WHEN _phone LIKE '+509%' THEN 'HT' WHEN _phone LIKE '+590%' THEN 'GP' WHEN _phone LIKE '+591%' THEN 'BO' WHEN _phone LIKE '+592%' THEN 'GY' WHEN _phone LIKE '+593%' THEN 'EC' WHEN _phone LIKE '+594%' THEN 'GF' WHEN _phone LIKE '+595%' THEN 'PY' WHEN _phone LIKE '+596%' THEN 'MQ' WHEN _phone LIKE '+597%' THEN 'SR' WHEN _phone LIKE '+598%' THEN 'UY' WHEN _phone LIKE '+599%' THEN 'CW'
    WHEN _phone LIKE '+670%' THEN 'TL' WHEN _phone LIKE '+672%' THEN 'NF' WHEN _phone LIKE '+673%' THEN 'BN' WHEN _phone LIKE '+674%' THEN 'NR' WHEN _phone LIKE '+675%' THEN 'PG' WHEN _phone LIKE '+676%' THEN 'TO' WHEN _phone LIKE '+677%' THEN 'SB' WHEN _phone LIKE '+678%' THEN 'VU' WHEN _phone LIKE '+679%' THEN 'FJ' WHEN _phone LIKE '+680%' THEN 'PW' WHEN _phone LIKE '+681%' THEN 'WF' WHEN _phone LIKE '+682%' THEN 'CK' WHEN _phone LIKE '+683%' THEN 'NU' WHEN _phone LIKE '+685%' THEN 'WS' WHEN _phone LIKE '+686%' THEN 'KI' WHEN _phone LIKE '+687%' THEN 'NC' WHEN _phone LIKE '+688%' THEN 'TV' WHEN _phone LIKE '+689%' THEN 'PF' WHEN _phone LIKE '+690%' THEN 'TK' WHEN _phone LIKE '+691%' THEN 'FM' WHEN _phone LIKE '+692%' THEN 'MH'
    WHEN _phone LIKE '+800%' OR _phone LIKE '+808%' OR _phone LIKE '+870%' OR _phone LIKE '+881%' OR _phone LIKE '+882%' OR _phone LIKE '+883%' OR _phone LIKE '+888%' OR _phone LIKE '+979%' THEN 'ambiguous'
    WHEN _phone LIKE '+850%' THEN 'KP' WHEN _phone LIKE '+852%' THEN 'HK' WHEN _phone LIKE '+853%' THEN 'MO' WHEN _phone LIKE '+855%' THEN 'KH' WHEN _phone LIKE '+856%' THEN 'LA' WHEN _phone LIKE '+880%' THEN 'BD' WHEN _phone LIKE '+886%' THEN 'TW'
    WHEN _phone LIKE '+960%' THEN 'MV' WHEN _phone LIKE '+961%' THEN 'LB' WHEN _phone LIKE '+962%' THEN 'JO' WHEN _phone LIKE '+963%' THEN 'SY' WHEN _phone LIKE '+964%' THEN 'IQ' WHEN _phone LIKE '+965%' THEN 'KW' WHEN _phone LIKE '+966%' THEN 'SA' WHEN _phone LIKE '+967%' THEN 'YE' WHEN _phone LIKE '+968%' THEN 'OM' WHEN _phone LIKE '+970%' THEN 'PS' WHEN _phone LIKE '+971%' THEN 'AE' WHEN _phone LIKE '+972%' THEN 'IL' WHEN _phone LIKE '+973%' THEN 'BH' WHEN _phone LIKE '+974%' THEN 'QA' WHEN _phone LIKE '+975%' THEN 'BT' WHEN _phone LIKE '+976%' THEN 'MN' WHEN _phone LIKE '+977%' THEN 'NP' WHEN _phone LIKE '+992%' THEN 'TJ' WHEN _phone LIKE '+993%' THEN 'TM' WHEN _phone LIKE '+994%' THEN 'AZ' WHEN _phone LIKE '+995%' THEN 'GE' WHEN _phone LIKE '+996%' THEN 'KG' WHEN _phone LIKE '+998%' THEN 'UZ'
    WHEN _phone LIKE '+20%' THEN 'EG' WHEN _phone LIKE '+27%' THEN 'ZA' WHEN _phone LIKE '+30%' THEN 'GR' WHEN _phone LIKE '+31%' THEN 'NL' WHEN _phone LIKE '+32%' THEN 'BE' WHEN _phone LIKE '+33%' THEN 'FR' WHEN _phone LIKE '+34%' THEN 'ES' WHEN _phone LIKE '+36%' THEN 'HU' WHEN _phone LIKE '+39%' THEN 'IT' WHEN _phone LIKE '+40%' THEN 'RO' WHEN _phone LIKE '+41%' THEN 'CH' WHEN _phone LIKE '+43%' THEN 'AT' WHEN _phone LIKE '+44%' THEN 'GB' WHEN _phone LIKE '+45%' THEN 'DK' WHEN _phone LIKE '+46%' THEN 'SE' WHEN _phone LIKE '+47%' THEN 'NO' WHEN _phone LIKE '+48%' THEN 'PL' WHEN _phone LIKE '+49%' THEN 'DE'
    WHEN _phone LIKE '+51%' THEN 'PE' WHEN _phone LIKE '+52%' THEN 'MX' WHEN _phone LIKE '+53%' THEN 'CU' WHEN _phone LIKE '+54%' THEN 'AR' WHEN _phone LIKE '+55%' THEN 'BR' WHEN _phone LIKE '+56%' THEN 'CL' WHEN _phone LIKE '+57%' THEN 'CO' WHEN _phone LIKE '+58%' THEN 'VE' WHEN _phone LIKE '+60%' THEN 'MY' WHEN _phone LIKE '+61%' THEN 'AU' WHEN _phone LIKE '+62%' THEN 'ID' WHEN _phone LIKE '+63%' THEN 'PH' WHEN _phone LIKE '+64%' THEN 'NZ' WHEN _phone LIKE '+65%' THEN 'SG' WHEN _phone LIKE '+66%' THEN 'TH' WHEN _phone LIKE '+81%' THEN 'JP' WHEN _phone LIKE '+82%' THEN 'KR' WHEN _phone LIKE '+84%' THEN 'VN' WHEN _phone LIKE '+86%' THEN 'CN' WHEN _phone LIKE '+90%' THEN 'TR' WHEN _phone LIKE '+91%' THEN 'IN' WHEN _phone LIKE '+92%' THEN 'PK' WHEN _phone LIKE '+93%' THEN 'AF' WHEN _phone LIKE '+94%' THEN 'LK' WHEN _phone LIKE '+95%' THEN 'MM' WHEN _phone LIKE '+98%' THEN 'IR'
    WHEN _phone LIKE '+211%' THEN 'SS' WHEN _phone LIKE '+212%' THEN 'MA' WHEN _phone LIKE '+213%' THEN 'DZ' WHEN _phone LIKE '+216%' THEN 'TN' WHEN _phone LIKE '+218%' THEN 'LY'
    WHEN _phone LIKE '+7%' THEN 'ambiguous' ELSE 'unknown' END
$$;
REVOKE ALL ON FUNCTION public.profile_country_from_phone(text) FROM PUBLIC, anon, authenticated;

-- Replace only this reporting RPC signature; the old function body remains in history.
DROP FUNCTION IF EXISTS public.admin_users(date,date,text,text,boolean,text,text,text,integer,integer);
CREATE OR REPLACE FUNCTION public.admin_users(
  _from date, _to date, _game text DEFAULT NULL, _status text DEFAULT NULL, _include boolean DEFAULT false,
  _search text DEFAULT NULL, _sort text DEFAULT 'created_at', _dir text DEFAULT 'desc', _limit integer DEFAULT 25, _offset integer DEFAULT 0,
  _country text DEFAULT NULL, _gender text DEFAULT NULL, _department text DEFAULT NULL, _industry text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f timestamptz; t timestamptz; res jsonb; q text := nullif(trim(coalesce(_search,'')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _sort NOT IN ('name','created_at','last_activity','visits','attempts','completed') THEN _sort := 'created_at'; END IF;
  f := (_from::timestamp AT TIME ZONE 'Africa/Cairo'); t := ((_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo');
  WITH base AS (
    SELECT au.id AS user_id, p.first_name, p.last_name, p.phone, au.created_at,
      coalesce(public.profile_country_from_phone(p.phone),'unknown') AS country,
      coalesce(p.gender,'unknown') AS gender, coalesce(p.department,'unknown') AS department, p.department_other,
      coalesce(p.industry,'unknown') AS industry, p.industry_other,
      (au.phone_confirmed_at IS NOT NULL OR au.email_confirmed_at IS NOT NULL) AS confirmed,
      coalesce(fl.is_test, false) AS is_test, public.has_role(au.id, 'admin') AS is_admin,
      greatest((SELECT max(last_seen_at) FROM public.visit_segments s WHERE s.user_id = au.id),
               (SELECT max(last_activity_at) FROM public.game_rounds g WHERE g.user_id = au.id)) AS last_activity,
      (SELECT count(DISTINCT visit_id) FROM public.visit_segments s WHERE s.user_id = au.id AND s.started_at < t AND s.last_seen_at >= f) AS visits,
      (SELECT count(*) FROM public.game_rounds g WHERE g.user_id = au.id AND g.started_at >= f AND g.started_at < t AND public.analytics_round_matches(g, _game, _status)) AS attempts,
      (SELECT count(*) FROM public.game_rounds g WHERE g.user_id = au.id AND g.completed_at >= f AND g.completed_at < t AND public.analytics_round_matches(g, _game, _status)) AS completed
    FROM auth.users au LEFT JOIN public.profiles p ON p.user_id = au.id LEFT JOIN public.account_flags fl ON fl.user_id = au.id
    WHERE (_include OR NOT public.analytics_excluded(au.id))
      AND (q IS NULL OR concat_ws(' ',p.first_name,p.last_name) ILIKE '%'||q||'%' OR p.phone LIKE '%'||q||'%' OR au.email ILIKE '%'||q||'%')
      AND (_country IS NULL OR coalesce(public.profile_country_from_phone(p.phone),'unknown') = _country)
      AND (_gender IS NULL OR coalesce(p.gender,'unknown') = _gender)
      AND (_department IS NULL OR coalesce(p.department,'unknown') = _department)
      AND (_industry IS NULL OR coalesce(p.industry,'unknown') = _industry)
  ), sorted AS (
    SELECT * FROM base ORDER BY
      CASE WHEN _dir = 'asc' THEN CASE _sort WHEN 'name' THEN concat_ws(' ',first_name,last_name) END END ASC NULLS LAST,
      CASE WHEN _dir <> 'asc' THEN CASE _sort WHEN 'name' THEN concat_ws(' ',first_name,last_name) END END DESC NULLS LAST,
      CASE WHEN _dir = 'asc' THEN CASE _sort WHEN 'created_at' THEN created_at WHEN 'last_activity' THEN last_activity END END ASC NULLS LAST,
      CASE WHEN _dir <> 'asc' THEN CASE _sort WHEN 'created_at' THEN created_at WHEN 'last_activity' THEN last_activity END END DESC NULLS LAST,
      CASE WHEN _dir = 'asc' THEN CASE _sort WHEN 'visits' THEN visits WHEN 'attempts' THEN attempts WHEN 'completed' THEN completed END END ASC NULLS LAST,
      CASE WHEN _dir <> 'asc' THEN CASE _sort WHEN 'visits' THEN visits WHEN 'attempts' THEN attempts WHEN 'completed' THEN completed END END DESC NULLS LAST,user_id
  ), audience AS (
    SELECT count(*) AS total,
      coalesce((SELECT jsonb_object_agg(k,n) FROM (SELECT country k,count(*) n FROM base GROUP BY country) c),'{}'::jsonb) countries,
      coalesce((SELECT jsonb_object_agg(k,n) FROM (SELECT gender k,count(*) n FROM base GROUP BY gender) g),'{}'::jsonb) genders,
      coalesce((SELECT jsonb_object_agg(k,n) FROM (SELECT CASE WHEN department='other' THEN 'other:'||department_other ELSE department END k,count(*) n FROM base GROUP BY 1) d),'{}'::jsonb) departments,
      coalesce((SELECT jsonb_object_agg(k,n) FROM (SELECT CASE WHEN industry='other' THEN 'other:'||industry_other ELSE industry END k,count(*) n FROM base GROUP BY 1) i),'{}'::jsonb) industries
    FROM base
  )
  SELECT jsonb_build_object('total', audience.total,
    'audience',jsonb_build_object('total',audience.total,'country',audience.countries,'gender',audience.genders,'department',audience.departments,'industry',audience.industries),
    'rows',coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM (SELECT * FROM sorted LIMIT least(greatest(_limit,1),100000) OFFSET greatest(_offset,0)) s),'[]'::jsonb))
  INTO res FROM audience;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.admin_users(date,date,text,text,boolean,text,text,text,integer,integer,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_users(date,date,text,text,boolean,text,text,text,integer,integer,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_detail(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'user_id',au.id,'first_name',p.first_name,'last_name',p.last_name,'phone',p.phone,
    'country',coalesce(public.profile_country_from_phone(p.phone),'unknown'),'department',p.department,'department_other',p.department_other,'industry',p.industry,'industry_other',p.industry_other,'gender_choice',p.gender,
    'created_at',au.created_at,'confirmed',(au.phone_confirmed_at IS NOT NULL OR au.email_confirmed_at IS NOT NULL),
    'is_test',coalesce(fl.is_test,false),'is_admin',public.has_role(au.id,'admin'),
    'visits_total',(SELECT count(DISTINCT visit_id) FROM public.visit_segments s WHERE s.user_id=au.id),
    'first_visit',(SELECT min(started_at) FROM public.visit_segments s WHERE s.user_id=au.id),
    'last_visit',(SELECT max(last_seen_at) FROM public.visit_segments s WHERE s.user_id=au.id),
    'rounds',coalesce((SELECT jsonb_agg(jsonb_build_object('game',g.game,'round_id',g.round_id,'source',g.source,'content_version',g.content_version,'started_at',g.started_at,'first_seen_at',g.first_seen_at,'last_activity_at',g.last_activity_at,'last_stage',g.last_stage,'active_ms',g.active_ms,'submitted_at',g.submitted_at,'completed_at',g.completed_at,'timed_out_at',g.timed_out_at,'outcome',g.outcome,'server_outcome',g.server_outcome,'server_reason',g.server_reason,'details',g.details) ORDER BY coalesce(g.started_at,g.completed_at,g.first_seen_at)) FROM public.game_rounds g WHERE g.user_id=au.id),'[]'::jsonb)
  ) INTO res FROM auth.users au LEFT JOIN public.profiles p ON p.user_id=au.id LEFT JOIN public.account_flags fl ON fl.user_id=au.id WHERE au.id=_user_id;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.admin_user_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_detail(uuid) TO authenticated;
