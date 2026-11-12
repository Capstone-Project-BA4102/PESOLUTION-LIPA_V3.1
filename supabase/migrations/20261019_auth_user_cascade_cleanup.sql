-- Keep public portal data aligned with Supabase Auth deletions.
-- This migration is non-destructive until an Auth user is explicitly deleted.

create table if not exists public.user_storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  objects jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.user_storage_cleanup_queue enable row level security;
revoke all on public.user_storage_cleanup_queue from anon, authenticated;

-- Capture Storage paths before the profile/applicant cascade removes their rows.
create or replace function public.queue_deleted_user_storage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objects jsonb;
begin
  select coalesce(jsonb_agg(distinct item), '[]'::jsonb)
    into v_objects
  from (
    select jsonb_build_object('bucket', 'avatars', 'path', old.id::text || '/profile.png') as item
    union all
    select jsonb_build_object(
      'bucket', 'resumes',
      'path', regexp_replace(r.file_path, '^resumes/', '')
    )
    from public.applicants a
    join public.resumes r on r.applicant_id = a.id
    where a.profile_id = old.id and nullif(r.file_path, '') is not null
  ) paths;

  insert into public.user_storage_cleanup_queue (user_id, objects)
  values (old.id, v_objects);
  return old;
end;
$$;

drop trigger if exists queue_storage_before_auth_user_delete on auth.users;
create trigger queue_storage_before_auth_user_delete
before delete on auth.users
for each row execute function public.queue_deleted_user_storage();

-- profiles.id is the ownership root for both admins and applicants.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

alter table public.admins drop constraint if exists admins_profile_id_fkey;
alter table public.admins
  add constraint admins_profile_id_fkey foreign key (profile_id) references public.profiles(id) on delete cascade;

alter table public.applicants drop constraint if exists applicants_profile_id_fkey;
alter table public.applicants
  add constraint applicants_profile_id_fkey foreign key (profile_id) references public.profiles(id) on delete cascade;

-- Applicant-owned records.
alter table public.applicant_experience drop constraint if exists applicant_experience_applicant_id_fkey;
alter table public.applicant_experience add constraint applicant_experience_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.resumes drop constraint if exists resumes_applicant_id_fkey;
alter table public.resumes add constraint resumes_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.applications drop constraint if exists applications_applicant_id_fkey;
alter table public.applications add constraint applications_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.job_matches drop constraint if exists job_matches_applicant_id_fkey;
alter table public.job_matches add constraint job_matches_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.status_history drop constraint if exists status_history_applicant_id_fkey;
alter table public.status_history add constraint status_history_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.skill_recommendations drop constraint if exists skill_recommendations_applicant_id_fkey;
alter table public.skill_recommendations add constraint skill_recommendations_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.hired_application_feedback drop constraint if exists hired_application_feedback_applicant_id_fkey;
alter table public.hired_application_feedback add constraint hired_application_feedback_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.application_email_notifications drop constraint if exists application_email_notifications_applicant_id_fkey;
alter table public.application_email_notifications add constraint application_email_notifications_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;
alter table public.applicant_account_email_notifications drop constraint if exists applicant_account_email_notifications_applicant_id_fkey;
alter table public.applicant_account_email_notifications add constraint applicant_account_email_notifications_applicant_id_fkey
  foreign key (applicant_id) references public.applicants(id) on delete cascade;

-- Preserve system audit rows when the admin actor is removed.
alter table public.application_email_notifications alter column sent_by drop not null;
alter table public.application_email_notifications drop constraint if exists application_email_notifications_sent_by_fkey;
alter table public.application_email_notifications add constraint application_email_notifications_sent_by_fkey
  foreign key (sent_by) references auth.users(id) on delete set null;
alter table public.applicant_account_email_notifications drop constraint if exists applicant_account_email_notifications_sent_by_fkey;
alter table public.applicant_account_email_notifications add constraint applicant_account_email_notifications_sent_by_fkey
  foreign key (sent_by) references auth.users(id) on delete set null;

