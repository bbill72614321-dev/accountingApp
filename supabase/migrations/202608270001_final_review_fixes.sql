create or replace function public.update_manual_transaction_and_rule(
  p_transaction_id uuid,
  p_merchant text,
  p_normalized_merchant text,
  p_category public.transaction_category,
  p_transaction_date date,
  p_amount_cents bigint,
  p_note text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_category public.transaction_category;
begin
  select coalesce(category_override, source_category)
  into previous_category
  from public.transactions
  where id = p_transaction_id
    and user_id = auth.uid()
    and source = 'manual'
  for update;

  if not found then
    raise exception 'Manual transaction not found' using errcode = 'P0002';
  end if;

  update public.transactions
  set raw_description = p_merchant,
      normalized_merchant = p_normalized_merchant,
      source_category = p_category,
      category_override = null,
      transaction_date = p_transaction_date,
      amount_cents = p_amount_cents,
      note = p_note
  where id = p_transaction_id;

  if previous_category is distinct from p_category
    and p_category is not null
    and p_normalized_merchant <> '' then
    insert into public.merchant_rules (user_id, normalized_merchant, category)
    values (auth.uid(), p_normalized_merchant, p_category)
    on conflict (user_id, normalized_merchant) do update
      set category = excluded.category;
  end if;
end;
$$;

revoke all on function public.update_manual_transaction_and_rule(
  uuid, text, text, public.transaction_category, date, bigint, text
) from public;
grant execute on function public.update_manual_transaction_and_rule(
  uuid, text, text, public.transaction_category, date, bigint, text
) to authenticated;

revoke all on function public.create_profile_for_user() from public;
