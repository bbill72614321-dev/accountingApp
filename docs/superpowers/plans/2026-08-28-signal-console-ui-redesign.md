# Signal Console UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light Phase 1 presentation with the approved dark Signal Console interface while making the ledger page faster to scan and act on.

**Architecture:** Keep the existing Next.js server pages and Supabase queries; no schema, access-policy, or syncing changes are required. Add small pure UI-state helpers for testable transaction presentation/filter behavior, then apply a single tokenized CSS system across the app shell, pages, and reusable components. Existing routes and server actions remain the application boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 utility classes plus `src/app/globals.css`, Vitest, Supabase SSR.

**Spec:** `docs/superpowers/specs/2026-08-28-signal-console-ui-redesign.md`

## Global Constraints

- Preserve existing authentication, per-user data isolation, transaction actions, categories, exports, reports, and USD-only behavior.
- Do not add Plaid, Venmo syncing, database migrations, or dependencies.
- Use zh-TW and English for every new visible UI label and status.
- Use semantic CSS tokens, visible keyboard focus, and WCAG AA contrast; color cannot be the sole status signal.
- Respect `prefers-reduced-motion`; transition only opacity/color over 150–200 ms.
- Implement each behavioral change test-first and observe its targeted test fail before implementation.

---

## File structure

- `src/app/globals.css` — Signal Console color tokens, layout primitives, responsive ledger/table styles, print overrides, and focus/reduced-motion rules.
- `src/app/(app)/layout.tsx` — app rail/header shell, brand, account block, and main content container.
- `src/components/app-nav.tsx` — semantic rail navigation with active state and accessible labels.
- `src/lib/i18n.ts` — localized labels for overview metrics, review state, clear filters, results, status, manual source, and empty filter state.
- `src/lib/ui-state.ts` — pure status and URL-query helpers used by the transactions page/table.
- `src/lib/ui-state.test.ts` — unit tests for the new helpers.
- `src/app/(app)/dashboard/page.tsx` — console header, primary spend readout, net/review support readouts, category signal, and recent ledger query.
- `src/components/category-bars.tsx` — ranked category signal presentation with accessible text values.
- `src/app/(app)/transactions/page.tsx` — filter/query parsing, summary strip, and desktop/mobile ledger container.
- `src/components/transaction-table.tsx` — aligned desktop table and responsive two-line transaction rows with source/review/action states.
- `src/app/(app)/reports/monthly/page.tsx` — dark in-app monthly review with preserved clean printable report.
- `src/app/(auth)/login/page.tsx`, `src/app/(app)/transactions/new/page.tsx`, `src/components/manual-transaction-form.tsx` — focused dark auth and entry form presentation.

### Task 1: Define localized, testable ledger states

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/lib/ui-state.ts`
- Modify: `src/lib/ui-state.test.ts`

**Interfaces:**
- Produces `transactionStatus(pending: boolean): 'needsReview' | 'ready'`.
- Produces `transactionSourceLabel(source: string): 'manual' | 'imported'`.
- Produces `isPendingFilter(value: string | undefined): boolean`.
- Adds dictionary keys `spentThisMonth`, `needsReview`, `ready`, `manual`, `imported`, `clearFilters`, `results`, and `noFilteredTransactions` in both languages.

- [ ] **Step 1: Write failing tests for the status and query helpers**

```ts
it('labels pending entries as needing review', () => {
  expect(transactionStatus(true)).toBe('needsReview')
  expect(transactionStatus(false)).toBe('ready')
})

it('only treats the pending query value as the review filter', () => {
  expect(isPendingFilter('pending')).toBe(true)
  expect(isPendingFilter('all')).toBe(false)
  expect(isPendingFilter(undefined)).toBe(false)
})
```

- [ ] **Step 2: Run the targeted test and verify it fails because the helpers are missing**

Run: `npm test -- src/lib/ui-state.test.ts`

Expected: FAIL with an import/export error for `transactionStatus` and `isPendingFilter`.

- [ ] **Step 3: Add the smallest helper implementation and paired translations**

```ts
export function transactionStatus(pending: boolean) {
  return pending ? 'needsReview' : 'ready'
}

export function isPendingFilter(value: string | undefined) {
  return value === 'pending'
}
```

Add all listed dictionary keys to the `Dictionary` type and both `en` and `zh-TW` records, using the wording in the approved spec.

- [ ] **Step 4: Run targeted and full unit tests**

Run: `npm test -- src/lib/ui-state.test.ts && npm test`

Expected: PASS with no changed existing test failures.

- [ ] **Step 5: Commit the independently testable state layer**

```bash
git add src/lib/i18n.ts src/lib/ui-state.ts src/lib/ui-state.test.ts
git commit -m "feat: add transaction review UI state"
```

### Task 2: Establish the dark responsive application shell and forms

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/app-nav.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(app)/transactions/new/page.tsx`
- Modify: `src/components/manual-transaction-form.tsx`

