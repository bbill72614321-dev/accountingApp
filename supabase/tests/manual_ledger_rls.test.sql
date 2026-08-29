begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.com', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.com', '', now(), now(), now());

insert into public.transactions (id, user_id, source, normalized_merchant, transaction_date, amount_cents, source_category)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'manual', 'ALPHA', '2026-08-01', -1000, 'Grocery'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'manual', 'BETA', '2026-08-02', -2000, 'Travel');

insert into public.merchant_rules (id, user_id, normalized_merchant, category)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'ALPHA', 'Grocery'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'BETA', 'Travel');

insert into public.bank_items (id, user_id, plaid_item_id, institution_name, status)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'item-user-one', 'Chase', 'active'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'item-user-two', 'Amex', 'active');

insert into public.bank_accounts (id, user_id, bank_item_id, plaid_account_id, name, mask, type, subtype)
values
  ('12121212-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'account-user-one', 'Freedom', '1234', 'credit', 'credit card'),
  ('34343434-3434-3434-3434-343434343434', '22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'account-user-two', 'Gold', '5678', 'credit', 'credit card');

insert into public.plaid_item_secrets (bank_item_id, access_token_ciphertext, access_token_iv, access_token_tag)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ciphertext', 'iv', 'tag');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select results_eq('select count(*) from public.profiles', array[1::bigint], 'user one sees one profile');
select results_eq(
  $$select user_id from public.profiles$$,
  array['11111111-1111-1111-1111-111111111111'::uuid], 'user one reads only their profile'
);
select is_empty(
  $$update public.profiles set language = 'en' where user_id = '22222222-2222-2222-2222-222222222222' returning user_id$$,
  'user one cannot update user two profile'
);
select is_empty(
  $$delete from public.profiles where user_id = '22222222-2222-2222-2222-222222222222' returning user_id$$,
  'user one cannot delete user two profile'
);
select throws_ok(
  $$insert into public.profiles (user_id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501', null, 'user one cannot forge another profile'
);

select results_eq('select count(*) from public.transactions', array[1::bigint], 'user one sees one row');
select results_eq($$select normalized_merchant from public.transactions$$, array['ALPHA'::text], 'user one sees only own row');
select is_empty($$update public.transactions set note = 'x' where user_id = '22222222-2222-2222-2222-222222222222' returning id$$, 'user one cannot update user two');
select is_empty($$delete from public.transactions where user_id = '22222222-2222-2222-2222-222222222222' returning id$$, 'user one cannot delete user two');
select throws_ok(
  $$insert into public.transactions (user_id, source, normalized_merchant, transaction_date, amount_cents) values ('22222222-2222-2222-2222-222222222222', 'manual', 'FORGED', '2026-08-03', -3000)$$,
  '42501', null, 'user one cannot insert for user two'
);

select results_eq('select count(*) from public.bank_items', array[1::bigint], 'user one sees one bank item');
select results_eq('select count(*) from public.bank_accounts', array[1::bigint], 'user one sees one bank account');
select is_empty($$select * from public.plaid_item_secrets$$, 'authenticated users cannot read encrypted Plaid tokens');
select is_empty($$update public.bank_items set institution_name = 'Forged' where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' returning id$$, 'user one cannot update user two bank item');
select is_empty($$delete from public.bank_accounts where id = '34343434-3434-3434-3434-343434343434' returning id$$, 'user one cannot delete user two bank account');
select throws_ok(
  $$insert into public.bank_items (user_id, plaid_item_id, institution_name, status) values ('22222222-2222-2222-2222-222222222222', 'forged-item', 'Forged', 'active')$$,
  '42501', null, 'user one cannot forge another bank item'
);

select results_eq('select count(*) from public.merchant_rules', array[1::bigint], 'user one sees one merchant rule');
select results_eq(
  $$select normalized_merchant from public.merchant_rules$$,
  array['ALPHA'::text], 'user one reads only their merchant rule'
);
select is_empty(
  $$update public.merchant_rules set category = 'Cat' where user_id = '22222222-2222-2222-2222-222222222222' returning id$$,
  'user one cannot update user two merchant rule'
);
select is_empty(
  $$delete from public.merchant_rules where user_id = '22222222-2222-2222-2222-222222222222' returning id$$,
  'user one cannot delete user two merchant rule'
);
select throws_ok(
  $$insert into public.merchant_rules (user_id, normalized_merchant, category) values ('22222222-2222-2222-2222-222222222222', 'GAMMA', 'Cat')$$,
  '42501', null, 'user one cannot forge a rule for user two'
);

select lives_ok(
  $$select public.set_transaction_category_and_rule('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cat')$$,
  'user one can categorize their own transaction and learn its merchant rule'
);
select results_eq(
  $$select category_override::text from public.transactions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array['Cat'::text], 'the owner transaction category is updated'
);
select results_eq(
  $$select category::text from public.merchant_rules where normalized_merchant = 'ALPHA'$$,
  array['Cat'::text], 'the owner merchant rule is upserted'
);
select throws_ok(
  $$select public.set_transaction_category_and_rule('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cat')$$,
  'P0002', 'Transaction not found', 'user one cannot categorize user two transaction'
);

select lives_ok(
  $$select public.update_manual_transaction_and_rule('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alpha Market', 'ALPHA MARKET', 'Travel', '2026-08-03', -1500, 'updated')$$,
  'user one can atomically edit their manual transaction'
);
select results_eq(
  $$select raw_description || '|' || source_category::text || '|' || transaction_date::text || '|' || amount_cents::text || '|' || note from public.transactions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  array['Alpha Market|Travel|2026-08-03|-1500|updated'::text], 'the full manual edit is saved'
);
select is(
  (select category_override::text from public.transactions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  null::text, 'the full manual edit clears the stale category override'
);
select results_eq(
  $$select category::text from public.merchant_rules where normalized_merchant = 'ALPHA MARKET'$$,
  array['Travel'::text], 'the full manual edit learns the changed effective category'
);
select throws_ok(
  $$select public.update_manual_transaction_and_rule('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Forged', 'FORGED', 'Cat', '2026-08-04', -3000, 'forged')$$,
  'P0002', 'Manual transaction not found', 'user one cannot edit user two manual transaction'
);

reset role;
select is(
  (select category_override::text from public.transactions where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  null::text, 'cross-owner category remains unchanged after rejection'
);
select ok(
  not has_function_privilege('anon', 'public.set_transaction_category_and_rule(uuid, public.transaction_category)', 'execute'),
  'anonymous users cannot execute the category RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.set_transaction_category_and_rule(uuid, public.transaction_category)', 'execute'),
  'authenticated users can execute the category RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.update_manual_transaction_and_rule(uuid, text, text, public.transaction_category, date, bigint, text)',
    'execute'
  ),
  'anonymous users cannot execute the full-edit RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.update_manual_transaction_and_rule(uuid, text, text, public.transaction_category, date, bigint, text)',
    'execute'
  ),
  'authenticated users can execute the full-edit RPC'
);
select ok(
  not has_function_privilege('anon', 'public.create_profile_for_user()', 'execute'),
  'anonymous users cannot execute the security-definer profile trigger function'
);
select ok(
  not has_function_privilege('authenticated', 'public.create_profile_for_user()', 'execute'),
  'authenticated users cannot execute the security-definer profile trigger function'
);

select * from finish();
rollback;
