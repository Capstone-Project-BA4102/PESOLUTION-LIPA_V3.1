-- Clean Slate
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles (Authentication)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'applicant')),
  first_name TEXT DEFAULT '',
  middle_surname TEXT DEFAULT '',
  last_surname TEXT DEFAULT '',
  suffix TEXT DEFAULT '',
  full_name TEXT GENERATED ALWAYS AS (
    TRIM(
      first_name ||
      COALESCE(' ' || NULLIF(middle_surname, ''), '') ||
      COALESCE(' ' || NULLIF(last_surname, ''), '') ||
      COALESCE(' ' || NULLIF(suffix, ''), '')
    )
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins Table
CREATE TABLE public.admins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT DEFAULT '',
  middle_surname TEXT DEFAULT '',
  last_surname TEXT DEFAULT '',
  suffix TEXT DEFAULT '',
  full_name TEXT GENERATED ALWAYS AS (
    TRIM(
      first_name ||
      COALESCE(' ' || NULLIF(middle_surname, ''), '') ||
      COALESCE(' ' || NULLIF(last_surname, ''), '') ||
      COALESCE(' ' || NULLIF(suffix, ''), '')
    )
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Companies
CREATE TABLE public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  contact_person TEXT,
  contact_role TEXT, 
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'Active',
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Job Listings (Must be before applications)
CREATE TABLE public.job_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT,
  employment_type TEXT,
  vacancies INTEGER,
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_unit TEXT DEFAULT 'month',
  education TEXT,
  hard_skills TEXT[] DEFAULT '{}'::text[],
  soft_skills TEXT[] DEFAULT '{}'::text[],
  description TEXT,
  status TEXT DEFAULT 'Active',
  date_posted TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Applicants
CREATE TABLE public.applicants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT DEFAULT '',
  middle_surname TEXT DEFAULT '',
  last_surname TEXT DEFAULT '',
  suffix TEXT DEFAULT '',
  full_name TEXT GENERATED ALWAYS AS (
    TRIM(
      first_name ||
      COALESCE(' ' || NULLIF(middle_surname, ''), '') ||
      COALESCE(' ' || NULLIF(last_surname, ''), '') ||
      COALESCE(' ' || NULLIF(suffix, ''), '')
    )
  ) STORED,
  date_of_birth DATE,
  gender TEXT,
  contact_number TEXT,
  email_address TEXT UNIQUE,
  address TEXT,
  barangay TEXT,
  civil_status TEXT,
  nationality TEXT,
  education TEXT,
  course TEXT,
  school TEXT,
  account_status TEXT DEFAULT 'Active',
  date_registered TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Work Experience
CREATE TABLE public.applicant_experience (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
  company TEXT,
  position TEXT,
  years TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Resumes
CREATE TABLE public.resumes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
  file_path TEXT,
  hard_skills TEXT[] DEFAULT '{}'::text[],
  soft_skills TEXT[] DEFAULT '{}'::text[],
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Applications
CREATE TABLE public.applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_listings(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Registered',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Status History
CREATE TABLE public.status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  remarks TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Referrals
CREATE TABLE public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE UNIQUE,
  referral_number TEXT UNIQUE NOT NULL,
  date_issued TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signatory_name TEXT,
  recipient_name TEXT,
  recipient_address TEXT
);

-- 10. Job Matches
CREATE TABLE public.job_matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_listings(id) ON DELETE CASCADE,
  hard_skill_score NUMERIC,
  soft_skill_score NUMERIC,
  education_score NUMERIC,
  final_match_score NUMERIC,
  matched_hard_skills TEXT[] DEFAULT '{}'::text[],
  missing_hard_skills TEXT[] DEFAULT '{}'::text[],
  matched_soft_skills TEXT[] DEFAULT '{}'::text[],
  missing_soft_skills TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (applicant_id, job_id)
);

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('resumes', 'resumes', false),
  ('referral-slips', 'referral-slips', true)
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- API PERMISSIONS / GRANTS (MUST BE AFTER TABLES ARE CREATED)
-- =====================================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
