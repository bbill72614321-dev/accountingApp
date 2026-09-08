# Hide Plaid Full-Edit Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the full Edit link only for manual ledger transactions.

**Architecture:** Reuse the source-based UI-state pattern already used for manual-only deletion. Add one pure helper, then use it to conditionally render the existing transaction-table Edit link. No route, database, or Plaid-sync behavior changes.

**Tech Stack:** Next.js, React, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-hide-plaid-full-edit-design.md`

## Global Constraints

- Plaid rows retain category, note, report-inclusion, and review controls.
- Only `manual` is allowed to open the existing full edit route.
- No database migration or Plaid synchronization change.

---

### Task 1: Gate the full Edit link by transaction source

**Files:**
- Modify: `src/lib/ui-state.ts`
- Modify: `src/lib/ui-state.test.ts`
- Modify: `src/components/transaction-table.tsx`

**Interfaces:**
- Produces: `canEditTransaction(source: string): boolean`, which returns true only when `source === 'manual'`.
- Consumes: `TransactionRow.source` in `TransactionTable`.

- [ ] **Step 1: Write the failing test**

```ts
it('allows full editing only for manual transactions', () => {
  expect(canEditTransaction('manual')).toBe(true)
  expect(canEditTransaction('plaid')).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/ui-state.test.ts`

Expected: FAIL because `canEditTransaction` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
export function canEditTransaction(source: string) {
  return source === 'manual'
}
```

Use the helper to wrap the existing `/transactions/${row.id}/edit` link in `TransactionTable`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/ui-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Run project verification and commit**

Run: `npm run check`

Expected: lint, all Vitest tests, and production build pass.

```bash
git add src/lib/ui-state.ts src/lib/ui-state.test.ts src/components/transaction-table.tsx
git commit -m "fix: hide full edit for imported transactions"
```
