-- PESOLUTION V3.1 clean installation — 2026-11-17
-- NEW EMPTY SUPABASE PROJECT ONLY. Never run on an existing installation.
-- Retired feedback/sentiment/evaluation objects are not created.
-- Incorporates the approved runtime schema through renewal versioning.
-- No Auth users, applicants, reviews or sample company/job records are created.
begin;
do $$ begin
  if to_regclass('public.profiles') is not null then
    raise exception 'Clean-install baseline refused: public.profiles already exists. Use reviewed incremental migrations.';
  end if;
end $$;

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

create sequence if not exists public.admin_number_seq start 1;
create sequence if not exists public.applicant_number_seq start 1;
create sequence if not exists public.company_number_seq start 1;
create sequence if not exists public.job_number_seq start 1;
create sequence if not exists public.referral_number_seq start 1;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'applicant')),
  first_name text not null default '',
  middle_surname text not null default '',
  last_surname text not null default '',
  suffix text not null default '',
  full_name text generated always as (
    trim(first_name || coalesce(' ' || nullif(middle_surname, ''), '') ||
      coalesce(' ' || nullif(last_surname, ''), '') || coalesce(' ' || nullif(suffix, ''), ''))
  ) stored,
  created_at timestamptz not null default now()
);

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  middle_surname text not null default '',
  last_surname text not null default '',
  suffix text not null default '',
  full_name text generated always as (
    trim(first_name || coalesce(' ' || nullif(middle_surname, ''), '') ||
      coalesce(' ' || nullif(last_surname, ''), '') || coalesce(' ' || nullif(suffix, ''), ''))
  ) stored,
  admin_number integer not null default nextval('public.admin_number_seq'),
  account_number text unique,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  company_number integer not null default nextval('public.company_number_seq'),
  name text not null,
  industry text,
  business_type text,
  location text,
  contact_person text,
  contact_role text,
  email text,
  phone text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  date_added timestamptz not null default now()
);

create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_number integer not null default nextval('public.job_number_seq'),
  title text not null,
  location text,
  employment_type text,
  work_setup text,
  industry text,
  vacancies integer not null default 0 check (vacancies >= 0),
  salary_min numeric check (salary_min is null or salary_min >= 0),
  salary_max numeric check (salary_max is null or salary_max >= 0),
  salary_unit text not null default 'month',
  education text,
  hard_skills text[] not null default '{}'::text[],
  soft_skills text[] not null default '{}'::text[],
  description text,
  status text not null default 'Active' check (status in ('Active', 'Closed', 'Inactive')),
  date_posted timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_max >= salary_min)
);

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  applicant_number integer not null default nextval('public.applicant_number_seq'),
  applicant_code text unique,
  first_name text not null default '',
  middle_surname text not null default '',
  last_surname text not null default '',
  suffix text not null default '',
  full_name text generated always as (
    trim(first_name || coalesce(' ' || nullif(middle_surname, ''), '') ||
      coalesce(' ' || nullif(last_surname, ''), '') || coalesce(' ' || nullif(suffix, ''), ''))
  ) stored,
  date_of_birth date,
  gender text,
  contact_number text,
  email_address text not null unique,
  address text,
  barangay text,
  civil_status text,
  nationality text,
  education text,
  course text,
  school text,
  account_status text not null default 'Active' check (account_status in ('Active', 'Inactive', 'Suspended')),
  date_registered timestamptz not null default now()
);

create table public.applicant_experience (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  company text,
  position text,
  years text,
  added_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  file_path text,
  hard_skills text[] not null default '{}'::text[],
  soft_skills text[] not null default '{}'::text[],
  uploaded_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  job_id uuid references public.job_listings(id) on delete set null,
  resume_id uuid references public.resumes(id) on delete set null,
  status text not null default 'Registered',
  created_at timestamptz not null default now(),
  unique (applicant_id, job_id)
);

create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  status text not null,
  remarks text,
  changed_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  referral_sequence integer not null default nextval('public.referral_number_seq'),
  referral_number text not null unique,
  date_issued timestamptz not null default now(),
  signatory_name text,
  recipient_name text,
  recipient_address text
);

