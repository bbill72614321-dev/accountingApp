# Default Monthly Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every posted USD transaction appear in monthly reporting by default, with shared category/note/split data, an explicit skip action, automatic merchant-rule categories, and a personal review checkbox.

**Architecture:** `transactions` remains the single source of truth. Reporting, transaction history, exports, charts, splits, and reimbursements all derive from it. A migration changes the default inclusion state while preserving existing skipped records. Small client controls invoke server actions and refresh both pages.

**Tech Stack:** Next.js App Router, TypeScript, React, Supabase/Postgres, Plaid Transactions Sync, Vitest, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-10-default-monthly-reporting-design.md`

## Global constraints

- A posted (`provider_pending = false`) USD transaction is included by default, even without a category.
- A pending transaction never contributes to monthly totals until Plaid reports it posted.
- Skipping removes a transaction from the dashboard list, totals, charts, and export, but never removes it from Transactions, its split, or reimbursements.
- `user_reviewed_at` is a private visual marker only. It must not change report inclusion, category, note, split, or Plaid state.
- A split changes monthly spend to `personal_amount_cents`; the reimbursement record remains independent.
- `category_override` and `note` are shared fields, so both pages always show the same values.
- Merchant rules set `source_category` only while importing. A user choice remains an override.
- Keep manual-entry validation requiring an expense category; the new uncategorized state is for imported items.
- Do not expose service-role or Plaid secrets to the browser. Do not edit `.env.local`.
- User must apply the production migration in Supabase before the corresponding deployed behavior is relied upon.

---

## Task 1: Add the reporting-default and personal-review migration

**Files:**
- Create: `supabase/migrations/202609120001_default_monthly_reporting.sql`
- Modify: `supabase/tests/manual_ledger_rls.test.sql`

- [ ] **Step 1: Write failing database assertions.**

  Add pgTAP assertions for the migration invariants: non-skipped transaction becomes included, skipped stays excluded, and a user can only update their own `user_reviewed_at` value through RLS.

- [ ] **Step 2: Run the database test to confirm the assertions fail before the migration.**

  Run: `npm run test:db`

  Expected: failures because `user_reviewed_at` and the default/report backfill do not exist.

- [ ] **Step 3: Write the migration.**

  In one transaction:

  ```sql
  alter table public.transactions
    add column if not exists user_reviewed_at timestamptz;

  alter table public.transactions
    alter column include_in_report set default true;

  update public.transactions
    set include_in_report = true
    where excluded_from_report = false;

  update public.transactions
    set include_in_report = false
    where excluded_from_report = true;
  ```

  Preserve the existing constraint that prevents a row being both included and excluded. Add no trigger: the existing transaction update policy owns access control.

- [ ] **Step 4: Re-run the database test.**

  Run: `npm run test:db`

  Expected: pass, or document that the local Supabase test runtime is not configured and validate the SQL against a disposable/local instance before asking the user to apply it.

- [ ] **Step 5: Commit the migration.**

  ```bash
  git add supabase/migrations/202609120001_default_monthly_reporting.sql supabase/tests/manual_ledger_rls.test.sql
  git commit -m "feat: default posted transactions into reports"
  ```

## Task 2: Make reporting and exports account for uncategorized expenses

**Files:**
- Modify: `src/features/transactions/monthly-summary.ts`
- Modify: `src/features/transactions/monthly-export.ts`
- Modify: `src/features/transactions/category-breakdown.ts`
- Modify: `src/features/transactions/monthly-summary.test.ts`
- Modify: `src/features/transactions/monthly-export.test.ts`
- Modify: `src/features/transactions/category-breakdown.test.ts`

- [ ] **Step 1: Add failing unit tests.**

  Cover: an uncategorized outgoing included transaction increases total monthly spending; its split uses its personal amount; it appears as an `Uncategorized` chart/export row; incoming uncategorized money remains income and never creates a spending slice; skipped and pending rows remain absent.

- [ ] **Step 2: Run focused tests.**

  Run: `npm test -- monthly-summary monthly-export category-breakdown`

  Expected: new assertions fail.

- [ ] **Step 3: Update summary semantics.**

  Keep `isReportEligible` as the shared gate (`include_in_report`, not excluded, USD, not provider pending). In `summarizeMonth`, calculate total spending from every negative effective report amount, not only categorized rows. Add `uncategorizedSpendingCents` for negative eligible rows where the effective category is null. Do not add income to category spending.

- [ ] **Step 4: Update chart/export breakdown semantics.**

  Introduce a display-only key `Uncategorized` in the breakdown type. Append it only when its expense amount is positive, include it in descending sort, and exclude it from the `without Home` view only by applying Home filtering to actual categories. Use the localized uncategorized label in the CSV/PDF-facing export output rather than the old income label for outgoing null-category records.

- [ ] **Step 5: Re-run focused tests.**

  Run: `npm test -- monthly-summary monthly-export category-breakdown`

  Expected: pass.

- [ ] **Step 6: Commit.**

  ```bash
  git add src/features/transactions/monthly-summary.ts src/features/transactions/monthly-export.ts src/features/transactions/category-breakdown.ts src/features/transactions/*.test.ts
  git commit -m "feat: report uncategorized expenses"
  ```

## Task 3: Apply merchant rules when Plaid imports transactions

**Files:**
- Create: `src/features/plaid/default-category.ts`
- Create: `src/features/plaid/default-category.test.ts`
- Modify: `src/features/plaid/supabase-repository.ts`
- Modify: `src/features/plaid/sync-owned-item.ts`
- Modify: `src/features/plaid/sync-owned-item.test.ts`

- [ ] **Step 1: Add failing mapper tests.**

  Test normalized merchant matching (case and surrounding whitespace insensitive), no rule returning null, and a matching rule producing a valid `Category` source value. Include a test that an existing `category_override` is never supplied or overwritten by import data.

- [ ] **Step 2: Run focused tests.**

  Run: `npm test -- default-category sync-owned-item`

  Expected: mapper module/test fails until implemented.

- [ ] **Step 3: Implement a pure default-category resolver.**

  It receives imported merchant/description and the owner's merchant-rule rows, normalizes with trim/lowercase, and returns `Category | null`. It must select only exact normalized rule names; no fuzzy matching.

- [ ] **Step 4: Use rules in the repository upsert.**

  In `SupabasePlaidRepository.upsertTransactions`, query the owning user's `merchant_rules` once per sync batch. Resolve every imported transaction and set only `source_category` in the upsert row. Preserve `category_override`, note, split data, exclusion, and `user_reviewed_at` by not including them in the conflict update payload.

- [ ] **Step 5: Re-run focused tests.**

  Run: `npm test -- default-category sync-owned-item`

  Expected: pass.

- [ ] **Step 6: Commit.**

  ```bash
  git add src/features/plaid/default-category.ts src/features/plaid/default-category.test.ts src/features/plaid/supabase-repository.ts src/features/plaid/sync-owned-item.ts src/features/plaid/sync-owned-item.test.ts
  git commit -m "feat: apply merchant category rules on import"
  ```

## Task 4: Align transaction actions with default inclusion

**Files:**
- Modify: `src/app/actions/transactions.ts`
- Modify: `src/features/transactions/validation.ts`
- Modify: `src/app/actions/transactions.test.ts`
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add failing action/validation tests.**

  Verify a null category is accepted for an outgoing imported transaction update, a skip action sets `(include_in_report=false, excluded_from_report=true)`, undo skip sets `(true, false)`, and reviewing only sends an update to `user_reviewed_at`.

- [ ] **Step 2: Run focused tests.**

  Run: `npm test -- transactions validation`

  Expected: the new behavior fails.

- [ ] **Step 3: Implement the action changes.**

  - Relax `updateTransactionCategory` so an outgoing transaction may clear its category; retain the manual entry schema rule.
  - Make `setTransactionExcluded(false)` restore report inclusion (`true`) as well as clearing exclusion.
  - Remove the UI-facing include toggle action path; keep an internal action only if another server route still needs it.
  - Add `setTransactionReviewed(formData)`, accepting transaction id and boolean, updating only `user_reviewed_at` to `now()` or null with the authenticated user's Supabase client.
  - Revalidate `/transactions`, `/dashboard`, `/reimbursements`, reports, and relevant API route after each mutation.
  - Add bilingual dictionary entries for uncategorized, reviewed/unreviewed, mark reviewed, skip, and undo skip as needed by the controls.

- [ ] **Step 4: Re-run focused tests.**

  Run: `npm test -- transactions validation`

  Expected: pass.

- [ ] **Step 5: Commit.**

  ```bash
  git add src/app/actions/transactions.ts src/features/transactions/validation.ts src/app/actions/transactions.test.ts src/lib/i18n.ts
  git commit -m "feat: add review marker and default report actions"
  ```

## Task 5: Replace manual category saves with shared automatic controls

**Files:**
- Create: `src/components/transaction-category-select.tsx`
- Create: `src/components/transaction-reviewed-toggle.tsx`
- Modify: `src/components/transaction-table.tsx`
- Modify: `src/components/transaction-table.test.tsx`
- Modify: `src/components/activity-list.tsx` or replace its dashboard usage in Task 6

- [ ] **Step 1: Add component tests.**

  Test that category selection submits immediately (no Save button), preserves the selected UI value after a successful refresh, restores it and displays an accessible error on server failure, and that review toggling invokes only the review action. Test skip/undo labels and disabled state behavior for a row.

- [ ] **Step 2: Run focused tests.**

  Run: `npm test -- transaction-table transaction-category-select transaction-reviewed-toggle`

  Expected: tests fail while controls do not exist.

- [ ] **Step 3: Implement reusable client controls.**

  `TransactionCategorySelect` owns the select value, calls `updateTransactionCategory` on `onChange` inside a transition, and uses `router.refresh()` after success. It offers the blank `Please choose a category / 請選擇分類` option plus real categories; it must have `aria-label` and an error `role="alert"`.

  `TransactionReviewedToggle` is a labelled checkbox/button, calls `setTransactionReviewed`, and visually changes only its own checked state. It must not call category, report, or split actions.

- [ ] **Step 4: Refactor `TransactionTable`.**

  Remove per-row category Save and report Include controls. Show category select, note editor (still explicit Save), split, review marker, then either Skip or Undo skip. Keep source/account, pending, manual edit/delete, and split presentation. Dim skipped rows only; do not dim reviewed rows. Use one row component for dashboard and transactions through explicit display props, rather than duplicating mutation UI.

- [ ] **Step 5: Re-run focused tests.**

  Run: `npm test -- transaction-table transaction-category-select transaction-reviewed-toggle`

  Expected: pass.

- [ ] **Step 6: Commit.**

  ```bash
  git add src/components/transaction-category-select.tsx src/components/transaction-reviewed-toggle.tsx src/components/transaction-table.tsx src/components/transaction-table.test.tsx src/components/activity-list.tsx
  git commit -m "feat: auto-save shared transaction controls"
  ```

## Task 6: Render monthly transactions with the shared table and support virtual category filtering

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/transactions/page.tsx`
- Modify: `src/features/transactions/merchant-rule.ts`
- Modify: `src/components/category-bars.tsx`
- Modify: `src/lib/i18n.ts`
- Modify: page/component tests covering dashboard and transaction filtering

- [ ] **Step 1: Add failing rendering/filter tests.**

  Cover dashboard showing only report-eligible current-month rows, a skipped row absent from dashboard but present and dimmed in Transactions, a pending row absent from dashboard, and `category=Uncategorized` returning only negative null-category rows.

- [ ] **Step 2: Run focused tests.**

  Run: `npm test -- dashboard transactions category-bars merchant-rule`

  Expected: assertions fail under old activity-list/filter behavior.

- [ ] **Step 3: Update dashboard query and view.**

  Select all fields required by `TransactionTable`: ids, descriptions, source/category override, date, amount, note, report/exclusion flags, pending flags, source, review timestamp, bank account, and split. Query only eligible current-month report rows and render the shared table beneath the summary. Ensure total, net, category cards, pie chart, and export all use the same eligibility/effective split amount logic.

- [ ] **Step 4: Add virtual `Uncategorized` filtering.**

  Extend the URL parser and filter type to admit `Uncategorized`. Map it to both `category_override is null` and `source_category is null`, plus outgoing amount only. Keep ordinary `Category` filtering unchanged. Make the chart legend/link use localized `Uncategorized` while URL uses the stable key.

- [ ] **Step 5: Render virtual breakdown safely.**

  Have `CategoryBars` render the display key with translations and a consistent neutral color; keep the Home-excluded comparison pane behavior unchanged. Never pass `Uncategorized` into an enum-only database column.

- [ ] **Step 6: Re-run focused tests.**

  Run: `npm test -- dashboard transactions category-bars merchant-rule`

  Expected: pass.

- [ ] **Step 7: Commit.**

  ```bash
  git add 'src/app/(app)/dashboard/page.tsx' 'src/app/(app)/transactions/page.tsx' src/features/transactions/merchant-rule.ts src/components/category-bars.tsx src/lib/i18n.ts
  git commit -m "feat: show default transaction reports in monthly view"
  ```

## Task 7: Verify, apply migration, deploy, and smoke-test

**Files:**
- Modify only if verification exposes a concrete fault.

- [ ] **Step 1: Run the full quality gate.**

  Run: `npm run check`

  Expected: lint, all Vitest tests, and production build pass.

- [ ] **Step 2: Review the entire diff.**

  Run:

  ```bash
  git diff main...HEAD --check
  git log --oneline main..HEAD
  ```

  Confirm no secrets, generated artifacts, or unrelated changes are staged.

- [ ] **Step 3: Ask the user to apply the migration exactly once.**

  Direct them to open Supabase SQL Editor and run the contents of `supabase/migrations/202609120001_default_monthly_reporting.sql`. Wait for their `migration done` confirmation; do not claim live behavior before it.

- [ ] **Step 4: Push and wait for Vercel production.**

  Run:

  ```bash
  git push github-user main
  npx vercel ls accounting-app --scope accounting-dev
  npx vercel inspect https://accounting-app-three-orcin.vercel.app --scope accounting-dev --wait
  ```

  Expected: production deployment reports `Ready`.

- [ ] **Step 5: Perform the user smoke test.**

  On the deployed app, check: an existing non-skipped posted transaction is visible in Monthly; skip removes it there but not in Transactions; undo restores it; changing category/note on either page reflects on the other; split changes monthly amount; pending stays out; a merchant rule classifies a new import; and the personal review check has no side effect beyond its mark.
