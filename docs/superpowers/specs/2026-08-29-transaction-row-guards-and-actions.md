# Transaction row guards and actions

## Goal

Prevent expense transactions from being left without a spending category and make row-level ledger actions obvious and horizontal.

## Behaviour

- A negative transaction amount is an expense. Its category selector must offer the fixed spending categories only; it must not offer the income-only empty category.
- If an existing expense has no category, show a disabled `Choose a category` placeholder. The server action must reject attempts to persist a null category for an expense.
- Positive amounts may use the empty `Income / no spending category` option.
- Category and note forms use visibly bordered compact Save buttons.
- Report inclusion, Edit, and Delete are inline compact buttons. The inclusion control states its next action and replaces the separate included/excluded status text.

## Verification

- Unit test that a negative transaction cannot use the income-only empty category in the guard helper.
- Unit test that the category update action rejects a negative transaction with no category.
- Existing transaction, lint, and production-build checks remain green.