**Interfaces:**
- Consumes the existing `Dictionary` and `AppNav` route array.
- Produces consistent CSS classes `app-shell`, `app-rail`, `console-page`, `console-panel`, `primary-action`, `form-stack`, and `ledger-table` for Tasks 3–4.

- [ ] **Step 1: Add a failing navigation-state regression test for nested transaction routes**

```ts
it('keeps Transactions active on its add and edit routes', () => {
  expect(isCurrentNavigationPath('/transactions/new', '/transactions')).toBe(true)
  expect(isCurrentNavigationPath('/transactions/abc/edit', '/transactions')).toBe(true)
})
```

- [ ] **Step 2: Run the targeted test and verify it fails with the current exact-path behavior**

Run: `npm test -- src/lib/ui-state.test.ts`

Expected: FAIL because `/transactions/new` does not equal `/transactions`.

- [ ] **Step 3: Implement the smallest active-route fix**

```ts
export function isCurrentNavigationPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
```

- [ ] **Step 4: Implement the shared UI system and shell**

Use the approved token hierarchy in `globals.css`: near-black blue-charcoal canvas, one raised surface level, cool borders, mint positive/focus, warm-red outgoing/destructive, amber review state, and soft-white text. Replace the current `aside` layout with a labelled brand rail, grouped navigation, persistent user/sign-out block, and a compact responsive header. Use real `<button>`, `<label>`, form controls, and existing server actions; do not introduce client-side navigation state.

Apply the `console-page`/`form-stack` classes to the login, new transaction, and reusable manual form so these screens are focused rather than empty light pages. Keep all selectors scoped by component class; do not globally restyle `table` in a way that breaks printing.

- [ ] **Step 5: Verify accessibility and build**

Run: `npm test -- src/lib/ui-state.test.ts && npm run lint && npm run build`

Expected: PASS. Inspect at 375 px and 1280 px: rail/header remains usable, all controls have visible focus, and text is legible on dark surfaces.

- [ ] **Step 6: Commit the shell and foundation**

```bash
git add src/app/globals.css 'src/app/(app)/layout.tsx' src/components/app-nav.tsx 'src/app/(auth)/login/page.tsx' 'src/app/(app)/transactions/new/page.tsx' src/components/manual-transaction-form.tsx src/lib/ui-state.ts src/lib/ui-state.test.ts
git commit -m "feat: add dark signal console app shell"
```