create table public.job_matches (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  job_id uuid not null references public.job_listings(id) on delete cascade,
  hard_skill_score numeric check (hard_skill_score between 0 and 100),
  soft_skill_score numeric check (soft_skill_score between 0 and 100),
  education_score numeric check (education_score between 0 and 100),
  final_match_score numeric check (final_match_score between 0 and 100),
  matched_hard_skills text[] not null default '{}'::text[],
  missing_hard_skills text[] not null default '{}'::text[],
  matched_soft_skills text[] not null default '{}'::text[],
  missing_soft_skills text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  unique (applicant_id, job_id)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'Admin',
  type text not null check (type in ('applicant', 'company', 'job', 'referral')),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.site_content (
  id text primary key check (id = 'public'),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.skill_recommendations (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  job_id uuid not null references public.job_listings(id) on delete cascade,
  fingerprint text not null,
  recommendations jsonb not null check (jsonb_typeof(recommendations) = 'array'),
  model text not null,
  generated_at timestamptz not null default now(),
  unique (applicant_id, job_id)
);


create table public.application_email_notifications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  status_history_id uuid not null unique references public.status_history(id) on delete cascade,
  recipient_email text not null,
  application_status text not null,
  subject text not null,
  email_status text not null default 'Not Sent' check (email_status in ('Not Sent','Queued','Sending','Sent','Delivered','Failed','Bounced')),
  provider text not null default 'brevo',
  provider_message_id text,
  sent_by uuid references auth.users(id) on delete set null,
  error_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  check (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create table public.applicant_account_email_notifications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  recipient_email text not null,
  email_kind text not null default 'setup' check (email_kind in ('setup','reset')),
  email_status text not null default 'Sending' check (email_status in ('Sending','Sent','Failed')),
  provider text not null default 'brevo',
  provider_message_id text,
  sent_by uuid references auth.users(id) on delete set null,
  error_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  check (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
create unique index applicant_account_email_one_setup_idx
  on public.applicant_account_email_notifications(applicant_id) where email_kind = 'setup';
create index applicant_account_email_reset_limit_idx
  on public.applicant_account_email_notifications(applicant_id, sent_at desc)
  where email_kind = 'reset' and email_status = 'Sent';

create table public.user_storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  objects jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index status_history_applicant_changed on public.status_history(applicant_id, changed_at desc);
create index applications_applicant_created on public.applications(applicant_id, created_at desc);
create index job_matches_applicant on public.job_matches(applicant_id);
create index activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index application_email_notifications_applicant_idx on public.application_email_notifications(applicant_id, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where profile_id = auth.uid()); $$;

create or replace function public.my_applicant_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.applicants where profile_id = auth.uid() limit 1; $$;

create or replace function public.assign_pesolution_display_code()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'admins' then
    if new.account_number is null then
      new.account_number := 'ADM-' || extract(year from new.created_at)::integer::text || '-' || lpad(new.admin_number::text, 4, '0');
    end if;
  elsif tg_table_name = 'applicants' then
    if new.applicant_code is null then
      new.applicant_code := 'APP-' || extract(year from new.date_registered)::integer::text || '-' || lpad(new.applicant_number::text, 4, '0');
    end if;
  elsif tg_table_name = 'referrals' then
    if new.referral_number is null then
      new.referral_number := 'REF-' || extract(year from new.date_issued)::integer::text || '-' || lpad(new.referral_sequence::text, 4, '0');
    end if;
  end if;
  return new;
end $$;

create trigger assign_admin_display_code before insert on public.admins
for each row execute function public.assign_pesolution_display_code();
create trigger assign_applicant_display_code before insert on public.applicants
for each row execute function public.assign_pesolution_display_code();
create trigger assign_referral_display_code before insert on public.referrals
for each row execute function public.assign_pesolution_display_code();

create or replace function public.replace_applicant_matches(p_applicant_id uuid, p_matches jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Server access required'; end if;
  if jsonb_typeof(p_matches) <> 'array' then raise exception 'Invalid match list'; end if;
  if exists (select 1 from jsonb_array_elements(p_matches) x
    where (x->>'applicant_id')::uuid is distinct from p_applicant_id) then
    raise exception 'Applicant mismatch';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_applicant_id::text));
  delete from public.skill_recommendations where applicant_id = p_applicant_id;
  delete from public.job_matches where applicant_id = p_applicant_id and job_id not in
    (select (x->>'job_id')::uuid from jsonb_array_elements(p_matches) x);
  insert into public.job_matches(applicant_id, job_id, hard_skill_score, soft_skill_score, education_score,
    final_match_score, matched_hard_skills, missing_hard_skills, matched_soft_skills, missing_soft_skills)
  select p_applicant_id, r.job_id, r.hard_skill_score, r.soft_skill_score, r.education_score,
    r.final_match_score, r.matched_hard_skills, r.missing_hard_skills,
    r.matched_soft_skills, r.missing_soft_skills
  from jsonb_populate_recordset(null::public.job_matches, p_matches) r
  on conflict(applicant_id, job_id) do update set
    hard_skill_score = excluded.hard_skill_score,
    soft_skill_score = excluded.soft_skill_score,
    education_score = excluded.education_score,
    final_match_score = excluded.final_match_score,
    matched_hard_skills = excluded.matched_hard_skills,
    missing_hard_skills = excluded.missing_hard_skills,
    matched_soft_skills = excluded.matched_soft_skills,
    missing_soft_skills = excluded.missing_soft_skills,
    created_at = now();
end $$;

create or replace function public.queue_deleted_user_storage()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_objects jsonb;
begin
  select coalesce(jsonb_agg(distinct item), '[]'::jsonb) into v_objects from (
    select jsonb_build_object('bucket','avatars','path',old.id::text || '/profile.png') item
    union all
    select jsonb_build_object('bucket','resumes','path',regexp_replace(r.file_path, '^resumes/', ''))
    from public.applicants a join public.resumes r on r.applicant_id = a.id
    where a.profile_id = old.id and nullif(r.file_path, '') is not null
  ) paths;
  insert into public.user_storage_cleanup_queue(user_id, objects) values (old.id, v_objects);
  return old;
end $$;

create trigger queue_storage_before_auth_user_delete before delete on auth.users
for each row execute function public.queue_deleted_user_storage();

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.companies enable row level security;
alter table public.job_listings enable row level security;
alter table public.applicants enable row level security;
alter table public.applicant_experience enable row level security;
alter table public.resumes enable row level security;
alter table public.applications enable row level security;
alter table public.status_history enable row level security;
alter table public.referrals enable row level security;
alter table public.job_matches enable row level security;
alter table public.activity_logs enable row level security;
alter table public.site_content enable row level security;
alter table public.skill_recommendations enable row level security;
alter table public.application_email_notifications enable row level security;
alter table public.applicant_account_email_notifications enable row level security;
alter table public.user_storage_cleanup_queue enable row level security;

create policy profiles_admin_all on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy admins_admin_all on public.admins for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_select_own on public.admins for select to authenticated using (profile_id = auth.uid());
create policy companies_admin_all on public.companies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy companies_public_read on public.companies for select to anon, authenticated using (status = 'Active');
create policy jobs_admin_all on public.job_listings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy jobs_public_read on public.job_listings for select to anon, authenticated using (status = 'Active');
create policy applicants_admin_all on public.applicants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy applicants_select_own on public.applicants for select to authenticated using (profile_id = auth.uid());
create policy applicants_update_own on public.applicants for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy experience_admin_all on public.applicant_experience for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy experience_select_own on public.applicant_experience for select to authenticated using (applicant_id = public.my_applicant_id());
create policy resumes_admin_all on public.resumes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy resumes_select_own on public.resumes for select to authenticated using (applicant_id = public.my_applicant_id());
create policy applications_admin_all on public.applications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy applications_select_own on public.applications for select to authenticated using (applicant_id = public.my_applicant_id());
create policy applications_request_own on public.applications for insert to authenticated with check (
  applicant_id = public.my_applicant_id() and status = 'Referral Requested' and
  exists (select 1 from public.job_matches m join public.job_listings j on j.id = m.job_id
    where m.applicant_id = applications.applicant_id and m.job_id = applications.job_id and j.status = 'Active'));
create policy status_history_admin_all on public.status_history for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy status_history_select_own on public.status_history for select to authenticated using (applicant_id = public.my_applicant_id());
create policy status_history_request_own on public.status_history for insert to authenticated with check (
  applicant_id = public.my_applicant_id() and status = 'Referral Requested' and
  exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = public.my_applicant_id()));
create policy referrals_admin_all on public.referrals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy referrals_select_own on public.referrals for select to authenticated using (
  exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = public.my_applicant_id()));
create policy matches_admin_all on public.job_matches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy matches_select_own on public.job_matches for select to authenticated using (applicant_id = public.my_applicant_id());
create policy activity_admin_select on public.activity_logs for select to authenticated using (public.is_admin());
create policy activity_admin_insert on public.activity_logs for insert to authenticated with check (public.is_admin());
create policy site_content_public_read on public.site_content for select to anon, authenticated using (published or public.is_admin());
create policy site_content_admin on public.site_content for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy recommendations_owner_read on public.skill_recommendations for select to authenticated using (public.is_admin() or applicant_id = public.my_applicant_id());
create policy status_email_admin_select on public.application_email_notifications for select to authenticated using (public.is_admin());
create policy status_email_admin_insert on public.application_email_notifications for insert to authenticated with check (public.is_admin());
create policy status_email_admin_update on public.application_email_notifications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy account_email_admin_select on public.applicant_account_email_notifications for select to authenticated using (public.is_admin());
create policy account_email_admin_insert on public.applicant_account_email_notifications for insert to authenticated with check (public.is_admin());
create policy account_email_admin_update on public.applicant_account_email_notifications for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on function public.replace_applicant_matches(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_applicant_matches(uuid, jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('resumes', 'resumes', false, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('referral-slips', 'referral-slips', false, 10485760, array['application/pdf']),
  ('promotional-media', 'promotional-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy peso_avatar_public_read on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars','promotional-media'));
create policy peso_private_document_read on storage.objects for select to authenticated
  using (bucket_id in ('resumes','referral-slips') and
    (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy peso_admin_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','resumes','referral-slips','promotional-media') and public.is_admin());
create policy peso_admin_storage_update on storage.objects for update to authenticated
  using (bucket_id in ('avatars','resumes','referral-slips','promotional-media') and public.is_admin())
  with check (bucket_id in ('avatars','resumes','referral-slips','promotional-media') and public.is_admin());
create policy peso_admin_storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','resumes','referral-slips','promotional-media') and public.is_admin());

insert into public.site_content(id, published, content) values ('public', true, '{
  "title":"PESO Lipa City",
  "tagline":"OPORTUNIDAD PARA SA BAWAT LIPENO",
  "description":"Public Employment Service Office of Lipa City. Walk-in applicant registration and employment assistance at the Trabaho Center.",
  "address":"TRABAHO CENTER, Lipa City Hall, Bulacnin, Lipa City",
  "telephone":"(043) 276-9654",
  "email":"lipacitypeso@yahoo.com",
  "officeHours":"Monday to Thursday, 7:00 AM - 6:00 PM",
  "facebookLabel":"Lipa City PESO - Public Employment Service Office",
  "facebookUrl":"",
  "sourceLabel":"PESO contact information supplied by the project client",
  "sourceUrl":"",
  "heroImage":"/new-city-hall-building.jpg",
  "services":[], "announcements":[], "trainingCatalog":[], "promotionalMedia":[]
}'::jsonb);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.companies, public.job_listings, public.site_content to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on public.user_storage_cleanup_queue from anon, authenticated;



-- Integrated source: 20261020_company_logos.sql
-- Company logos: companies.logo_url column, public `company-logos` Storage bucket,
-- and a placeholder monogram logo seeded for every existing company.
-- Safe to run repeatedly (idempotent). Paste into the Supabase SQL Editor.


ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url text;
COMMENT ON COLUMN public.companies.logo_url IS
  'Public Storage URL or data: URI of the company logo; NULL falls back to initials.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS peso_company_logos_public_read ON storage.objects;
CREATE POLICY peso_company_logos_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS peso_company_logos_admin_insert ON storage.objects;
CREATE POLICY peso_company_logos_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND public.is_admin());

DROP POLICY IF EXISTS peso_company_logos_admin_update ON storage.objects;
CREATE POLICY peso_company_logos_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND public.is_admin())
  WITH CHECK (bucket_id = 'company-logos' AND public.is_admin());

DROP POLICY IF EXISTS peso_company_logos_admin_delete ON storage.objects;
CREATE POLICY peso_company_logos_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND public.is_admin());

-- Seed a monogram logo for every company that has none yet. The value is a
-- base64 `data:image/svg+xml` URI built inside Postgres, so no binary upload is
-- required and the logos appear immediately after this runs. Real uploads
-- replace them because the condition only targets NULL logo_url values.
UPDATE public.companies AS c
SET logo_url = s.logo
FROM (
  SELECT
    id,
    'data:image/svg+xml;base64,' || encode(convert_to(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
      || '<rect width="64" height="64" rx="14" fill="#' || tint || '"/>'
      || '<text x="32" y="42" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">'
      || mark || '</text></svg>',
      'utf8'), 'base64') AS logo
  FROM (
    SELECT
      id,
      upper(
        coalesce(left(split_part(regexp_replace(trim(name), '\s+', ' ', 'g'), ' ', 1), 1), '')
        || coalesce(left(split_part(regexp_replace(trim(name), '\s+', ' ', 'g'), ' ', 2), 1), '')
      ) AS mark,
      (ARRAY['b91c1c', '1d4ed8', '047857', '7c2d12', '4338ca', '0e7490'])[1 + (('x' || substr(md5(id::text), 1, 2))::bit(8)::int % 6)] AS tint
    FROM public.companies
    WHERE logo_url IS NULL AND name IS NOT NULL AND btrim(name) <> ''
  ) AS picked
) AS s
WHERE c.id = s.id;



-- Integrated source: 20261021_website_service_photos.sql
-- Merge promotional media into the Services list on the public website content.
-- Run once in the Supabase SQL Editor. Idempotent: already-folded rows have an empty
-- promotionalMedia array, so they are skipped.


with folded as (
  select
    sc.id as site_id,
    jsonb_agg(jsonb_build_object(
      'id', 'media-' || coalesce(nullif(trim(m ->> 'id'), ''), ord::text),
      'title', coalesce(nullif(trim(m ->> 'title'), ''), 'PESO Program'),
      'description', coalesce(nullif(trim(m ->> 'caption'), ''), ''),
      'imageUrl', trim(coalesce(m ->> 'imageUrl', ''))
    ) order by ord) as items
  from public.site_content as sc
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(sc.content -> 'promotionalMedia') = 'array'
         then sc.content -> 'promotionalMedia' else '[]'::jsonb end
  ) with ordinality as t(m, ord)
  where btrim(coalesce(m ->> 'imageUrl', '')) <> ''
  group by sc.id
)
update public.site_content as sc
set content = jsonb_set(
      jsonb_set(
        sc.content,
        '{services}',
        coalesce(sc.content -> 'services', '[]'::jsonb) || f.items,
        true
      ),
      '{promotionalMedia}',
      '[]'::jsonb,
      true
    ),
    updated_at = now()
from folded as f
where sc.id = f.site_id;

-- Ensure the key exists as an empty array so older readers never hit a missing field,
-- and drop any leftover entries (they had no image, so they were never displayed).
update public.site_content
set content = jsonb_set(content, '{promotionalMedia}', '[]'::jsonb, true),
    updated_at = now()
where jsonb_typeof(content -> 'promotionalMedia') = 'array'
  and jsonb_array_length(content -> 'promotionalMedia') > 0;

update public.site_content
set content = jsonb_set(content, '{promotionalMedia}', '[]'::jsonb, true)
where not (content ? 'promotionalMedia');


select id, published,
       jsonb_array_length(content -> 'services') as services,
       content ->> 'promotionalMedia' as promotional_media
from public.site_content;


-- Integrated source: 20261022_applicant_password_changed_at.sql
-- Track when an applicant replaces the initial password printed on their walk-in account
-- receipt, so the portal can keep reminding them until they do.
-- Run once in the Supabase SQL Editor. Idempotent.


alter table public.applicants add column if not exists password_changed_at timestamptz;

comment on column public.applicants.password_changed_at is
  'Set by the applicant portal when they change their own password; null means the initial password from the account receipt is still in use.';


select count(*) as applicants_missing_password_change
from public.applicants
where password_changed_at is null;


-- Integrated source: 20261023_applicant_account_receipts.sql
-- Account receipt history: when an applicant's portal login credentials were handed over,
-- plus the initial password that was printed on that receipt so PESO can reprint it later.
-- Admin-only (RLS below); the applicant's own sign-in still uses the Supabase Auth hash.
-- Run once in the Supabase SQL Editor. Idempotent.


create table if not exists public.applicant_account_receipts (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  action text not null,
  staff_id uuid,
  initial_password text,
  created_at timestamptz not null default now()
);

alter table public.applicant_account_receipts
  add column if not exists initial_password text;

comment on column public.applicant_account_receipts.action is
  'issued = walk-in registration handover. One row per printed credential hand-off.';
comment on column public.applicant_account_receipts.initial_password is
  'The initial password printed on the receipt, kept so the receipt can be re-displayed and reprinted. Clear it once the applicant changes their own password.';

create index if not exists applicant_account_receipts_applicant_idx
  on public.applicant_account_receipts (applicant_id, created_at desc);

alter table public.applicant_account_receipts enable row level security;

drop policy if exists applicant_account_receipts_admin_all on public.applicant_account_receipts;
create policy applicant_account_receipts_admin_all on public.applicant_account_receipts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


select count(*) as receipt_events from public.applicant_account_receipts;


-- Integrated source: 20261024_receipt_serial_number.sql
-- Every printed account receipt gets its own serial number (RCT-YYYY-NNNN) so PESO can point
-- at one specific credential hand-over. Run once in the Supabase SQL Editor. Idempotent.


create sequence if not exists public.applicant_account_receipt_serial_seq;

alter table public.applicant_account_receipts
  add column if not exists serial_number text;

-- Number the receipts already on file oldest first so the order matches when they were issued.
do $$
declare receipt record;
begin
  for receipt in
    select id, created_at from public.applicant_account_receipts
    where serial_number is null order by created_at
  loop
    update public.applicant_account_receipts
      set serial_number = 'RCT-' || to_char(receipt.created_at, 'YYYY') || '-'
        || lpad(nextval('public.applicant_account_receipt_serial_seq')::text, 4, '0')
      where id = receipt.id;
  end loop;
end $$;

alter table public.applicant_account_receipts
  alter column serial_number set not null;

create unique index if not exists applicant_account_receipt_serial_idx
  on public.applicant_account_receipts (serial_number);

create or replace function public.next_account_receipt_serial()
returns text language sql volatile as $$
  select 'RCT-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('public.applicant_account_receipt_serial_seq')::text, 4, '0');
$$;

alter table public.applicant_account_receipts
  alter column serial_number set default public.next_account_receipt_serial();

comment on column public.applicant_account_receipts.serial_number is
  'Printed receipt number RCT-YYYY-NNNN, unique per credential hand-over.';


select serial_number, action, created_at from public.applicant_account_receipts order by created_at;


-- Integrated source: 20261025_password_change_weekly_limit.sql
-- Self-service password changes are capped at 3 per rolling week per applicant, so the
-- credential stays something they actively keep track of. Run once in the SQL Editor. Idempotent.


create table if not exists public.applicant_password_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  changed_at timestamptz not null default now()
);

