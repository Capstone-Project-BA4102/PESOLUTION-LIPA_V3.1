-- Every printed account receipt gets its own serial number (RCT-YYYY-NNNN) so PESO can point
-- at one specific credential hand-over. Run once in the Supabase SQL Editor. Idempotent.

begin;

create sequence if not exists public.applicant_account_receipt_serial_seq;

alter table public.applicant_account_receipts
  add column if not exists serial_number text;

-- Number the receipts already on file oldest first so the order matches when they were issued.
do $$
declare receipt record;
begin
  for receipt in
    select id, created_at from public.applicant_account_receipts
    where serial_number is null order by created_at
  loop
    update public.applicant_account_receipts
      set serial_number = 'RCT-' || to_char(receipt.created_at, 'YYYY') || '-'
        || lpad(nextval('public.applicant_account_receipt_serial_seq')::text, 4, '0')
      where id = receipt.id;
  end loop;
end $$;

alter table public.applicant_account_receipts
  alter column serial_number set not null;

create unique index if not exists applicant_account_receipt_serial_idx
  on public.applicant_account_receipts (serial_number);

create or replace function public.next_account_receipt_serial()
returns text language sql volatile as $$
  select 'RCT-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('public.applicant_account_receipt_serial_seq')::text, 4, '0');
$$;

alter table public.applicant_account_receipts
  alter column serial_number set default public.next_account_receipt_serial();

comment on column public.applicant_account_receipts.serial_number is
  'Printed receipt number RCT-YYYY-NNNN, unique per credential hand-over.';

commit;

select serial_number, action, created_at from public.applicant_account_receipts order by created_at;
