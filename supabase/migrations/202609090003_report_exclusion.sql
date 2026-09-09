alter table public.transactions
  add column excluded_from_report boolean not null default false;

alter table public.transactions
  add constraint transactions_report_disposition_check
  check (not (include_in_report and excluded_from_report));
