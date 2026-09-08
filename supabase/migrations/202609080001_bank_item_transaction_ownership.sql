alter table public.transactions
  add column bank_item_id uuid references public.bank_items(id) on delete cascade;

update public.transactions as transaction
set bank_item_id = item.id
from public.bank_items as item
where transaction.source = 'plaid'
  and transaction.bank_item_id is null
  and transaction.user_id = item.user_id
  and 1 = (
    select count(*)
    from public.bank_items as candidate
    where candidate.user_id = transaction.user_id
  );

alter table public.transactions
  add constraint plaid_transactions_require_bank_item
  check (source <> 'plaid' or bank_item_id is not null) not valid;

create index transactions_bank_item_date_idx
  on public.transactions (bank_item_id, transaction_date desc)
  where bank_item_id is not null;