create index if not exists applicant_password_changes_profile_idx
  on public.applicant_password_changes (profile_id, changed_at desc);

alter table public.applicant_password_changes enable row level security;

drop policy if exists applicant_password_changes_read_own on public.applicant_password_changes;
create policy applicant_password_changes_read_own on public.applicant_password_changes
  for select to authenticated using (profile_id = auth.uid());

-- How many of this week's changes the signed-in applicant has already used.
create or replace function public.applicant_password_change_allowance()
returns table (used_this_week integer, limit_per_week integer, remaining integer)
language sql stable security definer set search_path = public as $$
  select count(*)::integer, 3, greatest(3 - count(*)::integer, 0)
  from public.applicant_password_changes
  where profile_id = auth.uid() and changed_at > now() - interval '7 days';
$$;

-- Consumes one allowance, records the change on the applicant profile, and drops the printed
-- initial password from every receipt of that applicant in one step.
create or replace function public.record_applicant_password_change()
returns table (accepted boolean, used_this_week integer)
language plpgsql volatile security definer set search_path = public as $$
declare
  used integer;
  applicant uuid;
begin
  select count(*) into used
    from public.applicant_password_changes
    where profile_id = auth.uid() and changed_at > now() - interval '7 days';
  if used >= 3 then
    return query select false, used;
    return;
  end if;
  insert into public.applicant_password_changes (profile_id) values (auth.uid());
  update public.applicants set password_changed_at = now() where profile_id = auth.uid();
  -- The printed copy is only useful while it is still the live credential.
  select id into applicant from public.applicants where profile_id = auth.uid();
  if applicant is not null then
    update public.applicant_account_receipts set initial_password = null where applicant_id = applicant;
  end if;
  return query select true, used + 1;
