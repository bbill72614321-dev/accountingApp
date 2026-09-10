# Default Monthly Reporting Design

## Goal

Make every posted USD transaction part of its month by default. The user can exclude a transaction only by choosing **Skip**. The Monthly Summary and Transactions pages edit the same transaction fields and therefore always stay in sync.

## Decisions

- Posted transactions are included in Monthly Summary by default, regardless of whether they have a category.
- Bank-pending Plaid transactions never enter Monthly Summary until Plaid reports them as posted.
- Existing skipped transactions remain skipped. Existing transactions that are neither skipped nor included become included.
- Skip removes a transaction from Monthly Summary totals, charts, exports, and the Monthly Summary transaction list. It remains available in Transactions with its category, note, split, and review checkbox intact.
- Splits affect Monthly Summary only when the transaction is not skipped: its effective monthly amount is the personal share. A skipped split remains visible in Transactions and Reimbursements.
- Category and note are fields on `transactions`; editing either from Monthly Summary or Transactions updates the same record.
- Changing a category saves immediately when the select value changes. Notes retain their explicit Save control.
- A new independent `user_reviewed_at` timestamp backs an **Reviewed / 已看過** checkbox. It is only the user’s personal review marker and changes no financial or Plaid state.
- Merchant rules are default categories. A new Plaid transaction uses the matching normalized merchant rule as `source_category`; no match yields a null category and the UI says **Choose a category / 請選擇分類**.

## Data model and migration

Create one forward-only migration.

1. Add `transactions.user_reviewed_at timestamptz null`.
2. Change `transactions.include_in_report` default to `true`.
3. Preserve explicit skips: rows with `excluded_from_report = true` remain `include_in_report = false`.
4. Convert all non-skipped existing rows to `include_in_report = true`.
5. Keep the existing disposition constraint: a transaction cannot be both included and skipped.
6. Add an index suitable for the monthly review checkbox only if query plans show it is needed; no speculative index.

No existing category, note, split, account-source, or Plaid link data is deleted or rewritten.

## Report eligibility and totals

`isReportEligible` remains the single financial gate. A transaction is eligible only when:

- `include_in_report = true`;
- `excluded_from_report = false`;
- it is not provider-pending; and
- its currency is USD.

`review_status` and `user_reviewed_at` never alter eligibility. Incoming transactions continue to affect net amount but not spending categories. For eligible outgoing transactions, `totalSpendingCents` must include category-null values as well as categorized values.

Monthly summary data gains an uncategorized spending amount. Category charts use a virtual **Uncategorized / 未分類** slice for this amount. It is display-only, not a new database enum category, and links to the month’s category-null transaction filter.

## Shared transaction editing surface

Extract the existing row-level transaction controls into a reusable transaction table configuration used by both pages.

Both locations provide:

- merchant, account source, date, colored amount, category, note, and split summary;
- category select that immediately calls the category action and refreshes the current view;
- note input with its existing explicit Save control;
- Split dialog for outgoing transactions;
- Reviewed checkbox;
- Skip for report-visible transactions and Undo skip for skipped transactions.

Transactions shows every transaction, including skipped and bank-pending records. Monthly Summary shows only eligible transactions. It does not show a separate include/exclude toggle because inclusion is the default. Manual-only Edit/Delete controls remain available from Transactions; they are not required in Monthly Summary.

## Plaid merchant-rule application

The server-only Plaid repository loads the owning user’s merchant rules once per upsert batch, maps `normalized_merchant` to category, and writes that category as `source_category` for each imported record. A new transaction without a rule receives null. Existing `category_override` is never overwritten by Plaid synchronization.

Settings remains the user-visible list of these default-category rules. Deleting a rule affects only future Plaid imports; it does not alter historical transactions.

## Review checkbox

`setTransactionReviewed` verifies ownership, accepts a boolean checkbox value, and writes `user_reviewed_at` to the current timestamp or null. It revalidates Transactions and Monthly Summary. The UI makes reviewed rows less prominent without changing report inclusion, splitting, or the existing bank review-status field.

## Error handling and security

- All new mutations require the authenticated owner and use existing RLS ownership checks.
- Failed immediate category saves restore the select to its saved value and present the existing localized error path.
- The checkbox restores its prior value if its server action fails.
- Plaid sync reads rules through the service-role repository only after the item’s owner is established; it queries rules by that owner’s user ID.

## Verification

- Unit tests: report eligibility, uncategorized spending, split-effective totals, category-order/chart rows, and review-toggle validation.
- Repository tests: a matching merchant rule sets `source_category`; no match is null; a pre-existing override remains untouched.
- Component tests: category control has no Save button; reviewed checkbox renders in each configured table mode; monthly table omits skipped and pending rows.
- Database test: the migration preserves skipped rows, enables all other existing rows by default, and RLS prevents cross-user review toggles.
- Full verification: `npm run check`, SQL migration execution in Supabase, then a production smoke test covering a categorized transaction, an uncategorized transaction, a skipped split, and an imported merchant-rule match.

## Out of scope

- Automatically matching Venmo reimbursement payments.
- Adding person names to split payments.
- Changing the approved category list.
- Changing exported Excel/PDF layout beyond the new inclusion and uncategorized totals inherited from Monthly Summary.
