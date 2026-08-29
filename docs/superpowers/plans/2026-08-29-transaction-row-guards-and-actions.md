# Transaction Row Guards and Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent uncategorized expenses and make transaction-row controls clear, compact buttons.

**Architecture:** A pure helper decides whether the income-only empty category may be shown. The category action independently reads the owned transaction amount before invoking the existing category RPC. CSS supplies one shared compact-button treatment for in-row saves and actions.

**Tech Stack:** Next.js Server Actions, Supabase, TypeScript, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-08-29-transaction-row-guards-and-actions.md`

## Global Constraints

- Negative amounts are expenses and must have a category.
- Positive amounts may have no spending category.
- Preserve owner-scoped transaction updates.
- Keep all controls keyboard accessible and inline on desktop.

### Task 1: Category eligibility guard

**Files:** Modify `src/features/transactions/validation.ts`; test `src/features/transactions/validation.test.ts`.

- [ ] Write a failing test for `canUseIncomeCategory(-1) === false` and `canUseIncomeCategory(1) === true`.
- [ ] Run `npm test -- src/features/transactions/validation.test.ts`; expect a missing-helper failure.
- [ ] Export `canUseIncomeCategory(amountCents: number): boolean` returning `amountCents >= 0`.
- [ ] Re-run the focused test and commit `feat: guard expense categories`.

### Task 2: Server action and row UI

**Files:** Modify `src/app/actions/transactions.ts`, `src/app/actions/transactions.test.ts`, `src/components/transaction-table.tsx`, and `src/app/globals.css`.

- [ ] Write a failing action test where the owned transaction has a negative amount and no category is submitted; expect `Unable to update transaction category`.
- [ ] Run `npm test -- src/app/actions/transactions.test.ts`; expect a failure.
- [ ] Fetch the owned transaction amount before calling the RPC; reject an invalid empty category for an expense.
- [ ] Render an income-only empty option only when `canUseIncomeCategory(row.amount_cents)` is true; otherwise render a disabled `Choose a category` option.
- [ ] Replace transparent text controls with shared visible compact buttons. Place report inclusion, edit, and delete controls in one horizontal action row.
- [ ] Run `npm test -- src/app/actions/transactions.test.ts src/features/transactions/validation.test.ts && npm run lint && npm run build` and commit `feat: clarify transaction row actions`.
