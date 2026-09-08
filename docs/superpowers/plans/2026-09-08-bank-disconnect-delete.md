# Bank Disconnect and Imported-Data Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an owner to revoke one Plaid Item and permanently delete only that bank connection's imported data.

**Architecture:** Add `transactions.bank_item_id` so deleting a bank item cascades to its own imported transactions. Keep Plaid removal and ownership checks in a focused domain use case, exposed by a server action and a confirmed destructive Banks control.

**Tech Stack:** Next.js 16 server actions, TypeScript, Vitest, Supabase Postgres migrations/RLS, Plaid Node SDK, React.

**Spec:** `docs/superpowers/specs/2026-09-08-bank-disconnect-delete-design.md`

## Global Constraints

- Revoke the Plaid Item before deleting local data.
- Never expose Plaid access tokens, client secrets, or provider errors to the browser.
- Delete only the specified owner's item, encrypted secret, linked accounts, and transactions; preserve manual transactions, profiles, auth users, and merchant rules.
- Existing Plaid rows are backfilled only for users with exactly one bank item; ambiguous rows remain untouched.
- Use no new package dependencies.

---

### Task 1: Persist transaction ownership by bank item

**Files:**
- Create: `supabase/migrations/202609080001_bank_item_transaction_ownership.sql`
- Modify: `src/features/plaid/sync-owned-item.ts:38-44,80-85`
- Modify: `src/features/plaid/supabase-repository.ts:20-35`
- Modify: `src/features/plaid/sync-owned-item.test.ts`

**Interfaces:**
- Consumes: `ImportedTransaction.itemId` emitted by `toImportedTransaction`.
- Produces: `transactions.bank_item_id` and `removeTransactions(userId, itemId, externalIds)`.

- [ ] **Step 1: Write a failing test for item-scoped provider removal**

Update the in-memory test repository to record `removeTransactions(userId, itemId, externalIds)`, then add:

```ts
it('scopes provider removals to the synced item', async () => {
  const repository = createRepository()
  const gateway: PlaidGateway = { async syncTransactions() {
    return { added: [], modified: [], removed: [{ transactionId: 'transaction-1' }], nextCursor: 'cursor-1', hasMore: false }
  } }
  await syncOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })
  expect(repository.removals).toEqual([{ userId: 'user-a', itemId: 'item-a', externalIds: ['transaction-1'] }])
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/features/plaid/sync-owned-item.test.ts`

Expected: FAIL because `removeTransactions` does not yet receive `itemId`.

- [ ] **Step 3: Add the ownership migration**

Create this migration:

```sql
alter table public.transactions
  add column bank_item_id uuid references public.bank_items(id) on delete cascade;

update public.transactions as transaction
set bank_item_id = item.id
from public.bank_items as item
where transaction.source = 'plaid'
  and transaction.bank_item_id is null
  and transaction.user_id = item.user_id
  and 1 = (
    select count(*) from public.bank_items as candidate
    where candidate.user_id = transaction.user_id
  );

alter table public.transactions
  add constraint plaid_transactions_require_bank_item
  check (source <> 'plaid' or bank_item_id is not null) not valid;

create index transactions_bank_item_date_idx
  on public.transactions (bank_item_id, transaction_date desc)
  where bank_item_id is not null;
```

Do not validate the new check constraint: ambiguous legacy rows must remain available for repair instead of being guessed.

- [ ] **Step 4: Implement the minimal sync/repository change**

Change the interface and call site:

```ts
removeTransactions(userId: string, itemId: string, externalIds: string[]): Promise<void>
await repository.removeTransactions(userId, itemId, page.removed.map(({ transactionId }) => transactionId))
```

Write `bank_item_id: row.itemId` to the upsert records and constrain provider removals:

```ts
await admin.from('transactions').delete()
  .eq('user_id', userId).eq('source', 'plaid')
  .eq('bank_item_id', itemId).in('external_id', externalIds)
```

- [ ] **Step 5: Run the test and verify GREEN**

Run: `npm test -- src/features/plaid/sync-owned-item.test.ts`

Expected: PASS, including item-scoped removal.

- [ ] **Step 6: Apply and verify the migration in Supabase SQL Editor**

Run the migration once, then query:

```sql
select count(*) as unassigned_plaid_transactions
from public.transactions
where source = 'plaid' and bank_item_id is null;
```

Expected for current production: `0`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202609080001_bank_item_transaction_ownership.sql src/features/plaid/sync-owned-item.ts src/features/plaid/supabase-repository.ts src/features/plaid/sync-owned-item.test.ts
git commit -m "feat: associate plaid transactions with bank items"
```

### Task 2: Build the server-only disconnect use case

**Files:**
- Create: `src/features/plaid/disconnect-owned-item.ts`
- Create: `src/features/plaid/disconnect-owned-item.test.ts`
- Modify: `src/lib/plaid/gateway.ts:6-30`
- Modify: `src/features/plaid/supabase-repository.ts:7-41`

**Interfaces:**
- Consumes: `removeItem({ accessToken })`, `findOwnedItem(userId, itemId)`, and `deleteOwnedItem(userId, itemId)`.
- Produces: `disconnectOwnedItem({ userId, itemId, gateway, repository }): Promise<void>`.

- [ ] **Step 1: Write failing use-case tests**

Create a call-order test:

```ts
it('removes Plaid access before deleting the owned local item', async () => {
  const calls: string[] = []
  const gateway = { async removeItem() { calls.push('plaid') } }
  const repository = {
    async findOwnedItem() { return { accessToken: 'token' } },
    async deleteOwnedItem() { calls.push('database') },
  }
  await disconnectOwnedItem({ userId: 'user-a', itemId: 'item-a', gateway, repository })
  expect(calls).toEqual(['plaid', 'database'])
})
```

Add separate tests that a foreign user gets `Not found` with no provider/database calls, and that a failing provider throws `Unable to remove bank connection` without database deletion.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/features/plaid/disconnect-owned-item.test.ts`

