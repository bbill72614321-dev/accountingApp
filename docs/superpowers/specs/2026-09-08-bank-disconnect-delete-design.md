# Bank disconnect and imported-data deletion

## Goal

Let a signed-in owner permanently remove one linked Plaid institution. The operation revokes Plaid access and deletes only that institution's imported records. Manual transactions, other institutions, user accounts, and merchant rules remain intact.

## Current state and migration

At design time, the production database has one Plaid bank item, four linked bank accounts, and 219 imported Plaid transactions. Existing transactions do not yet retain the bank-item identifier required for a per-institution delete.

The migration adds `transactions.bank_item_id`, referencing `bank_items(id)` with `on delete cascade`. It then backfills every Plaid transaction for a user only when that user has exactly one bank item. This is unambiguous for the current production data. A `not valid` check requires all newly written Plaid transactions to have a bank item while leaving any future ambiguous legacy rows untouched rather than guessing their ownership.

All future sync upserts write the originating `bank_item_id`. Plaid transaction removals are also constrained by both owner and bank item.

## Disconnect flow

1. `/banks` renders a destructive action beside each owned institution: **Disconnect and delete data / 解除並刪除資料**.
2. A browser confirmation names the institution and explains that imported data cannot be restored.
3. A server action validates the bank-item UUID and confirms that it belongs to the signed-in user.
4. The server reads and decrypts the access token only in server code, calls Plaid `itemRemove`, then deletes that `bank_items` row.
5. Database foreign keys delete its encrypted token, linked bank accounts, and transactions whose `bank_item_id` points at that item.
6. The action revalidates Banks, Transactions, Dashboard, and monthly report paths.

The browser receives no Plaid token or secret. A user cannot act on another user's item.

## Failure behavior

- Invalid or foreign item IDs fail without contacting Plaid or changing local data.
- If Plaid declines removal, local data remains unchanged and the action returns a safe generic error.
- If Plaid succeeds but local deletion fails, Plaid access is already revoked and the action reports that local cleanup needs retrying; it never claims success.
- The UI disables only its own submission while it is pending and shows an accessible error message.

## Scope boundaries

- Disconnecting one institution deletes all of that institution's Plaid transactions, whether still awaiting review or already confirmed.
- It does not delete manually entered transactions, profiles, auth users, language settings, or merchant rules.
- It does not add a global “delete all account data” feature.

## Verification

Automated tests cover owner authorization, Plaid removal before repository deletion, provider-failure preservation of local data, and future transaction-to-bank-item persistence. Verification also includes lint, the complete unit suite, production build, migration review, and a manual production test: connect an institution, remove it, verify the bank, its Plaid transactions, accounts, and encrypted token are gone while manual data remains.
