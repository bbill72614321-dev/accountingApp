begin;

alter table public.transactions
  add column duplicate_of uuid references public.transactions(id) on delete set null,
  add column source_category_locked boolean not null default false,
  add constraint transactions_duplicate_not_self check (duplicate_of is null or duplicate_of <> id),
  add constraint transactions_duplicates_excluded check (duplicate_of is null or (not include_in_report and excluded_from_report));

create table public.transaction_reconciliations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_item_id uuid not null references public.bank_items(id) on delete cascade,
  cutoff_date date not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now(),
  reverted_at timestamptz
);
-- Full before/after snapshots are accessible only to administrative operations.
alter table public.transaction_reconciliations enable row level security;

create function public.protect_reconciled_transaction()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.source_category_locked and new.source_category_locked then
    new.source_category := old.source_category;
  end if;
  if new.duplicate_of is not null then
    if not exists (
      select 1 from public.transactions t
      where t.id = new.duplicate_of and t.user_id = new.user_id and t.duplicate_of is null
    ) or exists (
      select 1 from public.transactions t where t.duplicate_of = new.id
    ) then
      raise exception 'Duplicate must reference a canonical transaction owned by the same user' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_reconciled_transaction
before insert or update on public.transactions
for each row execute function public.protect_reconciled_transaction();

comment on column public.transactions.duplicate_of is 'Reversible duplicate marker. Preserve source IDs and records; exclude marked rows from normal views and reports.';
comment on column public.transactions.source_category_locked is 'Preserve the imported category chosen during reconciliation across future provider upserts. User category overrides remain editable.';

commit;
