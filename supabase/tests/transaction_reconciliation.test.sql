-- Rollback-only database regression checks. No fixture data is committed.
begin;
do $$
declare
  owner_id uuid;
  other_owner_id uuid;
  keeper_id uuid;
  duplicate_id uuid;
  other_id uuid;
  result_category public.transaction_category;
begin
  select id into owner_id from auth.users order by id limit 1;
  select id into other_owner_id from auth.users where id <> owner_id order by id limit 1;
  if owner_id is null or other_owner_id is null then
    raise exception 'Two existing test users are required';
  end if;

  insert into public.transactions (user_id, source, transaction_date, amount_cents, source_category, source_category_locked)
    values (owner_id, 'manual', '2026-09-01', -100, 'Other', true) returning id into keeper_id;
  insert into public.transactions (user_id, source, transaction_date, amount_cents)
    values (owner_id, 'manual', '2026-09-01', -100) returning id into duplicate_id;
  insert into public.transactions (user_id, source, transaction_date, amount_cents)
    values (other_owner_id, 'manual', '2026-09-01', -100) returning id into other_id;

  update public.transactions set source_category = 'Home' where id = keeper_id;
  select source_category into result_category from public.transactions where id = keeper_id;
  if result_category <> 'Other' then raise exception 'Locked source category was overwritten'; end if;

  update public.transactions set duplicate_of = keeper_id, include_in_report = false, excluded_from_report = true where id = duplicate_id;
  if (select count(*) from public.transactions where id in (keeper_id, duplicate_id) and duplicate_of is null) <> 1 then
    raise exception 'Duplicate remains visible';
  end if;
  begin
    update public.transactions set include_in_report = true, excluded_from_report = false where id = duplicate_id;
    raise exception 'Duplicate was allowed back into reports';
  exception when check_violation then null;
  end;
  begin
    update public.transactions set duplicate_of = other_id where id = duplicate_id;
    raise exception 'Cross-user duplicate relation was allowed';
  exception when check_violation then null;
  end;
  begin
    update public.transactions set duplicate_of = duplicate_id, include_in_report = false, excluded_from_report = true where id = keeper_id;
    raise exception 'Duplicate chain was allowed';
  exception when check_violation then null;
  end;

  -- Reversal removes the duplicate marker and restores reporting independently.
  update public.transactions set duplicate_of = null, include_in_report = true, excluded_from_report = false where id = duplicate_id;
  update public.transactions set source_category_locked = false, source_category = 'Home' where id = keeper_id;
  if (select source_category from public.transactions where id = keeper_id) <> 'Home' then raise exception 'Category cannot be unlocked'; end if;
  if (select count(*) from public.transactions where id in (keeper_id, duplicate_id) and duplicate_of is null) <> 2 then raise exception 'Duplicate cannot be restored'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.transaction_reconciliations'::regclass) then raise exception 'Audit RLS is disabled'; end if;
end;
$$;
rollback;
