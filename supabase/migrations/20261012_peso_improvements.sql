-- Review before applying to an existing database. No applicant records are reset.
-- Run after the existing schema/seed. This replaces policies on the listed tables.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'superadmin'; $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_superadmin() OR EXISTS (SELECT 1 FROM public.admins WHERE profile_id = auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.my_applicant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.applicants WHERE profile_id = auth.uid() LIMIT 1; $$;

CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY CHECK (id = 'public'),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  published boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.skill_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  recommendations jsonb NOT NULL CHECK (jsonb_typeof(recommendations) = 'array'),
  model text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(applicant_id, job_id)
);
CREATE TABLE IF NOT EXISTS public.service_checks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  backend_status text NOT NULL CHECK (backend_status IN ('healthy','unavailable','not_configured')),
  database_status text NOT NULL CHECK (database_status IN ('healthy','unavailable','not_configured')),
  gemini_status text NOT NULL CHECK (gemini_status IN ('healthy','unavailable','not_configured')),
  deployment_status text NOT NULL CHECK (deployment_status IN ('healthy','unavailable','not_configured')),
  database_latency_ms integer, gemini_latency_ms integer, deployment_latency_ms integer,
  model text NOT NULL, version text NOT NULL
);
CREATE INDEX IF NOT EXISTS service_checks_month ON public.service_checks(checked_at DESC);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_checks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','admins','companies','applicants','applicant_experience','resumes',
    'applications','status_history','job_listings','job_matches','referrals','site_content','skill_recommendations','service_checks'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    IF t NOT IN ('site_content','skill_recommendations','service_checks') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin_all', t);
    END IF;
  END LOOP;
END $$;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY admins_select_own ON public.admins FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY applicants_select_own ON public.applicants FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY applicant_experience_select_own ON public.applicant_experience FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());
CREATE POLICY resumes_select_own ON public.resumes FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());
CREATE POLICY job_matches_select_own ON public.job_matches FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());
CREATE POLICY applications_select_own ON public.applications FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());
CREATE POLICY applications_request_own ON public.applications FOR INSERT TO authenticated
  WITH CHECK (applicant_id = public.my_applicant_id() AND status = 'Referral Requested'
    AND EXISTS (SELECT 1 FROM public.job_matches m JOIN public.job_listings j ON j.id = m.job_id
      WHERE m.applicant_id = applications.applicant_id AND m.job_id = applications.job_id AND j.status = 'Active')
    AND (resume_id IS NULL OR EXISTS (SELECT 1 FROM public.resumes r WHERE r.id = applications.resume_id AND r.applicant_id = public.my_applicant_id())));
CREATE POLICY applications_update_request_own ON public.applications FOR UPDATE TO authenticated
  USING (applicant_id = public.my_applicant_id() AND status IN ('Matched','Declined','Referral Requested'))
  WITH CHECK (applicant_id = public.my_applicant_id() AND status = 'Referral Requested');
REVOKE UPDATE ON public.applications FROM authenticated;
GRANT UPDATE(status) ON public.applications TO authenticated;
CREATE POLICY status_history_select_own ON public.status_history FOR SELECT TO authenticated USING (applicant_id = public.my_applicant_id());
CREATE POLICY status_history_request_own ON public.status_history FOR INSERT TO authenticated
  WITH CHECK (applicant_id = public.my_applicant_id() AND status = 'Referral Requested'
    AND EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.applicant_id = public.my_applicant_id() AND a.status = 'Referral Requested'));
CREATE POLICY referrals_select_own ON public.referrals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.applicant_id = public.my_applicant_id()));
CREATE POLICY jobs_public_read ON public.job_listings FOR SELECT TO anon, authenticated USING (status = 'Active');
CREATE POLICY companies_public_read ON public.companies FOR SELECT TO anon, authenticated USING (status = 'Active');
CREATE POLICY site_content_public_read ON public.site_content FOR SELECT TO anon, authenticated USING (published OR public.is_superadmin());
CREATE POLICY site_content_superadmin ON public.site_content FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
CREATE POLICY recommendations_owner_read ON public.skill_recommendations FOR SELECT TO authenticated USING (public.is_admin() OR applicant_id = public.my_applicant_id());
CREATE POLICY service_checks_superadmin_read ON public.service_checks FOR SELECT TO authenticated USING (public.is_superadmin());

