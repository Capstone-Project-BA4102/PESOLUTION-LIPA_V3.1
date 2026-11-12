-- =====================================================================
-- Run AFTER supabase_schema.sql and BEFORE supabase_seed.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extra columns the UI needs
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.applicant_code_seq START 12;

ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS applicant_code TEXT UNIQUE
  DEFAULT ('APP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.applicant_code_seq')::text, 4, '0'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS business_type TEXT;

ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS work_setup TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS salary_min NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_max NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_unit TEXT DEFAULT 'month';

-- ---------------------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER avoids RLS recursion)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() );
$$;

CREATE OR REPLACE FUNCTION public.my_applicant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.applicants WHERE user_id = auth.uid() OR email_address = (auth.jwt() ->> 'email') LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_experience  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals             ENABLE ROW LEVEL SECURITY;

-- Admin: full access to everything
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admins','companies','applicants','applicant_experience','resumes',
    'applications','status_history','job_listings','job_matches','referrals'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t || '_admin_all', t);
  END LOOP;
END $$;

-- profiles: a user can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.admins;
DROP POLICY IF EXISTS admins_select_own ON public.admins;
CREATE POLICY admins_select_own ON public.admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- applicants: own record
DROP POLICY IF EXISTS applicants_select_own ON public.applicants;
CREATE POLICY applicants_select_own ON public.applicants
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR email_address = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS applicants_update_own ON public.applicants;
CREATE POLICY applicants_update_own ON public.applicants
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR email_address = (auth.jwt() ->> 'email')) WITH CHECK (user_id = auth.uid() OR email_address = (auth.jwt() ->> 'email'));

-- applicant-owned child tables
DROP POLICY IF EXISTS applicant_experience_select_own ON public.applicant_experience;
CREATE POLICY applicant_experience_select_own ON public.applicant_experience
  FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());

DROP POLICY IF EXISTS resumes_select_own ON public.resumes;
CREATE POLICY resumes_select_own ON public.resumes
  FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());

DROP POLICY IF EXISTS applications_select_own ON public.applications;
CREATE POLICY applications_select_own ON public.applications
  FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());

DROP POLICY IF EXISTS status_history_select_own ON public.status_history;
CREATE POLICY status_history_select_own ON public.status_history
  FOR SELECT TO authenticated USING (
    applicant_id = public.my_applicant_id() OR
    application_id IN (SELECT id FROM public.applications WHERE applicant_id = public.my_applicant_id()));

DROP POLICY IF EXISTS job_matches_select_own ON public.job_matches;
CREATE POLICY job_matches_select_own ON public.job_matches
  FOR SELECT TO authenticated USING (
    application_id IN (SELECT id FROM public.applications WHERE applicant_id = public.my_applicant_id()));

DROP POLICY IF EXISTS referrals_select_own ON public.referrals;
CREATE POLICY referrals_select_own ON public.referrals
  FOR SELECT TO authenticated USING (
    application_id IN (SELECT id FROM public.applications WHERE applicant_id = public.my_applicant_id()));

-- Public website: active jobs and their companies are visible to everyone
DROP POLICY IF EXISTS job_listings_public_read ON public.job_listings;
CREATE POLICY job_listings_public_read ON public.job_listings
  FOR SELECT TO anon, authenticated USING (status = 'Active');

DROP POLICY IF EXISTS companies_public_read ON public.companies;
CREATE POLICY companies_public_read ON public.companies
  FOR SELECT TO anon, authenticated USING (status = 'Active');

-- ---------------------------------------------------------------------
-- 4. Matching: final = 70% hard-skill score + 30% soft-skill score
--    Applicant skills come from the application's resume (extracted_skills).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_matches(p_application_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_skills TEXT[];
BEGIN
  -- Allow the SQL editor (no auth user) and admins only
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can compute matches';
  END IF;

  SELECT COALESCE(array_agg(lower(s)), '{}')
    INTO v_skills
  FROM public.applications a
  JOIN public.resumes r ON r.id = a.resume_id
  CROSS JOIN LATERAL unnest(r.extracted_skills) AS s
  WHERE a.id = p_application_id;

  INSERT INTO public.job_matches
    (application_id, job_id, hard_skill_score, soft_skill_score, final_match_score, matched_skills, skill_gaps)
  SELECT
    p_application_id,
    j.id,
    round(h.score, 2),
    round(s.score, 2),
    round(h.score * 0.70 + s.score * 0.30, 2),
    m.matched,
    g.gaps
  FROM public.job_listings j
  CROSS JOIN LATERAL (
    SELECT CASE WHEN cardinality(j.hard_skills) = 0 THEN 100::numeric
      ELSE 100.0 * (SELECT count(*) FROM unnest(j.hard_skills) x WHERE lower(x) = ANY (v_skills)) / cardinality(j.hard_skills)
    END AS score
  ) h
  CROSS JOIN LATERAL (
    SELECT CASE WHEN cardinality(j.soft_skills) = 0 THEN 100::numeric
      ELSE 100.0 * (SELECT count(*) FROM unnest(j.soft_skills) x WHERE lower(x) = ANY (v_skills)) / cardinality(j.soft_skills)
    END AS score
  ) s
  CROSS JOIN LATERAL (
    SELECT COALESCE(array_agg(x), '{}') AS matched
    FROM unnest(j.hard_skills || j.soft_skills) x WHERE lower(x) = ANY (v_skills)
  ) m
  CROSS JOIN LATERAL (
    SELECT COALESCE(array_agg(x), '{}') AS gaps
    FROM unnest(j.hard_skills || j.soft_skills) x WHERE NOT (lower(x) = ANY (v_skills))
  ) g
  WHERE j.status = 'Active'
    AND cardinality(m.matched) > 0
  ON CONFLICT (application_id, job_id) DO UPDATE SET
    hard_skill_score  = EXCLUDED.hard_skill_score,
    soft_skill_score  = EXCLUDED.soft_skill_score,
    final_match_score = EXCLUDED.final_match_score,
    matched_skills    = EXCLUDED.matched_skills,
    skill_gaps        = EXCLUDED.skill_gaps;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_matches(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_matches(UUID) TO authenticated;