end $$;

grant execute on function public.applicant_password_change_allowance() to authenticated;
grant execute on function public.record_applicant_password_change() to authenticated;

-- Apply the new rule to receipts already on file: a printed password the applicant has
-- replaced is no longer a credential, so it should not sit in the database.
update public.applicant_account_receipts receipt
  set initial_password = null
  from public.applicants applicant
  where receipt.applicant_id = applicant.id
    and applicant.password_changed_at is not null
    and receipt.initial_password is not null;

comment on table public.applicant_password_changes is
  'Rolling weekly history of applicant self-service password changes; drives the 3-per-week limit.';
comment on function public.record_applicant_password_change() is
  'Consumes one of the applicant''s 3 weekly password changes, stamps applicants.password_changed_at, and clears the sealed initial password kept on their account receipts.';


select count(*) as recorded_password_changes from public.applicant_password_changes;


-- Integrated source: 20261026_first_login_password_gate.sql
-- First-login password change, enforced by the database instead of only by the portal.
--
-- Needs these already applied: 20261022_applicant_password_changed_at.sql,
-- 20261023_applicant_account_receipts.sql and 20261025_password_change_weekly_limit.sql.
-- Nothing here removes a column, a row or a receipt: applicants.password_changed_at keeps the
-- values it already holds, and applicant_account_receipts.initial_password keeps its legacy rows.
--
-- 1. A password change is only real when the backend proves it. POST /api/applicant/password-change
--    verifies the current password against Supabase Authentication, applies the new one, and only
--    then writes applicant_password_changes and stamps applicants.password_changed_at with the
--    service role key. The old client-callable record_applicant_password_change() proved nothing,
--    so an applicant could stamp themselves as changed without touching their password; it is
--    revoked from browser roles below, and the trigger in point 2 blocks it as well.
-- 2. The stamp itself is protected by a BEFORE UPDATE trigger, not by an RLS expression. A policy
--    WITH CHECK compares the candidate row against a lookup by auth.uid() rather than against the
--    row being written, and it can be satisfied by a payload that simply omits the column, while a
--    column-level REVOKE cannot beat the table-level UPDATE grant the role already holds. The
--    trigger refuses any API request that moves the stamp unless its JWT claim role is
--    service_role, so PATCH, upsert and RPC all arrive at the same wall, and the only writer left
--    is the backend after GoTrue has accepted the current password.
-- 3. Until a real change exists, an applicant cannot write the rows that move a referral forward
--    (applications / status_history). Signing in, browsing and profile editing stay open.
--
-- The probe block runs all four guard decisions against the live table inside a savepoint and
-- rolls every probe write back, so the paste either installs a working guard or aborts with
-- nothing changed. It takes row locks on one applicant for a few milliseconds: paste it when the
-- office is not registering somebody at the same moment.


-- True once the applicant has replaced the password printed on their account receipt.
create or replace function public.applicant_password_change_recorded()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applicants a
                 where a.profile_id = auth.uid() and a.password_changed_at is not null);
$$;

revoke execute on function public.applicant_password_change_recorded() from anon, public;
grant execute on function public.applicant_password_change_recorded() to authenticated;

-- Superseded by the trigger below; only the earlier draft of this file needed it.
drop function if exists public.my_password_changed_at();

-- The 20261025 record_applicant_password_change() RPC stamps a change with no proof of the old
-- password, so it must not stay reachable from a browser. The service role keeps it for repair
-- work; the backend never calls it, it writes the history row itself after GoTrue accepts the
-- current password.
revoke execute on function public.record_applicant_password_change() from anon, authenticated, public;

-- Hard guard on applicants.password_changed_at. A BEFORE UPDATE trigger fires before the policy's
-- WITH CHECK is evaluated, so neither a permissive policy nor a payload that omits the column can
-- talk past it, and it applies to every row an API request reaches, admin rows included.
create or replace function public.guard_applicants_password_changed_at()
returns trigger language plpgsql set search_path = public as $$
declare
  claims text := current_setting('request.jwt.claims', true);
begin
  if new.password_changed_at is not distinct from old.password_changed_at then
    return new;   -- the stamp is not being moved, so there is nothing to guard
  end if;

  -- Every PostgREST request carries a JWT claim set: anon for a bare key, authenticated for a
  -- signed-in browser, service_role for the backend. Anything else that has claims is refused, so
  -- a claim set with a missing role still fails closed, and malformed JSON cannot write either.
  if claims is not null and claims <> '' then
    if coalesce(claims::jsonb ->> 'role', '') <> 'service_role' then
      raise exception 'applicants.password_changed_at is recorded by the portal only, after it verifies the current password.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- No claims at all means a direct database session: the SQL Editor, psql, a restore. Such a
  -- session can already disable any trigger, so it is the trust root rather than an attack path,
  -- and refusing it would only remove staff's repair route.
  return new;
end $$;

revoke execute on function public.guard_applicants_password_changed_at() from anon, authenticated, public;

drop trigger if exists applicants_password_changed_at_guard on public.applicants;
create trigger applicants_password_changed_at_guard
  before update on public.applicants
  for each row execute function public.guard_applicants_password_changed_at();

