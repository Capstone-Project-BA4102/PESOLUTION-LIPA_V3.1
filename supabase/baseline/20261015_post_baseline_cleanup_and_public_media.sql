begin;

-- Keep each trigger branch isolated so PostgreSQL never resolves fields from
-- a different trigger table's row type.
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

-- Removed SuperAdmin-only operational and model-evaluation features.
drop table if exists public.sentiment_evaluation_results cascade;
drop table if exists public.sentiment_evaluation_runs cascade;
drop table if exists public.sentiment_evaluation_records cascade;
drop table if exists public.sentiment_evaluation_datasets cascade;
drop table if exists public.service_checks cascade;

-- Public stories are opt-in. Existing feedback remains private by default.
alter table public.hired_application_feedback
  add column if not exists public_story_consent boolean not null default false,
  add column if not exists public_story_consent_at timestamptz,
  add column if not exists public_story_display_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hired_feedback_public_story_consent_check'
      and conrelid = 'public.hired_application_feedback'::regclass
  ) then
    alter table public.hired_application_feedback
      add constraint hired_feedback_public_story_consent_check
      check (not public_story_consent or public_story_consent_at is not null);
  end if;
end $$;

create index if not exists hired_feedback_public_story
  on public.hired_application_feedback(submitted_at desc)
  where public_story_consent and submitted_at is not null;

-- Ensure existing public-site JSON can accept the new media collection.
update public.site_content
set content = jsonb_set(content, '{promotionalMedia}', '[]'::jsonb, true),
    updated_at = now()
where id = 'public'
  and not (content ? 'promotionalMedia');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promotional-media',
  'promotional-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists peso_promotional_media_public_read on storage.objects;
create policy peso_promotional_media_public_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'promotional-media');

drop policy if exists peso_promotional_media_admin_insert on storage.objects;
create policy peso_promotional_media_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'promotional-media' and public.is_admin());

drop policy if exists peso_promotional_media_admin_update on storage.objects;
create policy peso_promotional_media_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'promotional-media' and public.is_admin())
with check (bucket_id = 'promotional-media' and public.is_admin());

drop policy if exists peso_promotional_media_admin_delete on storage.objects;
create policy peso_promotional_media_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'promotional-media' and public.is_admin());

commit;
