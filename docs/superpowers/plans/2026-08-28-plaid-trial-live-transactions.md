# Plaid Trial Live Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task.

**Goal:** Connect each user's Trial-plan bank privately, import 90 days, and require confirmation before reporting.

**Architecture:** A single server-side `syncOwnedItem` workflow handles initial/cursor sync. Link exchange and verified webhooks call it. The browser only sees a short-lived Link token; encrypted permanent tokens stay in a private table.

**Tech Stack:** Next.js, TypeScript, Supabase RLS, Plaid SDK, react-plaid-link, Node crypto, Vitest.

**Spec:** `.scratch/plaid-live-transactions/spec.md`

## Global Constraints

- Use Trial, US, Transactions-only, 90 days, and at most ten Items.
- Store access tokens with AES-256-GCM; never expose a Plaid secret/token publicly.
- Imported rows default to `needs_review`; reports require confirmed, posted, included USD entries.
- Use `/transactions/sync` and verified webhooks; do not call paid Transactions Refresh.
- Automated tests use fake Plaid only; Sandbox and one real Trial Item are human-run checks.

### Task 1: Schema, RLS, and report eligibility

**Files:** Create `supabase/migrations/202608280001_plaid_transactions.sql`; modify RLS SQL tests, monthly summary/export implementation, and monthly-summary tests.

**Interfaces:** Add public `bank_items`/`bank_accounts`, secret-only `plaid_item_secrets`, and transaction import fields. Export `isReportEligible(transaction)`.

- [ ] Write this failing test:

```ts
expect(isReportEligible({ includeInReport: true, providerPending: false, reviewStatus: 'confirmed', currency: 'USD' })).toBe(true)
expect(isReportEligible({ includeInReport: true, providerPending: false, reviewStatus: 'needs_review', currency: 'USD' })).toBe(false)
```

- [ ] Run `npm test -- src/features/transactions/monthly-summary.test.ts`; expect the missing helper failure.
- [ ] Create Item/account RLS tables, a secret table with no authenticated policy, Plaid source/import indexes, and manual-record backfill. Implement report eligibility.
- [ ] Run `npm test -- src/features/transactions/monthly-summary.test.ts && npm run test:db`.
- [ ] Commit: `feat: add private plaid transaction schema`.

### Task 2: Secure Plaid adapter and owned-Item sync

**Files:** Modify environment validation and package manifests; create Plaid client/crypto/types, crypto tests, `sync-owned-item` plus tests, and server-only Supabase admin client.

**Interfaces:** `getPlaidEnv()`, `encryptAccessToken()`, `decryptAccessToken()`, fakeable `PlaidGateway`, and `syncOwnedItem({ userId, itemId, gateway, repository })`.

- [ ] Write failing tests:

```ts
expect(decryptAccessToken(encryptAccessToken('access-production-secret'))).toBe('access-production-secret')
await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })
await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })
expect(repository.transactions).toHaveLength(1)
```

- [ ] Run `npm test -- src/lib/plaid/crypto.test.ts src/features/plaid/sync-owned-item.test.ts`; expect missing module failure.
- [ ] Install `plaid` and `react-plaid-link`. Validate server-only env, encrypt AES-256-GCM, and implement sync pagination/upsert/removal/cursor logic. Normalize every provider amount with `-Math.round(providerAmount * 100)`.
- [ ] Add and run cross-user failure test: `syncOwnedItem` for `user-b` against `item-a` rejects `Not found`.
- [ ] Run `npm test -- src/lib/plaid src/features/plaid && npm run lint` and commit `feat: add secure plaid transaction sync`.

### Task 3: Link, webhook, and review UI

**Files:** Create Link-token, exchange, webhook routes; Bank connections page/list/button; modify navigation, transaction page/table/actions, translations, and CSS.

**Interfaces:** Link token requests US Transactions and 90 days. Exchange encrypts/stores token then calls `syncOwnedItem`. Webhook verifies Plaid before syncing. `confirmImportedTransaction(formData)` confirms only an owned, posted import.

- [ ] Write failing test that confirming another user's imported transaction rejects `Unable to confirm transaction`.
- [ ] Run `npm test -- src/app/actions/transactions.test.ts`; expect missing action failure.
- [ ] Add bilingual capacity display (warn at 8, block at 10), Link trigger, Item/account states, source/review filters, distinct Bank pending/Needs review labels, confirmation, and existing exclude action.
- [ ] Run `npm test && npm run lint && npm run build`; commit `feat: add plaid connection review UI`.

### Task 4: Human-controlled external setup and launch check

**Files:** Create `docs/plaid-trial-setup.md`; modify `.env.example` and README.

- [ ] Document Trial enrollment, OAuth redirect URI, webhook URL, Vercel variable names, and safe 32-byte encryption-key generation.
- [ ] Human runs Sandbox Link/exchange/sync/update/removal/isolation checklist.
- [ ] Human connects exactly one real Trial Item, personally completes bank consent, and verifies a report changes only after confirmation.
- [ ] Run `npm run check`; commit `docs: add plaid trial setup checklist`.

## Plan self-review

- Schema/RLS, encryption, Trial limits, 90-day Link, amount normalization, sync/webhooks, review UI, and fake/Sandbox/Trial verification are each covered.
- The one new integration seam is `syncOwnedItem`; all other entry points delegate to it.
