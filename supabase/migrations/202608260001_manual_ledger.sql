create type public.app_language as enum ('zh-TW', 'en');
create type public.transaction_source as enum ('manual');
create type public.transaction_category as enum (
  'Travel', 'Grocery', 'Shopping', 'Car', 'Dine Out', 'Utility',
  'Entertainment', 'Learning', 'Home', 'Cat', 'Other'
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language public.app_language not null default 'zh-TW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source public.transaction_source not null,
  external_id text,
  raw_description text,
  normalized_merchant text not null default '',
  source_category public.transaction_category,
  category_override public.transaction_category,
  transaction_date date not null,
  amount_cents bigint not null check (amount_cents between -9007199254740991 and 9007199254740991),
  note text not null default '' check (char_length(note) <= 1000),
  pending boolean not null default false,
  include_in_report boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index transactions_external_id_unique
  on public.transactions (user_id, source, external_id)
  where external_id is not null;
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  normalized_merchant text not null check (normalized_merchant <> ''),
  category public.transaction_category not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_merchant)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
for each row execute function public.set_updated_at();
create trigger merchant_rules_updated_at before update on public.merchant_rules
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger auth_user_profile after insert on auth.users
for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.merchant_rules enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy transactions_select_own on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy merchant_rules_select_own on public.merchant_rules for select to authenticated
  using ((select auth.uid()) = user_id);
create policy merchant_rules_insert_own on public.merchant_rules for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy merchant_rules_update_own on public.merchant_rules for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy merchant_rules_delete_own on public.merchant_rules for delete to authenticated
  using ((select auth.uid()) = user_id);
