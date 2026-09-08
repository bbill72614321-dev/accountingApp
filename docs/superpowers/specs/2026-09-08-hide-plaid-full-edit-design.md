# Hide Plaid Full-Edit Control

## Goal

Prevent imported Plaid transactions from linking to the manual-transaction edit page, which intentionally accepts only manual transactions.

## Behavior

- A manual transaction continues to show the full **Edit** action and can use the existing edit page.
- A Plaid transaction does not show the full **Edit** action.
- Existing safe inline controls for imported transactions remain available: category, note, monthly-report inclusion, and review confirmation.

## Implementation and verification

Add a small source-based UI-state helper used by the transaction table. Test that it returns true only for `manual`, then run the full project checks. This change has no schema, sync, or data migration impact.
