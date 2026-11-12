-- PESOLUTION-LIPA-V3 clean baseline
-- Target: a new, empty Supabase project only.
-- This file creates application tables, RLS, helper functions, and Storage buckets.
-- It does not create Auth users or sample applicant records.

begin;

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

create table public.hired_application_feedback (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  feedback_text text check (feedback_text is null or length(trim(feedback_text)) between 10 and 4000),
  congratulations_acknowledged_at timestamptz,
  invitation_dismissed_at timestamptz,
  submitted_at timestamptz,
  sentiment_status text not null default 'pending' check (sentiment_status in ('pending','classified','failed')),
  sentiment_label text check (sentiment_label in ('positive','neutral','negative')),
  sentiment_confidence numeric(6,5) check (sentiment_confidence between 0 and 1),
  sentiment_model text,
  sentiment_details jsonb not null default '{}'::jsonb,
  public_story_consent boolean not null default false,
  public_story_consent_at timestamptz,
  public_story_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (submitted_at is null or (rating is not null and feedback_text is not null)),
  check (sentiment_status <> 'classified' or sentiment_label is not null),
  check (not public_story_consent or public_story_consent_at is not null)
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
create index hired_feedback_submitted on public.hired_application_feedback(submitted_at desc) where submitted_at is not null;
create index hired_feedback_public_story on public.hired_application_feedback(submitted_at desc)
  where public_story_consent and submitted_at is not null;
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
alter table public.hired_application_feedback enable row level security;
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
create policy hired_feedback_own_read on public.hired_application_feedback for select to authenticated using (applicant_id = public.my_applicant_id());
create policy hired_feedback_admin_read on public.hired_application_feedback for select to authenticated using (public.is_admin());
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
  "services":[], "announcements":[], "trainingCatalog":[], "testimonials":[], "promotionalMedia":[]
}'::jsonb);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.companies, public.job_listings, public.site_content to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on public.user_storage_cleanup_queue from anon, authenticated;

commit;
