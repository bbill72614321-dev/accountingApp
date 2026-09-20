alter table public.bank_accounts
  add column display_name text
  constraint bank_accounts_display_name_length
  check (display_name is null or (char_length(btrim(display_name)) between 1 and 60));

comment on column public.bank_accounts.display_name is
  'User nickname; independent of the name supplied by Plaid. Written by authenticated, ownership-checked server actions.';