-- The server Auth Admin API replaces direct SQL inserts into auth.users.
DO $$ BEGIN
  IF to_regprocedure('public.create_portal_account(text,text,text,text,text,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_portal_account(text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS activity_logs_read ON public.activity_logs;
    DROP POLICY IF EXISTS activity_logs_insert ON public.activity_logs;
    CREATE POLICY activity_logs_read ON public.activity_logs FOR SELECT TO authenticated USING (public.is_admin());
    CREATE POLICY activity_logs_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  END IF;
END $$;

UPDATE storage.buckets SET public = false WHERE id IN ('resumes','referral-slips');
DROP POLICY IF EXISTS "storage public read" ON storage.objects;
DROP POLICY IF EXISTS "admin storage insert" ON storage.objects;
DROP POLICY IF EXISTS "admin storage update" ON storage.objects;
DROP POLICY IF EXISTS "admin storage delete" ON storage.objects;
DROP POLICY IF EXISTS peso_document_read ON storage.objects;
DROP POLICY IF EXISTS peso_document_insert ON storage.objects;
DROP POLICY IF EXISTS peso_document_update ON storage.objects;
DROP POLICY IF EXISTS peso_document_delete ON storage.objects;
DROP POLICY IF EXISTS peso_avatar_read ON storage.objects;
CREATE POLICY peso_document_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('resumes','avatars','referral-slips') AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY peso_avatar_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY peso_document_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('resumes','avatars','referral-slips') AND public.is_admin());
CREATE POLICY peso_document_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('resumes','avatars','referral-slips') AND public.is_admin())
  WITH CHECK (bucket_id IN ('resumes','avatars','referral-slips') AND public.is_admin());
CREATE POLICY peso_document_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('resumes','avatars','referral-slips') AND public.is_admin());

CREATE OR REPLACE FUNCTION public.replace_applicant_matches(p_applicant_id uuid, p_matches jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Server access required'; END IF;
  IF jsonb_typeof(p_matches) <> 'array' THEN RAISE EXCEPTION 'Invalid match list'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_matches) x WHERE (x->>'applicant_id')::uuid IS DISTINCT FROM p_applicant_id) THEN RAISE EXCEPTION 'Applicant mismatch'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_applicant_id::text));
  DELETE FROM public.skill_recommendations WHERE applicant_id = p_applicant_id;
  DELETE FROM public.job_matches WHERE applicant_id = p_applicant_id AND job_id NOT IN
    (SELECT (x->>'job_id')::uuid FROM jsonb_array_elements(p_matches) x);
  INSERT INTO public.job_matches(applicant_id, job_id, hard_skill_score, soft_skill_score, education_score, final_match_score,
    matched_hard_skills, missing_hard_skills, matched_soft_skills, missing_soft_skills)
  SELECT p_applicant_id, r.job_id, r.hard_skill_score, r.soft_skill_score, r.education_score, r.final_match_score,
    r.matched_hard_skills, r.missing_hard_skills, r.matched_soft_skills, r.missing_soft_skills
  FROM jsonb_populate_recordset(NULL::public.job_matches, p_matches) r
  ON CONFLICT(applicant_id, job_id) DO UPDATE SET hard_skill_score = EXCLUDED.hard_skill_score,
    soft_skill_score = EXCLUDED.soft_skill_score, education_score = EXCLUDED.education_score, final_match_score = EXCLUDED.final_match_score,
    matched_hard_skills = EXCLUDED.matched_hard_skills, missing_hard_skills = EXCLUDED.missing_hard_skills,
    matched_soft_skills = EXCLUDED.matched_soft_skills, missing_soft_skills = EXCLUDED.missing_soft_skills, created_at = now();
END $$;
REVOKE ALL ON FUNCTION public.replace_applicant_matches(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_applicant_matches(uuid,jsonb) TO service_role;
REVOKE ALL ON public.site_content, public.skill_recommendations, public.service_checks FROM anon, authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT SELECT ON public.skill_recommendations, public.service_checks TO authenticated;
GRANT ALL ON public.site_content, public.skill_recommendations, public.service_checks TO service_role;

INSERT INTO public.site_content(id, published, content) VALUES ('public', true, '{
  "title":"PESO Lipa City", "tagline":"OPORTUNIDAD PARA SA BAWAT LIPEÑO",
  "description":"Public Employment Service Office of Lipa City. Walk-in applicant registration and employment assistance at the Trabaho Center.",
  "address":"TRABAHO CENTER, Lipa City Hall, Bulacnin, Lipa City", "telephone":"(043) 276-9654",
  "email":"lipacitypeso@yahoo.com", "officeHours":"Monday to Thursday, 7:00 AM - 6:00 PM",
  "facebookLabel":"Lipa City PESO - Public Employment Service Office", "facebookUrl":"",
  "sourceLabel":"PESO contact information supplied by the project client", "sourceUrl":"", "heroImage":"/new-city-hall-building.jpg",
  "services":[], "announcements":[], "trainingCatalog":[]
}'::jsonb) ON CONFLICT(id) DO NOTHING;

COMMIT;