### Task 3: Build the dashboard and monthly review surfaces

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/category-bars.tsx`
- Modify: `src/app/(app)/reports/monthly/page.tsx`

**Interfaces:**
- Consumes `summarizeMonth`, `CategoryBars`, `formatUsd`, existing report route, and transaction rows from Supabase.
- Produces `pendingCount` and a limited recent activity list without changing the transaction schema.

- [ ] **Step 1: Write a failing summary test for pending-count semantics**

Extend `src/features/transactions/monthly-summary.test.ts` with:

```ts
it('counts only in-month pending transactions for review', () => {
  expect(countPendingMonth([
    tx({ pending: true }),
    tx({ pending: false }),
    tx({ pending: true, date: '2026-07-31' }),
  ], '2026-08')).toBe(1)
})
```

- [ ] **Step 2: Run the focused test and verify it fails because `countPendingMonth` is missing**

Run: `npm test -- src/features/transactions/monthly-summary.test.ts`

Expected: FAIL with a missing export error.

- [ ] **Step 3: Add the minimal pure summary helper**

```ts
export function countPendingMonth(transactions: readonly SummaryTransaction[], month: `${number}-${string}`) {
  return transactions.filter((transaction) => transaction.pending && transaction.date.startsWith(`${month}-`)).length
}
```

- [ ] **Step 4: Build the dashboard and report presentation**

Select `raw_description`, `note`, `category`, `amount`, `date`, and `pending` on the dashboard query so the page can render recent activity and use `countPendingMonth`. Render the primary `spentThisMonth` readout, net, review count linking to `/transactions?month=<month>&review=pending`, ranked category bars, then up to five latest activity rows.

Restyle the in-app report with Signal Console panels and preserve its report tables. Keep `@media print` explicitly white/black and hide only shell/action elements, so Save as PDF remains readable.

- [ ] **Step 5: Run unit tests, lint, build, and manual visual checks**

Run: `npm test -- src/features/transactions/monthly-summary.test.ts && npm run lint && npm run build`

Expected: PASS. Check dashboard with no data, pending data, and mixed income/expense data; the pending link must carry both `month` and `review=pending`.

- [ ] **Step 6: Commit the monthly surfaces**

```bash
git add 'src/app/(app)/dashboard/page.tsx' src/components/category-bars.tsx 'src/app/(app)/reports/monthly/page.tsx' src/features/transactions/monthly-summary.ts src/features/transactions/monthly-summary.test.ts
git commit -m "feat: add signal console monthly review"
```

### Task 4: Rebuild the transactions page as the operational ledger

**Files:**
- Modify: `src/app/(app)/transactions/page.tsx`
- Modify: `src/components/transaction-table.tsx`
- Modify: `src/lib/ui-state.test.ts`

**Interfaces:**
- Consumes `isPendingFilter`, `transactionStatus`, `transactionSourceLabel`, `canDeleteTransaction`, and the existing transaction server actions.
- Requires the page query to select `pending` in addition to the current `TransactionRow` columns.
- Extends `TransactionRow` with `pending: boolean`.

- [ ] **Step 1: Write failing status/source presentation tests**

```ts
it('labels only manual transactions as manual', () => {
  expect(transactionSourceLabel('manual')).toBe('manual')
  expect(transactionSourceLabel('plaid')).toBe('imported')
})
```

- [ ] **Step 2: Run the targeted test and verify it fails because the source helper is missing**

Run: `npm test -- src/lib/ui-state.test.ts`

Expected: FAIL with a missing `transactionSourceLabel` export.

- [ ] **Step 3: Add the minimal helper and make the test pass**

```ts
export function transactionSourceLabel(source: string) {
  return source === 'manual' ? 'manual' : 'imported'
}
```

- [ ] **Step 4: Implement the scan-first ledger**

Parse `review` from `searchParams` in `transactions/page.tsx`; if `isPendingFilter(review)`, apply `.eq('pending', true)`. Retain month/category/search behavior. Render a result-count label, primary add action, filter controls, a clear-filters link only when filters are active, and a three-part summary strip that links its review count to the same pending query.

In `TransactionTable`, retain existing category/note save forms, include/exclude control, edit route, and manual-only delete action. Present desktop columns as Merchant, Category, Date, Amount, Note, Status, Actions. Add source/status text labels (`Manual`/`Imported`, `Needs review`/`Ready`) and responsive CSS that changes a row to a two-line ledger list at narrow widths. Right-align amounts and use the existing formatted USD sign convention. Provide the new filtered-empty message when any valid filter is present; otherwise keep the current no-transactions message.

- [ ] **Step 5: Run regression checks and exercise the main interaction paths**

Run: `npm test -- src/lib/ui-state.test.ts && npm test && npm run lint && npm run build`

Expected: PASS. Manually check at desktop and 375 px: category/note saves, include/exclude, edit, manual delete, review filter, clear filter, keyboard focus, and table/list legibility.

- [ ] **Step 6: Commit the operational ledger**

```bash
git add 'src/app/(app)/transactions/page.tsx' src/components/transaction-table.tsx src/lib/ui-state.ts src/lib/ui-state.test.ts
git commit -m "feat: redesign transactions as signal ledger"
```

### Task 5: Final responsive verification and integration commit

**Files:**
- Modify if necessary: only files listed in Tasks 1–4.
- Verify: `PRODUCT.md`, `docs/superpowers/specs/2026-08-28-signal-console-ui-redesign.md`, and this plan.

- [ ] **Step 1: Run the full production-quality gate**

Run: `npm run check`

Expected: lint, all Vitest tests, and Next.js production build PASS.

- [ ] **Step 2: Run the existing end-to-end smoke suite if the local environment variables are available**

Run: `npm run test:e2e`

Expected: PASS. If credentials/services are intentionally unavailable, record the exact blocker and do not claim the suite passed.

- [ ] **Step 3: Visually inspect the signed-in app at desktop and mobile widths**

Check Login, Dashboard, Transactions, New transaction, Monthly report, and Settings. Verify no horizontal clipping except the intentional print report table, no low-contrast text, no light-background remnants, and no regression in report export actions.

- [ ] **Step 4: Commit the approved product/design/plan records if they are still uncommitted**

```bash
git add PRODUCT.md .gitignore docs/superpowers/specs/2026-08-28-signal-console-ui-redesign.md docs/superpowers/plans/2026-08-28-signal-console-ui-redesign.md
git commit -m "docs: record signal console design"
```

## Plan self-review

- **Spec coverage:** Task 2 implements the rail/header, token system, focus/motion, mobile shell, forms, and bilingual foundations. Task 3 implements monthly readouts, category signal, recent activity, and printable reports. Task 4 implements all required transaction columns, filters, source/review statuses, desktop/mobile ledger behavior, manual-only deletion, and empty states. Task 5 provides the full verification and document integration gate. Plaid/data schema changes are explicitly excluded.
- **Placeholder scan:** No TODO/TBD placeholders remain; each task identifies exact files, test code, expected failure, implementation boundary, and verification command.
- **Type consistency:** Tasks use `pending: boolean`, `TransactionRow`, `SummaryTransaction`, `countPendingMonth`, `transactionStatus`, `transactionSourceLabel`, and `isPendingFilter` consistently.
