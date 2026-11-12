-- Self-service password changes are capped at 3 per rolling week per applicant, so the
-- credential stays something they actively keep track of. Run once in the SQL Editor. Idempotent.

begin;

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

commit;

select count(*) as recorded_password_changes from public.applicant_password_changes;
