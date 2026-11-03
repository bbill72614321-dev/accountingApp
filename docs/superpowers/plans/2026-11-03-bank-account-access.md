# Bank account access visibility

Scope: Show names/masks and last verified access for each bank connection. After update mode, compare access against the snapshot displayed before opening Link. Preserve historical accounts and transactions.

- [x] Save the account IDs returned by successful accounts/get and their check time on bank_items. NULL is an unverified legacy connection; [] is confirmed no shared accounts.
- [x] Render current, missing and unverified accounts on the bank page, in English and Traditional Chinese.
- [x] Capture the pre-Link baseline in the client so a concurrent webhook does not erase the comparison. Return verified accounts after update completion and show added/restored, retained and removed groups. This summary lasts until a full page reload; current access persists.
- [x] Test comparison, empty/unknown states, scoped persistence and failure behavior; run lint, tests and production build.

Deployment: apply 202611030001_bank_account_access_snapshot.sql before deploying the application. It adds a nullable column without changing existing data. Existing connections become verified on their next successful sync or account-access update. Do not backfill authorization from historical bank_accounts. A first check cannot reconstruct earlier permission changes.

Limitations: account IDs define identity; this feature does not merge duplicate accounts or transactions. Account availability is as of the displayed check, not a live guarantee. Database migration and a real OAuth flow must be verified in a deployment environment; this implementation does not operate production bank connections.