-- Refuse an applicant-shaped request, allow the same request to edit ordinary profile columns,
-- let the backend's service role record the stamp, and keep a direct session's repair access.
savepoint guard_probe;

do $$
declare
  target uuid;
  probe_stamp timestamptz := date_trunc('microseconds', now()) + interval '1 hour';
  refused boolean := false;
begin
  select id into target from public.applicants order by id limit 1;
  if target is null then
    raise notice 'stamp guard probe skipped: this environment has no applicant rows';
    return;
  end if;

  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  begin
    update public.applicants set password_changed_at = probe_stamp where id = target;
  exception when insufficient_privilege then
    refused := true;
  end;
  if not refused then
    raise exception 'stamp guard probe failed: an authenticated request was allowed to set password_changed_at';
  end if;

  update public.applicants set barangay = barangay where id = target;

  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.applicants set password_changed_at = probe_stamp where id = target;
  if (select password_changed_at from public.applicants where id = target) is distinct from probe_stamp then
    raise exception 'stamp guard probe failed: the service role could not record the stamp';
  end if;

  perform set_config('request.jwt.claims', '', true);
  update public.applicants set password_changed_at = null where id = target;
end $$;

-- Every probe write and every probe claim is discarded here.
rollback to savepoint guard_probe;

-- The self-service profile update keeps the baseline rule unchanged; the stamp is guarded above.
drop policy if exists applicants_update_own on public.applicants;
create policy applicants_update_own on public.applicants
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Referral requests may only be raised by an applicant who holds a private password. The baseline
-- conditions are untouched, and admins still write through applications_admin_all /
-- status_history_admin_all, because policies of the same kind are combined with OR.
drop policy if exists applications_request_own on public.applications;
create policy applications_request_own on public.applications for insert to authenticated with check (
  applicant_id = public.my_applicant_id() and status = 'Referral Requested'
  and public.applicant_password_change_recorded()
  and exists (select 1 from public.job_matches m join public.job_listings j on j.id = m.job_id
    where m.applicant_id = applications.applicant_id and m.job_id = applications.job_id and j.status = 'Active'));

drop policy if exists status_history_request_own on public.status_history;
create policy status_history_request_own on public.status_history for insert to authenticated with check (
  applicant_id = public.my_applicant_id() and status = 'Referral Requested'
  and public.applicant_password_change_recorded()
  and exists (select 1 from public.applications a
    where a.id = application_id and a.applicant_id = public.my_applicant_id()));

-- Kept only for rows written before passwords stopped being stored; nothing new is written here.
comment on column public.applicant_account_receipts.initial_password is
  'Deprecated. Initial passwords are generated, printed once, and never stored. This column is no longer written; it holds only legacy rows and is cleared as historical data.';


-- Expect: applicants_awaiting_own_password unchanged from before the paste (4 on the connected
-- project), one guard trigger, and no password_changed_at value that moved during the probe.
select tgname as guard_trigger from pg_trigger
where tgrelid = 'public.applicants'::regclass and not tgisinternal;
select count(*) as applicants_awaiting_own_password
from public.applicants where password_changed_at is null;

-- Rollback restores the pre-migration state exactly. Run it only if the gate has to come down,
-- and only after the backend that verifies passwords through GoTrue is no longer live.
-- begin;
-- drop trigger if exists applicants_password_changed_at_guard on public.applicants;
-- drop function if exists public.guard_applicants_password_changed_at();
-- drop function if exists public.applicant_password_change_recorded();
-- grant execute on function public.record_applicant_password_change() to authenticated;
-- drop policy if exists applicants_update_own on public.applicants;
-- create policy applicants_update_own on public.applicants
--   for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
-- drop policy if exists applications_request_own on public.applications;
-- create policy applications_request_own on public.applications for insert to authenticated with check (
--   applicant_id = public.my_applicant_id() and status = 'Referral Requested' and
--   exists (select 1 from public.job_matches m join public.job_listings j on j.id = m.job_id
--     where m.applicant_id = applications.applicant_id and m.job_id = applications.job_id and j.status = 'Active'));
-- drop policy if exists status_history_request_own on public.status_history;
-- create policy status_history_request_own on public.status_history for insert to authenticated with check (
--   applicant_id = public.my_applicant_id() and status = 'Referral Requested' and
--   exists (select 1 from public.applications a
--     where a.id = application_id and a.applicant_id = public.my_applicant_id()));
-- commit;


-- Integrated source: 20261114_referral_safeguards.sql
-- Batch 1: transactional referral actions. Prepare/review locally; do not run against production automatically.
-- No table/column changes, record deletion, or historical status rewriting.

