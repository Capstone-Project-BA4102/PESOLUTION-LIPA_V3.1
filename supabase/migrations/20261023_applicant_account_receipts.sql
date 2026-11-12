-- Account receipt history: when an applicant's portal login credentials were handed over,
-- plus the initial password that was printed on that receipt so PESO can reprint it later.
-- Admin-only (RLS below); the applicant's own sign-in still uses the Supabase Auth hash.
-- Run once in the Supabase SQL Editor. Idempotent.

begin;

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

commit;

select count(*) as receipt_events from public.applicant_account_receipts;
