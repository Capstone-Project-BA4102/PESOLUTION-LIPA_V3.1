-- Track when an applicant replaces the initial password printed on their walk-in account
-- receipt, so the portal can keep reminding them until they do.
-- Run once in the Supabase SQL Editor. Idempotent.

begin;

alter table public.applicants add column if not exists password_changed_at timestamptz;

comment on column public.applicants.password_changed_at is
  'Set by the applicant portal when they change their own password; null means the initial password from the account receipt is still in use.';

commit;

select count(*) as applicants_missing_password_change
from public.applicants
where password_changed_at is null;