create or replace function public.manage_peso_referral(
  p_action text, p_staff_id uuid, p_applicant_id uuid default null, p_job_id uuid default null,
  p_referral_id uuid default null, p_application_id uuid default null,
  p_fields jsonb default '{}'::jsonb, p_reason text default ''
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.applications%rowtype;
  j public.job_listings%rowtype;
  r public.referrals%rowtype;
  target_status text;
  staff_actor text;
  note text;
begin
  if coalesce(auth.role(), '') <> 'service_role' or not exists (
    select 1 from public.admins where profile_id = p_staff_id
  ) then raise exception 'Only authorized PESO staff can manage referrals.' using errcode = '42501'; end if;
  if p_action not in ('issue','edit','cancel','hire','not-hired','decline') then raise exception 'Invalid referral action.'; end if;
  if p_referral_id is not null then
    select * into r from public.referrals where id = p_referral_id;
    if not found then raise exception 'Referral not found.'; end if;
    p_application_id := r.application_id;
  end if;
  if p_application_id is not null then
    select applicant_id, job_id into p_applicant_id, p_job_id from public.applications where id = p_application_id;
  end if;
  if p_applicant_id is null or p_job_id is null then raise exception 'Applicant and job are required.'; end if;
  -- Serialize all referral actions for this applicant, then lock the vacancy for capacity changes.
  perform 1 from public.applicants where id = p_applicant_id for update;
  if not found then raise exception 'Applicant not found.'; end if;
  select * into j from public.job_listings where id = p_job_id for update;
  if not found then raise exception 'Job vacancy not found.'; end if;
  if (select count(*) from public.applications where applicant_id = p_applicant_id and job_id = p_job_id) > 1 then
    raise exception 'Multiple legacy applications require staff review; no records were changed.';
  end if;
  select * into a from public.applications where applicant_id = p_applicant_id and job_id = p_job_id for update;
  if a.id is null then
    if p_action <> 'issue' then raise exception 'Application not found.'; end if;
    insert into public.applications(applicant_id, job_id, status) values(p_applicant_id, p_job_id, 'Matched') returning * into a;
  end if;
  select * into r from public.referrals where application_id = a.id;
  if p_action = 'issue' then
    if r.id is not null and a.status = 'Referred' then return to_jsonb(r) || jsonb_build_object('status', a.status, 'vacancies', j.vacancies); end if;
    if j.status <> 'Active' or coalesce(j.vacancies, 0) <= 0 then raise exception 'Closed, inactive, or filled vacancies cannot receive new referrals.'; end if;
    if (r.id is not null and a.status not in ('Matched','Referral Requested')) or a.status in ('Hired','Not Hired') then raise exception 'This referral is closed. Review its history before any further processing.'; end if;
    if exists(select 1 from public.applications where applicant_id = p_applicant_id and status = 'Hired') then raise exception 'Applicant is already recorded as hired.'; end if;
    if r.id is null then
      insert into public.referrals(application_id) values(a.id) returning * into r;
    end if;
    target_status := 'Referred'; note := 'Official referral issued';
  elsif p_action = 'edit' then
    if r.id is null or a.status <> 'Referred' then raise exception 'Only an active issued referral can be edited.'; end if;
    target_status := a.status; note := 'Referral slip details edited';
  elsif p_action = 'decline' then
    if a.status = 'Declined' and r.id is null then return jsonb_build_object('status', a.status); end if;
    if a.status <> 'Referral Requested' or r.id is not null then raise exception 'Only a pending legacy referral request can be declined.'; end if;
    target_status := 'Declined'; note := 'Referral request declined';
  else
    target_status := case p_action when 'hire' then 'Hired' when 'not-hired' then 'Not Hired' else 'Declined' end;
    if r.id is null then raise exception 'An issued referral is required before recording this action.'; end if;
    if a.status = target_status then return to_jsonb(r) || jsonb_build_object('status', a.status, 'vacancies', j.vacancies); end if;
    if a.status <> 'Referred' then raise exception 'Only an active referral can receive this action.'; end if;
    if p_action = 'hire' then
      if coalesce(j.vacancies, 0) <= 0 then raise exception 'No vacancy remains; review the job capacity before confirming hire.'; end if;
      if exists(select 1 from public.applications where applicant_id = p_applicant_id and status = 'Hired') then raise exception 'Applicant is already recorded as hired.'; end if;
      update public.job_listings set vacancies = vacancies - 1 where id = j.id returning * into j;
    end if;
    note := case p_action when 'cancel' then 'Referral cancelled (record retained)' when 'hire' then 'Employment outcome: Hired' else 'Employment outcome: Not Hired; applicant remains eligible for matching' end;
  end if;
  if p_action in ('issue','edit') then
    update public.referrals set
      date_issued = case when p_fields ? 'date_issued' then (p_fields->>'date_issued')::timestamptz else date_issued end,
      signatory_name = case when p_fields ? 'signatory_name' then p_fields->>'signatory_name' else signatory_name end,
      recipient_name = case when p_fields ? 'recipient_name' then p_fields->>'recipient_name' else recipient_name end,
      recipient_address = case when p_fields ? 'recipient_address' then p_fields->>'recipient_address' else recipient_address end
      where id = r.id returning * into r;
  end if;
  staff_actor := p_staff_id::text;
  note := note || ' | Staff: ' || staff_actor || ' | Previous status: ' || a.status ||
    case when coalesce(p_reason,'') <> '' then ' | Reason: ' || left(p_reason,1000) else '' end;
  if p_action <> 'edit' then
    update public.applications set status = target_status where id = a.id;
    insert into public.status_history(applicant_id, application_id, status, remarks)
      values(a.applicant_id, a.id, target_status, note);
  end if;
  insert into public.activity_logs(actor, type, title, description)
    values(staff_actor, 'referral', case when p_action = 'edit' then 'Referral slip updated' else target_status end,
      note || ' | Application: ' || a.id::text || ' | REF: ' || coalesce(r.referral_number,'not issued'));
  return coalesce(to_jsonb(r), '{}'::jsonb) || jsonb_build_object('status', target_status, 'vacancies', j.vacancies);
end $$;
revoke all on function public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text) to service_role;
-- Remove only applicant request-write policies. Read policies and staff policies remain.
drop policy if exists applications_request_own on public.applications;
drop policy if exists applications_update_request_own on public.applications;
drop policy if exists status_history_request_own on public.status_history;


-- Integrated source: 20261117_applicant_renewal_versions.sql
-- Prepared locally. Additive renewal versioning; do not auto-apply to production.

alter table public.applicants add column if not exists avatar_path text;
create table if not exists public.applicant_renewals (
  id uuid primary key,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  created_by uuid references public.profiles(id) on delete set null,
  staff_name text not null,
  created_at timestamptz not null default clock_timestamp(),
  payload_digest text not null check (payload_digest ~ '^[a-f0-9]{64}$'),
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  changes jsonb not null,
  prior_records jsonb not null,
  unique(applicant_id, version_no)
);
alter table public.applicant_renewals enable row level security;
create policy applicant_renewals_staff_read on public.applicant_renewals
  for select to authenticated using (public.is_admin());
revoke all on public.applicant_renewals from anon, authenticated;
grant select on public.applicant_renewals to authenticated;
grant all on public.applicant_renewals to service_role;

create or replace function public.peso_renewal_snapshot(p_applicant_id uuid)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object('applicant', to_jsonb(a), 'resume', (
    select to_jsonb(r) from public.resumes r where r.applicant_id = a.id
    order by r.uploaded_at desc, r.id desc limit 1
  )) from public.applicants a where a.id = p_applicant_id
$$;
revoke all on function public.peso_renewal_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.peso_renewal_snapshot(uuid) to service_role;

