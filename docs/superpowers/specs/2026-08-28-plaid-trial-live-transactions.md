# Plaid Trial Live Transactions

## Decision

Integrate Plaid **Transactions** using the US/Canada free Trial plan, with real bank data, a maximum of ten Production Items, and an initial 90-day history request. Each of the two existing users connects only their own institutions and sees only their own Items, accounts, and transactions.

The first intended set is six Items: one Chase, one American Express, and one Bank of America connection for each person. An Item is an institution connection, not each account selected inside that connection. The product must show the remaining Trial capacity and warn before creating Item 10.

## Product rules

- Use Plaid Link, not a custom credential form. The app never receives or stores bank passwords.
- Use only the `transactions` product and US country code for this phase.
- Request `transactions.days_requested: 90` for a first connection.
- Imported transactions are **Needs review** until that user confirms them. They do not affect monthly spending, net amount, category totals, exports, or reports until confirmed.
- Bank-pending and user-review state are different concepts. A posted bank transaction can still require user review; a bank-pending transaction cannot be confirmed for reporting.
- Existing manual transactions retain their current behavior and are already confirmed.
- USD only. A non-USD imported transaction is stored but held for review and visually labelled with its original currency; it is excluded from USD reports.
- Do not add Plaid Refresh in this phase. It is an optional paid per-request add-on. New data arrives through Plaid's normal update cycle and webhook-driven `/transactions/sync` calls.
- V1 does not automatically remove transfers or deduplicate a payment appearing on both checking and credit-card accounts. It makes source account/institution visible and asks the user to exclude or review the duplicate.

## Security and data isolation

### Secrets and tokens

- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=production`, webhook verification configuration, Supabase service-role key, and `PLAID_TOKEN_ENCRYPTION_KEY` are server-only Vercel environment variables. They never receive a `NEXT_PUBLIC_` prefix and must never be committed.
- Generate a 32-byte `PLAID_TOKEN_ENCRYPTION_KEY` once with a cryptographically secure command. Use AES-256-GCM with a unique random IV for each stored access token; store IV and authentication tag alongside ciphertext.
- The permanent Plaid `access_token` is kept only in a private `plaid_item_secrets` table. There are no user-facing RLS policies for this table and no route ever serializes it.
- A server-only admin Supabase client may read/write `plaid_item_secrets`, but every call must first authenticate the current user with `requireUser()` and verify that the referenced public Item belongs to that user.
- The public `bank_items` and `bank_accounts` tables are protected by user-id RLS. No query may accept a user id from the browser as an authorization substitute.
- Link tokens and public tokens are short lived: create Link tokens on demand; exchange the public token on the server immediately; never persist a public token.

### Consent and disconnection

- The app presents a plain-language connection note before Link: Plaid will share transaction/account data for the selected accounts and the user may disconnect at any time.
- Disconnect removes the Plaid Item through `/item/remove`, deletes its private token secret, and marks imported transactions as disconnected source data. Existing confirmed transactions remain as historical user records; the app shows that the source connection is no longer active.
- Webhook endpoints authenticate Plaid webhook verification before changing data and never reveal whether a specific Item exists.

## Data model

### `bank_items`

Public metadata only: `id`, `user_id`, `plaid_item_id` (unique), `institution_id`, `institution_name`, `status`, `error_code`, `error_message`, `sync_cursor`, `last_synced_at`, `created_at`, `disconnected_at`.

RLS: authenticated user may select, insert, update, or delete only rows where `user_id = auth.uid()`. Browser clients never insert a Plaid item directly; server actions use the authenticated identity.

### `plaid_item_secrets`

Private server-only fields: `item_id` (unique foreign key), `token_ciphertext`, `token_iv`, `token_auth_tag`, `created_at`, `rotated_at`. No browser RLS policy permits select/insert/update/delete. This table contains no `user_id`; ownership is verified through its `bank_items` join.

### `bank_accounts`

Fields: `id`, `user_id`, `bank_item_id`, `plaid_account_id` (unique), `name`, `official_name`, `mask`, `type`, `subtype`, `currency_code`, `active`, `created_at`.

RLS: `user_id = auth.uid()` for all applicable policies. It contains no balance or account/routing number in this phase.

### Existing `transactions`

Keep manual columns and add nullable imported-source fields:

- `bank_account_id` foreign key
- `plaid_transaction_id` unique when present
- `provider_pending` boolean
- `review_status` enum-like text: `confirmed` or `needs_review`
- `reviewed_at`, `reviewed_by`
- `provider_category`, `original_currency_code`
- `source = 'plaid'` for imported rows

Monthly calculations switch from the current `pending` exclusion to these rules: include only transactions with `include_in_report = true`, `review_status = 'confirmed'`, `provider_pending = false`, and `original_currency_code` null or `USD`. Manual records are backfilled as `review_status = 'confirmed'` and `provider_pending = false`.

## Amount normalization

Plaid Transactions represents a debit/expense as a positive amount and a credit/refund/income as a negative amount. The existing ledger represents outflow as a negative amount. Normalize every Plaid amount exactly once at ingestion:

```
ledger_amount_cents = -Math.round(plaid_amount * 100)
```

This rule applies identically to checking and credit-card accounts. It eliminates the user-facing sign mismatch between account statements. Keep the provider amount only in webhook/API logs, not as a second editable ledger amount.

## Connection and import flow

1. Signed-in user opens **Bank connections** and reads the connection note plus Trial Item count.
2. Browser requests `POST /api/plaid/link-token`; server authenticates, creates a Link token with `transactions`, `US`, the authenticated user ID, production webhook URL, production OAuth redirect URL, and 90 requested days.
3. Client-only Plaid Link opens. For OAuth banks, Link returns to a registered HTTPS redirect page and resumes Link with its exact received redirect URL.
4. `onSuccess` sends the one-time `public_token` to `POST /api/plaid/exchange`. The server authenticates, exchanges it, encrypts and stores the access token, and stores public Item/account metadata under the logged-in user.
5. Server calls `/transactions/sync` for a new Item with an empty cursor, paginates until `has_more` is false, and persists `added`, `modified`, and `removed` changes atomically. If Plaid is not ready, store the Item and show `Waiting for first transactions` rather than treating it as an error.
6. Each imported record is created with `review_status = 'needs_review'`; categories are suggestions only. The connection returns the user to a review-filtered transaction list.
7. On `SYNC_UPDATES_AVAILABLE`, verified webhook processing queues/retries the same per-Item cursor sync. It applies modifications and removals idempotently, advances cursor only after a complete successful page set, and records a safe error state if processing fails.

## UI

### Bank connections page

- New navigation item: `Bank connections` / `銀行連線`.
- Header shows `n of 10 Trial connections used`, with an amber warning at 8 and a blocking message at 10.
- Primary action: `Connect bank` / `連接銀行`.
- One row per Item with institution name, selected accounts, status, last sync time, error/reconnect state, and Disconnect action.
- State text covers: `Connected`, `Waiting for first transactions`, `Needs reconnect`, `Sync failed`, and `Disconnected`.

### Transactions page

- Add source-account filter and a visible `Needs review` shortcut.
- Show the bank/institution source below merchant for Plaid rows; retain `Manual` label for manual rows.
- Add a clear confirmation action for imported records. Confirmation is a separate action from editing category/note.
- Show `Bank pending` and `Needs review` as separate labelled states when both apply.
- Add a non-destructive `Exclude from report` action for transfers/duplicates; do not silently discard any imported row.

## Web and deployment configuration

- Add the production OAuth redirect URI and webhook URL in Plaid Dashboard, using the deployed Vercel HTTPS domain. Local HTTP redirect is used only with Sandbox.
- Production Vercel environment receives all server secrets; local `.env.local` receives development equivalents only.
- Configure a protected Vercel Cron fallback that attempts sync only for connected Items whose `last_synced_at` is stale. It never calls `/transactions/refresh`.
- Rate-limit Link-token creation and exchange per authenticated user. Log Plaid `request_id`, Item ID, and error code, but never tokens, full transaction payloads, account numbers, or user data.

## Tests and acceptance criteria

- Unit tests prove amount normalization for debit, credit, refunds, checking, and credit cards.
- Unit tests prove only confirmed, posted USD entries affect reports.
- Server/API tests prove a user cannot exchange, sync, confirm, or disconnect another user's Item.
- Tests cover encrypted token round-trip and rejection of malformed ciphertext.
- Sandbox integration test covers Link exchange, 90-day initial sync pagination, idempotent resync, modified transaction, removed pending transaction, and webhook signature failure.
- Manual production Trial test connects one owner’s account, confirms selected records, and verifies the other user cannot see the Item, account, or transactions.
- The app displays no Plaid secret/access token in HTML, client JavaScript, API response, log output, exports, or error messages.

## Out of scope

- Payments, transfers, account/routing numbers, balance refresh, investments, liabilities, joint views, automatic transfer matching, and automatic category confirmation.
- More than ten Production Items or paid-plan enrollment.
