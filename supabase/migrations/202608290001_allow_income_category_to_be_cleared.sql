create or replace function public.set_transaction_category_and_rule(
  p_transaction_id uuid,
  p_category public.transaction_category
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  merchant_key text;
begin
  update public.transactions
  set category_override = p_category
  where id = p_transaction_id and user_id = auth.uid()
  returning normalized_merchant into merchant_key;

  if not found then
    raise exception 'Transaction not found' using errcode = 'P0002';
  end if;

  if merchant_key <> '' and p_category is not null then
    insert into public.merchant_rules (user_id, normalized_merchant, category)
    values (auth.uid(), merchant_key, p_category)
    on conflict (user_id, normalized_merchant) do update
      set category = excluded.category;
  end if;
end;
$$;