create or replace function public.get_peso_renewal_context(p_applicant_id uuid, p_staff_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare snapshot jsonb; eligible boolean;
begin
  if coalesce(auth.role(),'') <> 'service_role' or not exists(select 1 from public.admins where profile_id = p_staff_id)
    then raise exception 'Only authorized PESO staff can manage renewals.' using errcode = '42501'; end if;
  snapshot := public.peso_renewal_snapshot(p_applicant_id);
  if snapshot is null then raise exception 'Applicant not found.'; end if;
  eligible := exists(select 1 from public.applications where applicant_id=p_applicant_id and status='Hired')
    and not exists(select 1 from public.applications where applicant_id=p_applicant_id and status='Referred');
  return jsonb_build_object('snapshot', snapshot, 'token', md5(snapshot::text), 'eligible', eligible,
    'version', coalesce((select max(version_no) from public.applicant_renewals where applicant_id=p_applicant_id),0));
end $$;
revoke all on function public.get_peso_renewal_context(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_peso_renewal_context(uuid,uuid) to service_role;

-- Differences are based on confirmed text, not semantic guesses or punctuation stripping.
create or replace function public.peso_renewal_changes(p_before jsonb, p_after jsonb)
returns jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare result jsonb := '{}'::jsonb; category text; old_skills jsonb; new_skills jsonb; fields jsonb;
begin
  foreach category in array array['hard_skills','soft_skills'] loop
    old_skills := coalesce(p_before->'resume'->category,'[]'::jsonb);
    new_skills := coalesce(p_after->'resume'->category,'[]'::jsonb);
    result := result || jsonb_build_object(category, jsonb_build_object(
      'added', (select coalesce(jsonb_agg(n.value),'[]'::jsonb) from jsonb_array_elements_text(new_skills) n
        where not exists(select 1 from jsonb_array_elements_text(old_skills) o
          where lower(regexp_replace(trim(o.value),'\s+',' ','g'))=lower(regexp_replace(trim(n.value),'\s+',' ','g')))),
      'removed', (select coalesce(jsonb_agg(o.value),'[]'::jsonb) from jsonb_array_elements_text(old_skills) o
        where not exists(select 1 from jsonb_array_elements_text(new_skills) n
          where lower(regexp_replace(trim(o.value),'\s+',' ','g'))=lower(regexp_replace(trim(n.value),'\s+',' ','g'))))));
  end loop;
  select coalesce(jsonb_object_agg(n.key,jsonb_build_object('before',p_before->'applicant'->n.key,'after',n.value)),'{}'::jsonb)
    into fields from jsonb_each(p_after->'applicant') n
    where n.key in ('first_name','middle_surname','last_surname','suffix','date_of_birth','gender','contact_number','barangay','address','civil_status','nationality','education','course','school')
      and (p_before->'applicant'->n.key) is distinct from n.value;
  return result || jsonb_build_object('fields',fields);
end $$;
revoke all on function public.peso_renewal_changes(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.peso_renewal_changes(jsonb,jsonb) to service_role;

create or replace function public.complete_peso_renewal(
  p_applicant_id uuid, p_staff_id uuid, p_request_id uuid, p_expected_token text,
  p_payload_digest text, p_input jsonb, p_resume_path text,
  p_avatar_path text default null, p_recorded_evidence jsonb default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.applicants%rowtype; previous public.applicant_renewals%rowtype;
  before_value jsonb; after_value jsonb; context jsonb; records jsonb; next_version integer;
  staff_label text; resume_time timestamptz;
begin
  if coalesce(auth.role(),'') <> 'service_role' or not exists(select 1 from public.admins where profile_id=p_staff_id)
    then raise exception 'Only authorized PESO staff can manage renewals.' using errcode='42501'; end if;
  select * into a from public.applicants where id=p_applicant_id for update;
  if not found then raise exception 'Applicant not found.'; end if;
  select * into previous from public.applicant_renewals where id=p_request_id;
  if found then
    if previous.applicant_id<>p_applicant_id or previous.payload_digest<>p_payload_digest
      then raise exception 'This confirmation was already used for different information.'; end if;
    return jsonb_build_object('id', previous.id,'version_no',previous.version_no,'reused',true);
  end if;
  context := public.get_peso_renewal_context(p_applicant_id,p_staff_id);
  if not (context->>'eligible')::boolean then raise exception 'Renewal requires a previous hired record and no active referral.'; end if;
  if context->>'token' is distinct from p_expected_token then raise exception 'The applicant changed while this form was open. Reload and review the latest information.' using errcode='40001'; end if;
  if lower(p_input->>'emailAddress') is distinct from lower(a.email_address)
    then raise exception 'Renewal keeps the existing login email.'; end if;
  if p_resume_path not like 'resumes/'||a.profile_id::text||'/renewal-'||p_request_id::text||'-%'
    then raise exception 'Invalid renewal resume path.'; end if;
  if p_avatar_path is not null and p_avatar_path not like a.profile_id::text||'/renewal-'||p_request_id::text||'-%'
    then raise exception 'Invalid renewal avatar path.'; end if;
  before_value := context->'snapshot';
  next_version := (context->>'version')::integer+1;
  select coalesce(nullif(full_name,''),'PESO Staff') into staff_label from public.profiles where id=p_staff_id;
  -- Archive existing values as observed now. These are not reconstructed issuance-time scores.
  records := jsonb_build_object('observed_at',clock_timestamp(),
    'applications',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.applications x where x.applicant_id=a.id),
    'referrals',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.referrals r join public.applications x on x.id=r.application_id where x.applicant_id=a.id),
    'matches',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from public.job_matches m where m.applicant_id=a.id),
    'recommendations',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from public.skill_recommendations s where s.applicant_id=a.id),
    'jobs',(select coalesce(jsonb_agg(to_jsonb(j)),'[]'::jsonb) from public.job_listings j where j.id in
      (select job_id from public.applications where applicant_id=a.id union select job_id from public.job_matches where applicant_id=a.id)),
    'recorded_nlp_evidence',p_recorded_evidence);
  update public.applicants set first_name=p_input->>'firstName',middle_surname=p_input->>'middleSurname',last_surname=p_input->>'lastSurname',suffix=p_input->>'suffix',
    date_of_birth=(p_input->>'dateOfBirth')::date,gender=p_input->>'gender',contact_number=p_input->>'contactNumber',
    barangay=p_input->>'barangay',address=p_input->>'address',civil_status=p_input->>'civilStatus',nationality=p_input->>'nationality',
    education=p_input->>'education',course=p_input->>'course',school=p_input->>'school',
    avatar_path=coalesce(p_avatar_path,avatar_path),account_status='Active' where id=a.id;
  update public.profiles set first_name=p_input->>'firstName',middle_surname=p_input->>'middleSurname',last_surname=p_input->>'lastSurname',suffix=p_input->>'suffix' where id=a.profile_id;
  resume_time := greatest(clock_timestamp(),coalesce((select max(uploaded_at)+interval '1 microsecond' from public.resumes where applicant_id=a.id),clock_timestamp()));
  insert into public.resumes(applicant_id,file_path,hard_skills,soft_skills,uploaded_at)
    values(a.id,p_resume_path,array(select jsonb_array_elements_text(p_input->'hardSkills')),array(select jsonb_array_elements_text(p_input->'softSkills')),resume_time);
  after_value := public.peso_renewal_snapshot(a.id);
  insert into public.applicant_renewals(id,applicant_id,version_no,created_by,staff_name,payload_digest,before_snapshot,after_snapshot,changes,prior_records)
    values(p_request_id,a.id,next_version,p_staff_id,coalesce(staff_label,'PESO Staff'),p_payload_digest,before_value,after_value,public.peso_renewal_changes(before_value,after_value),records);
  insert into public.status_history(applicant_id,status,remarks) values(a.id,'Renewal','Re-registration confirmed; qualification version '||next_version||'. Previous employment and referrals retained.');
  insert into public.activity_logs(actor,type,title,description) values(p_staff_id::text,'applicant','Application renewed',
    'Re-registration completed for '||trim(concat_ws(' ',p_input->>'firstName',p_input->>'lastSurname'))||'; qualification version '||next_version||'.');
  return jsonb_build_object('id',p_request_id,'version_no',next_version,'reused',false);
