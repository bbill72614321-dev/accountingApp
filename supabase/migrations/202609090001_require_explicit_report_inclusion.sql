alter table public.transactions
  alter column include_in_report set default false;

update public.transactions
set include_in_report = false
where include_in_report = true;
