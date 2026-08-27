begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.com', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.com', '', now(), now(), now());

insert into public.transactions (id, user_id, source, normalized_merchant, transaction_date, amount_cents, source_category)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'manual', 'ALPHA', '2026-08-01', -1000, 'Grocery'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'manual', 'BETA', '2026-08-02', -2000, 'Travel');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select results_eq('select count(*) from public.transactions', array[1::bigint], 'user one sees one row');
select results_eq($$select normalized_merchant from public.transactions$$, array['ALPHA'::text], 'user one sees only own row');
select is_empty($$update public.transactions set note = 'x' where user_id = '22222222-2222-2222-2222-222222222222' returning id$$, 'user one cannot update user two');
select is_empty($$delete from public.transactions where user_id = '22222222-2222-2222-2222-222222222222' returning id$$, 'user one cannot delete user two');
select throws_ok(
  $$insert into public.transactions (user_id, source, normalized_merchant, transaction_date, amount_cents) values ('22222222-2222-2222-2222-222222222222', 'manual', 'FORGED', '2026-08-03', -3000)$$,
  '42501', null, 'user one cannot insert for user two'
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

select * from finish();
rollback;
