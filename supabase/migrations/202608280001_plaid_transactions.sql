alter type public.transaction_source add value if not exists 'plaid';
create type public.transaction_review_status as enum ('confirmed', 'needs_review');

create table public.bank_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null unique,
  institution_id text,
  institution_name text not null check (institution_name <> ''),
  cursor text,
  status text not null default 'active' check (status in ('active', 'attention_required', 'disconnected')),
  error_code text,
  error_message text,
  consent_expiration_time timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plaid_item_secrets (
  bank_item_id uuid primary key references public.bank_items(id) on delete cascade,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  access_token_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_item_id uuid not null references public.bank_items(id) on delete cascade,
  plaid_account_id text not null unique,
  name text not null check (name <> ''),
  official_name text,
  mask text,
  type text not null,
  subtype text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
  add column bank_account_id uuid references public.bank_accounts(id) on delete set null,
  add column provider_pending boolean not null default false,
  add column review_status public.transaction_review_status not null default 'confirmed',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column provider_category text,
  add column original_currency_code text;

update public.transactions
set provider_pending = pending,
    review_status = 'confirmed'
where source = 'manual';

create index bank_items_user_idx on public.bank_items (user_id);
create index bank_accounts_user_idx on public.bank_accounts (user_id);
create index bank_accounts_item_idx on public.bank_accounts (bank_item_id);
create index transactions_bank_account_date_idx on public.transactions (bank_account_id, transaction_date desc)
  where bank_account_id is not null;
create index transactions_review_idx on public.transactions (user_id, source, review_status, transaction_date desc);

create trigger bank_items_updated_at before update on public.bank_items
for each row execute function public.set_updated_at();
create trigger plaid_item_secrets_updated_at before update on public.plaid_item_secrets
for each row execute function public.set_updated_at();
create trigger bank_accounts_updated_at before update on public.bank_accounts
for each row execute function public.set_updated_at();

alter table public.bank_items enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.plaid_item_secrets enable row level security;

create policy bank_items_select_own on public.bank_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy bank_accounts_select_own on public.bank_accounts for select to authenticated
  using ((select auth.uid()) = user_id);
