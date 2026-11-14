-- Batch 1: transactional referral actions. Prepare/review locally; do not run against production automatically.
-- No table/column changes, record deletion, or historical status rewriting.
begin;
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
commit;