end $$;
revoke all on function public.complete_peso_renewal(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.complete_peso_renewal(uuid,uuid,uuid,text,text,jsonb,text,text,jsonb) to service_role;

-- A renewal begins a new search cycle without changing previous Hired outcomes.
create or replace function public.peso_has_current_hire(p_applicant_id uuid)
returns boolean language sql stable set search_path = public, pg_temp as $$
  select exists(select 1 from public.applications a where a.applicant_id=p_applicant_id and a.status='Hired'
    and coalesce((select max(h.changed_at) from public.status_history h where h.application_id=a.id and h.status='Hired'),a.created_at)
      >= coalesce((select max(v.created_at) from public.applicant_renewals v where v.applicant_id=p_applicant_id),'-infinity'::timestamptz))
$$;
revoke all on function public.peso_has_current_hire(uuid) from public, anon, authenticated;
grant execute on function public.peso_has_current_hire(uuid) to service_role;

create or replace function public.manage_peso_referral(
  p_action text, p_staff_id uuid, p_applicant_id uuid default null, p_job_id uuid default null,
  p_referral_id uuid default null, p_application_id uuid default null,
  p_fields jsonb default '{}'::jsonb, p_reason text default ''
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.applications%rowtype;
  j public.job_listings%rowtype;
  r public.referrals%rowtype;
  target_status text;
  staff_actor text;
  note text;
begin
  if coalesce(auth.role(), '') <> 'service_role' or not exists (
    select 1 from public.admins where profile_id = p_staff_id
  ) then raise exception 'Only authorized PESO staff can manage referrals.' using errcode = '42501'; end if;
  if p_action not in ('issue','edit','cancel','hire','not-hired','decline') then raise exception 'Invalid referral action.'; end if;
  if p_referral_id is not null then
    select * into r from public.referrals where id = p_referral_id;
    if not found then raise exception 'Referral not found.'; end if;
    p_application_id := r.application_id;
  end if;
  if p_application_id is not null then
    select applicant_id, job_id into p_applicant_id, p_job_id from public.applications where id = p_application_id;
  end if;
  if p_applicant_id is null or p_job_id is null then raise exception 'Applicant and job are required.'; end if;
  -- Serialize all referral actions for this applicant, then lock the vacancy for capacity changes.
  perform 1 from public.applicants where id = p_applicant_id for update;
  if not found then raise exception 'Applicant not found.'; end if;
  select * into j from public.job_listings where id = p_job_id for update;
  if not found then raise exception 'Job vacancy not found.'; end if;
  if (select count(*) from public.applications where applicant_id = p_applicant_id and job_id = p_job_id) > 1 then
    raise exception 'Multiple legacy applications require staff review; no records were changed.';
  end if;
  select * into a from public.applications where applicant_id = p_applicant_id and job_id = p_job_id for update;
  if a.id is null then
    if p_action <> 'issue' then raise exception 'Application not found.'; end if;
    insert into public.applications(applicant_id, job_id, status) values(p_applicant_id, p_job_id, 'Matched') returning * into a;
  end if;
  select * into r from public.referrals where application_id = a.id;
  if p_action = 'issue' then
    if r.id is not null and a.status = 'Referred' then return to_jsonb(r) || jsonb_build_object('status', a.status, 'vacancies', j.vacancies); end if;
    if j.status <> 'Active' or coalesce(j.vacancies, 0) <= 0 then raise exception 'Closed, inactive, or filled vacancies cannot receive new referrals.'; end if;
    if (r.id is not null and a.status not in ('Matched','Referral Requested')) or a.status in ('Hired','Not Hired') then raise exception 'This referral is closed. Review its history before any further processing.'; end if;
    if public.peso_has_current_hire(p_applicant_id) then raise exception 'Applicant is already recorded as hired.'; end if;
    if r.id is null then
      insert into public.referrals(application_id) values(a.id) returning * into r;
    end if;
    target_status := 'Referred'; note := 'Official referral issued';
  elsif p_action = 'edit' then
    if r.id is null or a.status <> 'Referred' then raise exception 'Only an active issued referral can be edited.'; end if;
    target_status := a.status; note := 'Referral slip details edited';
  elsif p_action = 'decline' then
    if a.status = 'Declined' and r.id is null then return jsonb_build_object('status', a.status); end if;
    if a.status <> 'Referral Requested' or r.id is not null then raise exception 'Only a pending legacy referral request can be declined.'; end if;
    target_status := 'Declined'; note := 'Referral request declined';
  else
    target_status := case p_action when 'hire' then 'Hired' when 'not-hired' then 'Not Hired' else 'Declined' end;
    if r.id is null then raise exception 'An issued referral is required before recording this action.'; end if;
    if a.status = target_status then return to_jsonb(r) || jsonb_build_object('status', a.status, 'vacancies', j.vacancies); end if;
    if a.status <> 'Referred' then raise exception 'Only an active referral can receive this action.'; end if;
    if p_action = 'hire' then
      if coalesce(j.vacancies, 0) <= 0 then raise exception 'No vacancy remains; review the job capacity before confirming hire.'; end if;
      if public.peso_has_current_hire(p_applicant_id) then raise exception 'Applicant is already recorded as hired.'; end if;
      update public.job_listings set vacancies = vacancies - 1 where id = j.id returning * into j;
    end if;
    note := case p_action when 'cancel' then 'Referral cancelled (record retained)' when 'hire' then 'Employment outcome: Hired' else 'Employment outcome: Not Hired; applicant remains eligible for matching' end;
  end if;
  if p_action in ('issue','edit') then
    update public.referrals set
      date_issued = case when p_fields ? 'date_issued' then (p_fields->>'date_issued')::timestamptz else date_issued end,
      signatory_name = case when p_fields ? 'signatory_name' then p_fields->>'signatory_name' else signatory_name end,
      recipient_name = case when p_fields ? 'recipient_name' then p_fields->>'recipient_name' else recipient_name end,
      recipient_address = case when p_fields ? 'recipient_address' then p_fields->>'recipient_address' else recipient_address end
      where id = r.id returning * into r;
  end if;
  staff_actor := p_staff_id::text;
  note := note || ' | Staff: ' || staff_actor || ' | Previous status: ' || a.status ||
    case when coalesce(p_reason,'') <> '' then ' | Reason: ' || left(p_reason,1000) else '' end;
  if p_action <> 'edit' then
    update public.applications set status = target_status where id = a.id;
    insert into public.status_history(applicant_id, application_id, status, remarks)
      values(a.applicant_id, a.id, target_status, note);
  end if;
  insert into public.activity_logs(actor, type, title, description)
    values(staff_actor, 'referral', case when p_action = 'edit' then 'Referral slip updated' else target_status end,
      note || ' | Application: ' || a.id::text || ' | REF: ' || coalesce(r.referral_number,'not issued'));
  return coalesce(to_jsonb(r), '{}'::jsonb) || jsonb_build_object('status', target_status, 'vacancies', j.vacancies);
end $$;
revoke all on function public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text) to service_role;


-- Company referral email audit (2026-11-24).
-- Additive: run once against an existing installation after the clean baseline.
CREATE TABLE IF NOT EXISTS public.company_referral_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL UNIQUE REFERENCES public.referrals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL CHECK (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  subject TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  attachment_sha256 TEXT NOT NULL,
  email_status TEXT NOT NULL CHECK (email_status IN ('Sending', 'Sent', 'Failed', 'Unknown')),
  provider_message_id TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
ALTER TABLE public.company_referral_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_referral_emails FROM anon, authenticated;
GRANT ALL ON public.company_referral_emails TO service_role;
COMMENT ON TABLE public.company_referral_emails IS 'Backend-only employer referral email receipts. Sent means provider acceptance, not guaranteed delivery. Unknown requires provider reconciliation before resend.';

-- Quiet matching Realtime subscriptions (2026-11-24).
-- Publish the tables used by the matching page's existing quiet Realtime listener.
-- Idempotent; no applicant records, matches or statuses are changed.
DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication is not present; configure Supabase Realtime before expecting live updates.';
    RETURN;
  END IF;
  FOREACH table_name IN ARRAY ARRAY['applicants','applications','referrals','job_matches','job_listings','resumes','status_history'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;

-- One active referral per applicant.
-- Enforce one active (Referred) application per applicant without deleting legacy records.
-- Existing duplicates are retained for staff review; additional referrals are blocked.
CREATE OR REPLACE FUNCTION public.peso_one_active_referral()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status <> 'Referred' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'Referred' AND OLD.applicant_id = NEW.applicant_id THEN RETURN NEW; END IF;
  END IF;
  -- All referral RPCs use this same applicant lock, serializing simultaneous issuance.
  PERFORM 1 FROM public.applicants WHERE id = NEW.applicant_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.applications a
    WHERE a.applicant_id = NEW.applicant_id AND a.status = 'Referred' AND a.id <> NEW.id) THEN
    RAISE EXCEPTION 'Only one active referral is allowed per applicant. Record its outcome or cancel it before issuing another.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS peso_one_active_referral ON public.applications;
CREATE TRIGGER peso_one_active_referral BEFORE INSERT OR UPDATE OF status, applicant_id ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.peso_one_active_referral();
REVOKE ALL ON FUNCTION public.peso_one_active_referral() FROM PUBLIC, anon, authenticated;

-- Require confirmed renewal after hiring.
-- Apply after renewal versioning and the one-active-referral migration.
-- Keep historical slips accessible; block new referrals until a real renewal is confirmed.
CREATE OR REPLACE FUNCTION public.peso_one_active_referral()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status <> 'Referred' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'Referred' AND OLD.applicant_id = NEW.applicant_id THEN RETURN NEW; END IF;
  END IF;
  PERFORM 1 FROM public.applicants WHERE id = NEW.applicant_id FOR UPDATE;
  IF public.peso_has_current_hire(NEW.applicant_id) THEN
    RAISE EXCEPTION 'Applicant is already Hired. Complete applicant renewal before issuing another referral.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.applications a
    WHERE a.applicant_id = NEW.applicant_id AND a.status = 'Referred' AND a.id <> NEW.id) THEN
    RAISE EXCEPTION 'Only one active referral is allowed per applicant. Record its outcome or cancel it before issuing another.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.peso_one_active_referral() FROM PUBLIC, anon, authenticated;

commit;
