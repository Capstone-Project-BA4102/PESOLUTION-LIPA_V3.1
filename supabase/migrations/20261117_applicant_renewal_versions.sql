-- Prepared locally. Additive renewal versioning; do not auto-apply to production.
begin;
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

commit;
