-- Run only in an empty disposable PostgreSQL database, never an application database.
-- Minimal schema mirrors the columns and uniqueness rules used by the production baseline.
create schema auth;
create role anon;
create role authenticated;
create role service_role;
create function auth.role() returns text language sql as $$ select coalesce(current_setting('request.jwt.claim.role',true), '') $$;
create table public.admins(id uuid default gen_random_uuid(), profile_id uuid unique);
create table public.applicants(id uuid primary key);
create table public.job_listings(id uuid primary key, status text not null, vacancies integer not null check(vacancies >= 0));
create table public.applications(id uuid primary key default gen_random_uuid(), applicant_id uuid not null references applicants(id), job_id uuid references job_listings(id), status text not null default 'Registered', unique(applicant_id,job_id));
create sequence referral_number_seq;
create table public.referrals(id uuid primary key default gen_random_uuid(), application_id uuid not null unique references applications(id), referral_number text unique not null default ('TEST-' || nextval('referral_number_seq')), date_issued timestamptz not null default now(), signatory_name text, recipient_name text, recipient_address text);
create table public.status_history(id uuid default gen_random_uuid(),applicant_id uuid,application_id uuid,status text,remarks text,changed_at timestamptz default now());
create table public.activity_logs(id uuid default gen_random_uuid(),actor text not null,type text not null,title text not null,description text,created_at timestamptz default now());
alter table applications enable row level security;
alter table status_history enable row level security;
create policy applications_request_own on applications for insert with check(true);
create policy applications_update_request_own on applications for update using(true);
create policy status_history_request_own on status_history for insert with check(true);
\ir ../../supabase/migrations/20261114_referral_safeguards.sql
insert into admins(profile_id) values('00000000-0000-0000-0000-000000000099');
insert into applicants select ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid from generate_series(1,6) n;
insert into job_listings values ('10000000-0000-0000-0000-000000000001','Active',3),('10000000-0000-0000-0000-000000000002','Closed',2),('10000000-0000-0000-0000-000000000003','Inactive',2),('10000000-0000-0000-0000-000000000004','Active',0);
select set_config('request.jwt.claim.role','service_role',false);
create function public.expect_referral_failure(statement text, expected text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(expected in sqlerrm) > 0 then return; end if;
    raise;
  end;
  raise exception 'Expected failure: %', expected;
end $$;

do $$
declare
 staff uuid := '00000000-0000-0000-0000-000000000099';
 applicant uuid := '00000000-0000-0000-0000-000000000001';
 job uuid := '10000000-0000-0000-0000-000000000001';
 first_ref jsonb; again jsonb; before_logs integer; before_slots integer; app uuid; pending_ref uuid;
begin
  perform set_config('request.jwt.claim.role','authenticated',false);
  perform expect_referral_failure(format('select manage_peso_referral(%L,%L,%L,%L)', 'issue',staff,applicant,job),'Only authorized');
  perform set_config('request.jwt.claim.role','service_role',false);
  perform expect_referral_failure(format('select manage_peso_referral(%L,%L,%L,%L)', 'issue',applicant,applicant,job),'Only authorized');
  first_ref := manage_peso_referral('issue',staff,applicant,job,p_fields => '{"recipient_name":"Synthetic Company"}');
  again := manage_peso_referral('issue',staff,applicant,job);
  if first_ref->>'id' <> again->>'id' or (select count(*) from referrals) <> 1 or (select count(*) from status_history) <> 1 then raise exception 'Duplicate issue was not idempotent'; end if;
  if not exists(select 1 from status_history where remarks like '%Staff: '||staff::text||'%' and changed_at is not null) then raise exception 'Missing staff/time audit'; end if;
  if not exists(select 1 from referrals where recipient_name = 'Synthetic Company') then raise exception 'Slip fields not persisted'; end if;
  perform manage_peso_referral('not-hired',staff,applicant,job);
  if not exists(select 1 from applications where applicant_id=applicant and status='Not Hired') then raise exception 'Employment outcome conflated'; end if;
  if (select vacancies from job_listings where id=job) <> 3 then raise exception 'Not Hired consumed capacity'; end if;
  perform expect_referral_failure(format('select manage_peso_referral(%L,%L,%L,%L)', 'hire',staff,applicant,job),'Only an active referral');
  perform expect_referral_failure(format('select manage_peso_referral(%L,%L,%L,%L)', 'issue',staff,applicant,job),'closed');
  applicant := '00000000-0000-0000-0000-000000000002';
  first_ref := manage_peso_referral('issue',staff,applicant,job);
  perform manage_peso_referral('hire',staff,applicant,job);
  select count(*) into before_logs from status_history;
  perform manage_peso_referral('hire',staff,applicant,job);
  if (select vacancies from job_listings where id=job) <> 2 or (select count(*) from status_history) <> before_logs then raise exception 'Hire retry consumed capacity or duplicated audit'; end if;
  applicant := '00000000-0000-0000-0000-000000000003';
  first_ref := manage_peso_referral('issue',staff,applicant,job);
  perform manage_peso_referral('cancel',staff,p_referral_id => (first_ref->>'id')::uuid);
  if not exists(select 1 from referrals where id=(first_ref->>'id')::uuid) or not exists(select 1 from applications where applicant_id=applicant and status='Declined') then raise exception 'Cancellation destroyed record'; end if;
  applicant := '00000000-0000-0000-0000-000000000004';
  insert into applications(applicant_id,job_id,status) values(applicant,job,'Referral Requested') returning id into app;
  perform manage_peso_referral('decline',staff,p_application_id=>app);
  if not exists(select 1 from applications where id=app and status='Declined') then raise exception 'Legacy request not retained'; end if;
  -- A previously generated, unconfirmed slip must retain its reference when staff confirm it.
  applicant := '00000000-0000-0000-0000-000000000005';
  insert into applications(applicant_id,job_id,status) values(applicant,job,'Matched') returning id into app;
  insert into referrals(application_id) values(app) returning id into pending_ref;
  first_ref := manage_peso_referral('issue',staff,p_referral_id=>pending_ref);
  if first_ref->>'id' <> pending_ref::text then raise exception 'Legacy reference replaced'; end if;
  perform manage_peso_referral('edit',staff,p_referral_id=>pending_ref,p_fields=>'{"signatory_name":"Synthetic Staff"}');
  if not exists(select 1 from referrals where id=pending_ref and signatory_name='Synthetic Staff') then raise exception 'Edit not persisted'; end if;
  applicant := '00000000-0000-0000-0000-000000000006';
  for job in select id from job_listings where status <> 'Active' or vacancies=0 loop
    perform expect_referral_failure(format('select manage_peso_referral(%L,%L,%L,%L)', 'issue',staff,applicant,job),'vacancies cannot receive');
  end loop;
  if exists(select 1 from applications where applicant_id=applicant) then raise exception 'Failed issue left an application behind'; end if;
  if exists(select 1 from pg_policies where policyname in ('applications_request_own','applications_update_request_own','status_history_request_own')) then raise exception 'Applicant writes remain allowed'; end if;
  if has_function_privilege('authenticated','public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text)','execute') or not has_function_privilege('service_role','public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text)','execute') then raise exception 'RPC privileges incorrect'; end if;
  raise notice 'PASS: authorization, issuance, duplicate retry, edit, hire, hire retry, Not Hired, cancellation, legacy request/preview, closed/inactive/full vacancy, atomic rollback, staff/time audit, RLS policies and RPC privileges';
end $$;