comment on table public.user_storage_cleanup_queue is
  'Private queue consumed by the cleanup-deleted-user Edge Function after an Auth user is deleted.';

-- Retire the former SuperAdmin authorization path. Admin membership is now the
-- single source of truth for all administrative capabilities.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where profile_id = auth.uid()); $$;

drop policy if exists site_content_superadmin on public.site_content;
drop policy if exists site_content_admin on public.site_content;
drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content for select to anon, authenticated
  using (published or public.is_admin());
create policy site_content_admin on public.site_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists service_checks_superadmin_read on public.service_checks;
drop policy if exists service_checks_admin_read on public.service_checks;
create policy service_checks_admin_read on public.service_checks for select to authenticated
  using (public.is_admin());

drop policy if exists sentiment_datasets_superadmin_read on public.sentiment_evaluation_datasets;
drop policy if exists sentiment_records_superadmin_read on public.sentiment_evaluation_records;
drop policy if exists sentiment_runs_superadmin_read on public.sentiment_evaluation_runs;
drop policy if exists sentiment_results_superadmin_read on public.sentiment_evaluation_results;
create policy sentiment_datasets_admin_read on public.sentiment_evaluation_datasets for select to authenticated using (public.is_admin());
create policy sentiment_records_admin_read on public.sentiment_evaluation_records for select to authenticated using (public.is_admin());
create policy sentiment_runs_admin_read on public.sentiment_evaluation_runs for select to authenticated using (public.is_admin());
create policy sentiment_results_admin_read on public.sentiment_evaluation_results for select to authenticated using (public.is_admin());

drop policy if exists resume_evaluation_datasets_superadmin on public.resume_evaluation_datasets;
drop policy if exists resume_evaluation_records_superadmin on public.resume_evaluation_records;
drop policy if exists resume_evaluation_runs_superadmin on public.resume_evaluation_runs;
drop policy if exists resume_evaluation_results_superadmin on public.resume_evaluation_results;
create policy resume_evaluation_datasets_admin on public.resume_evaluation_datasets for select to authenticated using (public.is_admin());
create policy resume_evaluation_records_admin on public.resume_evaluation_records for select to authenticated using (public.is_admin());
create policy resume_evaluation_runs_admin on public.resume_evaluation_runs for select to authenticated using (public.is_admin());
create policy resume_evaluation_results_admin on public.resume_evaluation_results for select to authenticated using (public.is_admin());

drop policy if exists hired_feedback_superadmin_read on public.hired_application_feedback;
drop policy if exists hired_feedback_admin_read on public.hired_application_feedback;
create policy hired_feedback_admin_read on public.hired_application_feedback for select to authenticated using (public.is_admin());

drop policy if exists applicant_account_email_admin_select on public.applicant_account_email_notifications;
drop policy if exists applicant_account_email_admin_insert on public.applicant_account_email_notifications;
drop policy if exists applicant_account_email_admin_update on public.applicant_account_email_notifications;
create policy applicant_account_email_admin_select on public.applicant_account_email_notifications for select to authenticated using (public.is_admin());
create policy applicant_account_email_admin_insert on public.applicant_account_email_notifications for insert to authenticated with check (public.is_admin());
create policy applicant_account_email_admin_update on public.applicant_account_email_notifications for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists application_email_notifications_admin_select on public.application_email_notifications;
drop policy if exists application_email_notifications_admin_insert on public.application_email_notifications;
drop policy if exists application_email_notifications_admin_update on public.application_email_notifications;
create policy application_email_notifications_admin_select on public.application_email_notifications for select to authenticated using (public.is_admin());
create policy application_email_notifications_admin_insert on public.application_email_notifications for insert to authenticated with check (public.is_admin());
create policy application_email_notifications_admin_update on public.application_email_notifications for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop function if exists public.is_superadmin();