Expected: FAIL because `disconnectOwnedItem` does not exist.

- [ ] **Step 3: Implement the minimal domain boundary**

```ts
export type PlaidItemRemovalGateway = {
  removeItem(input: { accessToken: string }): Promise<void>
}
export type OwnedItemDeletionRepository = {
  findOwnedItem(userId: string, itemId: string): Promise<{ accessToken: string } | null>
  deleteOwnedItem(userId: string, itemId: string): Promise<void>
}
export async function disconnectOwnedItem({ userId, itemId, gateway, repository }: Input) {
  const item = await repository.findOwnedItem(userId, itemId)
  if (!item) throw new Error('Not found')
  try { await gateway.removeItem({ accessToken: item.accessToken }) }
  catch { throw new Error('Unable to remove bank connection') }
  await repository.deleteOwnedItem(userId, itemId)
}
```

Extend the Plaid gateway with `client.itemRemove({ access_token: accessToken })`. Add a user-scoped `bank_items` delete to the Supabase repository using `.select('id').maybeSingle()` and throw if no row was deleted.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- src/features/plaid/disconnect-owned-item.test.ts`

Expected: PASS for success ordering, ownership rejection, and provider-failure preservation.

- [ ] **Step 5: Commit**

```bash
git add src/features/plaid/disconnect-owned-item.ts src/features/plaid/disconnect-owned-item.test.ts src/lib/plaid/gateway.ts src/features/plaid/supabase-repository.ts
git commit -m "feat: revoke and delete owned plaid items"
```

### Task 3: Expose a confirmed bilingual Banks control

**Files:**
- Create: `src/app/actions/banks.ts`
- Create: `src/components/disconnect-bank-form.tsx`
- Create: `src/components/disconnect-bank-form.test.ts`
- Modify: `src/app/(app)/banks/page.tsx:1-10`
- Modify: `src/lib/i18n.ts:5-74`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `disconnectOwnedItem`, `createPlaidGateway(createPlaidClient())`, and `createSupabasePlaidRepository(createAdminClient())`.
- Produces: `disconnectBankItem(formData)` and a client-side confirmed form.

- [ ] **Step 1: Write the failing confirmation-copy test**

Export a pure helper from the component and test it:

```ts
expect(disconnectConfirmation('Chase', 'Disconnect {institution} and permanently delete its imported data? This cannot be undone.'))
  .toBe('Disconnect Chase and permanently delete its imported data? This cannot be undone.')
```

Add the same assertion for the Chinese template and a Chinese institution name.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/disconnect-bank-form.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the server action**

```ts
'use server'
const bankItemIdSchema = z.string().uuid()
export async function disconnectBankItem(formData: FormData) {
  const user = await requireUser()
  const itemId = bankItemIdSchema.safeParse(formData.get('bank_item_id'))
  if (!itemId.success) throw new Error('Invalid bank connection')
  await disconnectOwnedItem({
    userId: user.id, itemId: itemId.data,
    gateway: createPlaidGateway(createPlaidClient()),
    repository: createSupabasePlaidRepository(createAdminClient()),
  })
  revalidatePath('/banks')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports/monthly')
}
```

- [ ] **Step 4: Implement confirmation UI and copy**

Add these English dictionary values:

```ts
disconnectBank: 'Disconnect and delete data',
disconnectBankConfirmation: 'Disconnect {institution} and permanently delete its imported data? This cannot be undone.',
disconnectBankError: 'Unable to remove this bank connection.',
```

Use these Traditional Chinese equivalents:

```ts
disconnectBank: '解除並刪除資料',
disconnectBankConfirmation: '要解除 {institution} 並永久刪除其匯入資料嗎？此操作無法復原。',
disconnectBankError: '無法解除此銀行連線。',
```

The form calls `window.confirm(...)`; false stops submission. Render it beside each bank row with `ledger-button ledger-delete`, and add `settings-row-actions` CSS for aligned desktop controls and wrapped mobile controls.

- [ ] **Step 5: Run the test and verify GREEN**

Run: `npm test -- src/components/disconnect-bank-form.test.ts`

Expected: PASS; the confirmation copy includes the institution and cancellation cannot submit.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/banks.ts src/components/disconnect-bank-form.tsx src/components/disconnect-bank-form.test.ts src/app/'(app)'/banks/page.tsx src/lib/i18n.ts src/app/globals.css
git commit -m "feat: add bank disconnect deletion control"
```

### Task 4: Full verification and production cutover

**Files:**
- Verify: all Task 1-3 files and `supabase/migrations/202609080001_bank_item_transaction_ownership.sql`

- [ ] **Step 1: Run complete verification**

```bash
npm run check
git diff --check
node /Users/liuliyuan/.codex/skills/impeccable/scripts/detect.mjs --json --scope layout src/app/'(app)'/banks/page.tsx src/components/disconnect-bank-form.tsx src/app/globals.css
```

Expected: lint, all tests, production build, whitespace check, and layout detector all pass.

- [ ] **Step 2: Push only after the migration is applied**

```bash
git push github-user main
```

- [ ] **Step 3: Manually verify with one real bank**

1. Sign in as the owner and use the named confirmation to remove the test bank.
2. Verify its Banks row and imported transactions disappear.
3. Verify Dashboard and monthly report no longer include the removed data.
4. Verify at least one manual transaction remains.
5. Query Supabase with the admin client to verify the removed item has no `bank_items`, `bank_accounts`, `plaid_item_secrets`, or `transactions` rows.

