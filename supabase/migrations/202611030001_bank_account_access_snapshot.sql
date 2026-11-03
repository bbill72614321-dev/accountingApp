-- NULL means legacy access has not yet been checked; never infer consent from stored accounts.
alter table public.bank_items
  add column account_access_snapshot jsonb;
