begin;

alter table public.transactions
  add column if not exists user_reviewed_at timestamptz;

alter table public.transactions
  alter column include_in_report set default true;

update public.transactions
  set include_in_report = true
  where excluded_from_report = false;

update public.transactions
  set include_in_report = false
  where excluded_from_report = true;

commit;
