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

begin;

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

commit;

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
