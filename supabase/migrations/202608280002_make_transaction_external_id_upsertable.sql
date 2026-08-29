drop index if exists public.transactions_external_id_unique;

create unique index transactions_external_id_unique
  on public.transactions (user_id, source, external_id);
