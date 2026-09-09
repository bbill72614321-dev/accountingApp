create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  split_count integer not null check (split_count >= 2 and split_count <= 100),
  personal_amount_cents integer not null check (personal_amount_cents >= 0),
  requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transaction_splits_user_requested_idx
  on public.transaction_splits (user_id, requested_at);

create trigger transaction_splits_updated_at before update on public.transaction_splits
for each row execute function public.set_updated_at();

alter table public.transaction_splits enable row level security;

create policy transaction_splits_select_own on public.transaction_splits for select to authenticated
  using ((select auth.uid()) = user_id);
create policy transaction_splits_insert_own on public.transaction_splits for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy transaction_splits_update_own on public.transaction_splits for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transaction_splits_delete_own on public.transaction_splits for delete to authenticated
  using ((select auth.uid()) = user_id);
