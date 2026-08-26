# Personal Finance Web App Design

**Date:** 2026-08-26  
**Status:** Approved design  
**Audience:** Two family members in the United States

## 1. Purpose

Build a free, private, bilingual personal-finance web application for two family members. Each person signs in separately and sees only their own accounts, transactions, categorization rules, monthly reports, and exports. There is no shared ledger or combined household report.

The application automatically imports read-only transaction data from each person's Chase, American Express, and Bank of America accounts through Plaid. Venmo activity is entered manually or imported from a Venmo CSV statement and reviewed for possible duplication with bank transactions.

## 2. Goals and Non-Goals

### Goals

- Work in a browser on different computers, with a responsive fallback for mobile browsers.
- Support exactly two pre-approved users with email-and-password authentication.
- Keep each user's data strictly isolated from the other user.
- Connect approximately six Plaid Items: one Chase, Amex, and Bank of America login per person.
- Import the most recent 90 days when an account is first connected, then synchronize incremental changes.
- Display a simple transaction list with merchant, category, date, amount, and note.
- Learn each user's merchant categorization choices for future transactions.
- Calculate monthly spending, net amount, and spending by category.
- Export each monthly report as both PDF and Excel.
- Support Traditional Chinese and English interfaces.
- Operate within the free tiers of Plaid Trial, Vercel Hobby, and Supabase Free for the expected two-person workload.

### Non-Goals

- Shared transactions, a household ledger, or combined monthly reports.
- Money movement, bill payment, transfers, or any write access to bank accounts.
- Budgets, overspending alerts, investment tracking, debt management, or forecasting in version 1.
- Automatic access to Venmo's private transaction feed.
- Native Windows or macOS desktop applications in version 1.
- Multi-currency accounting; all amounts are USD.
- Public registration or support for users beyond the two approved email addresses.

## 3. Selected Architecture

### Technology

- **Application:** Next.js with TypeScript.
- **Hosting and server-side APIs:** Vercel Hobby.
- **Authentication and database:** Supabase Auth and PostgreSQL on Supabase Free.
- **Bank connectivity:** Plaid Link and Plaid Transactions on the free US Trial plan.
- **Scheduling:** Plaid transaction webhooks plus one Vercel daily cron job.

### Request and Data Flow

1. A user opens the hosted web application and signs in with an approved email address and password.
2. Supabase Auth issues the user session. Server and database authorization derive ownership from the authenticated user ID, never from a client-supplied owner ID.
3. The user starts Plaid Link. Server-side code creates the Link token and requests only the Transactions product.
4. Plaid returns a public token after consent. Server-side code exchanges it for an access token.
5. The access token is encrypted before database storage. Its encryption key and the Plaid secret exist only in Vercel environment secrets.
6. The application requests 90 days of initial history and stores normalized transactions owned by the authenticated user.
7. Later Plaid webhooks and the daily fallback job invoke incremental `/transactions/sync` operations.
8. The browser reads only rows permitted by Supabase Row Level Security and server-side authorization.

### Free-Tier Assumptions

- The Plaid Trial plan remains limited to 10 lifetime-created Production Items. The planned six Items fit this limit, but removing an Item does not restore a used slot.
- Existing Trial Items currently allow uncapped API calls. A future upgrade to paid Production could introduce subscription and refresh charges and must not occur without an explicit owner decision.
- Vercel Hobby currently supports a daily cron job, which is sufficient for the fallback synchronization.
- Supabase Free may pause a project after a week without activity and provides no production SLA. Regular sync activity should normally keep the project active, but occasional interruption is acceptable for this personal application.
- If any vendor materially changes its free plan, the owners will choose between accepting the cost, reducing automation, or moving services. The application must fail closed rather than silently create charges.

## 4. Security and Privacy

### Data Minimization

- Request only Plaid Transactions access. Do not request Auth, Identity, Transfer, account numbers, or routing numbers.
- Use OAuth connections for Chase, American Express, and Bank of America. The application must never collect or display bank passwords.
- Import only the most recent 90 days at first connection.
- Store the bank name, account nickname, type, and last four digits only when needed for display.
- Do not store uploaded Venmo CSV files after parsing.
- Generate PDF and Excel exports on demand and do not persist generated files on the server.

### Secret and Token Handling

- Keep the Plaid client secret and token-encryption key in Vercel server-side environment secrets.
- Encrypt every Plaid access token at the application layer before inserting it into Supabase.
- Use authenticated encryption with a unique nonce per value and support future key rotation.
- Never return Plaid access tokens to the browser.
- Never write secrets, access tokens, complete transaction payloads, uploaded CSV contents, or generated exports to application logs.

### Access Control

- Allow account creation and use only for two configured email addresses.
- Require email verification and rate-limit login, password reset, import, sync, and export endpoints.
- Apply Row Level Security to every user-owned table.
- Repeat ownership checks in server-side APIs for sensitive operations and exports.
- Ensure user A cannot infer the existence, count, identifiers, or content of user B's records.
- Reject unauthenticated requests and forged or invalid Plaid webhook signatures.

### User Control

- Provide password change and password-reset flows.
- Provide a bank disconnect action that also calls Plaid Item removal.
- When disconnecting, let the user retain imported transactions or delete them.
- Provide account deletion with password re-entry and clear confirmation of the consequences.
- Account deletion removes Plaid connections and all user-owned application data.
- Inform users that they can also review or revoke connections through Plaid Portal.

### Risk Position

Automatic aggregation has non-zero third-party privacy risk. The selected design accepts that risk in exchange for automatic imports and reduces exposure through read-only, least-privilege access. Users who later reject this risk can disconnect Plaid and continue with manual bank CSV entry as a future enhancement; automatic bank synchronization is not possible without a data aggregator or direct bank integration.

## 5. User and Data Model

All user-owned records include an immutable owner ID linked to Supabase Auth. Suggested logical entities are:

- **Profile:** preferred language, approved email, timestamps.
- **Plaid Item:** owner, institution, encrypted access token, sync cursor, connection state, and last successful sync.
- **Financial Account:** owner, Plaid Item, institution, display name, type, subtype, and last four digits.
- **Transaction:** owner, optional financial account, source, external source ID, raw source description, normalized merchant, source category, optional user category override, date, signed amount in cents, note, pending state, monthly-report inclusion state, and timestamps. The displayed category is the user override when present, otherwise the mapped source category.
- **Merchant Rule:** owner, normalized merchant key, selected category, and timestamps.
- **Venmo Import:** owner, file fingerprint, import state, counts, and timestamp. It stores import metadata, not the original file.
- **Venmo Review Match:** owner, staged Venmo row, possible bank transaction, match reasons, confidence inputs, and user decision.
- **Sync Run:** owner or system scope, Item, trigger type, status, non-sensitive error code, counts, and timestamps.

Database constraints must include unique external transaction IDs within the appropriate source and ownership scope. Monetary values are stored as integer cents to avoid floating-point errors.

## 6. Transactions and Categories

### Visible Transaction Fields

The primary transaction list displays:

1. Merchant
2. Category
3. Date
4. Amount
5. Note

Internal source, account, pending status, inclusion status, and synchronization metadata are available in details or filters without cluttering the default table.

### Signed Amount Convention

- Income is positive.
- Spending is negative.
- Refunds reduce spending in their assigned category.
- Transfers between owned accounts and credit-card payments are excluded from monthly calculations by default.
- Every transaction supports a user-controlled include/exclude override.

### Fixed Categories

| English | Traditional Chinese |
|---|---|
| Travel | 旅遊 |
| Grocery | 日常雜貨 |
| Shopping | 購物 |
| Car | 汽車 |
| Dine Out | 外食 |
| Utility | 水電與公共費用 |
| Entertainment | 娛樂 |
| Learning | 學習 |
| Home | 居家 |
| Cat | 貓咪 |
| Other | 其他 |

Plaid's personal-finance category is mapped to one of these fixed categories at import time. The mapping is deterministic and testable.

### Learned Merchant Rules

- When a user changes a transaction category, normalize the merchant name and create or update that user's merchant rule automatically.
- Apply the rule to future imported transactions from the same normalized merchant.
- Do not affect the other user's rules.
- Do not retroactively recategorize older transactions without an explicit future bulk-edit action.
- Let users review and delete rules from Settings.

### Manual Transactions

Users can add, edit, and delete manual transactions. Required inputs are date, signed amount, and category. Merchant and note are editable fields. Manual records have stable application IDs and are included in monthly reports unless the user excludes them.

## 7. Venmo CSV Import and Duplicate Review

1. The user uploads an official Venmo CSV statement.
2. The server validates type, size, headers, encoding, and row formats before any permanent write.
3. The UI previews parsed rows and separates directly importable rows from suspected duplicates.
4. Duplicate candidates use exact amount plus a configurable nearby-date window and bank descriptions or counterparties indicating Venmo or a payment app.
5. The system never resolves a suspected duplicate automatically.
6. For each candidate, the user chooses:
   - Keep the Venmo record and exclude or remove the bank representation.
   - Keep the bank transaction and discard the Venmo row.
   - Keep both.
7. Decisions are recorded so the same CSV or rows cannot be accidentally imported again.
8. A file fingerprint prevents duplicate upload of an unchanged file.
9. Invalid rows are reported with row-level reasons; no rows are committed until the user confirms the import.

## 8. Monthly Reporting and Exports

### Monthly Report

The selected month defaults to the current month. Calculations use included, finalized transactions owned by the signed-in user:

- **Total spending:** absolute value of included negative spending after refunds.
- **Net amount:** the sum of signed included amounts, equivalent to income minus the absolute value of spending.
- **Category spending:** net spending after category refunds, plus its percentage of total net spending, for each fixed category. Ordinary income does not belong to a spending category.

Transfers and credit-card payments are excluded by default. Unresolved Venmo duplicate candidates do not affect final monthly totals until the user confirms their treatment. Selecting a category opens the month's contributing transaction details.

### PDF Export

The PDF contains the month, total spending, net amount, category totals and percentages, and categorized transaction details. It is designed for archiving and printing.

### Excel Export

The `.xlsx` workbook contains three worksheets:

- Monthly Summary
- Category Summary
- Transaction Details

Exports use Traditional Chinese headings when the interface is Chinese and English headings when it is English. They use the same inclusion rules and calculation service as the on-screen report. Example names are `Monthly-Report-2026-08.pdf` and `Monthly-Report-2026-08.xlsx`.

### Full Personal Backup

Settings provides a full personal-data download as a ZIP containing UTF-8 CSV files for tabular records and a JSON manifest describing the export version and generation time. It contains transactions, notes, category rules, and non-sensitive account metadata and excludes Plaid access tokens and secrets. After a monthly report export, the UI reminds the user that a full backup is also available. Version 1 relies on user-downloaded local backups because the free database plan does not provide a production backup guarantee.

## 9. Pages and Navigation

### Sign In

- Email, password, and forgot-password actions.
- Clear handling for unapproved email addresses and unverified accounts.

### Monthly Dashboard

- Month selector, defaulting to the current month.
- Total spending and net amount.
- Horizontal category spending bars with percentages.
- Category drill-down.
- PDF and Excel export actions.
- Last successful sync time and a Sync Now action.

### Transactions

- The five-column primary list.
- Filters for month, category, account, source, and monthly-report inclusion.
- Search merchant and note.
- Inline category and note editing.
- Manual transaction creation.
- Detail view for source, account, pending, and sync information.

### Bank Accounts

- Connection and synchronization status for each institution.
- Add connection, update authorization, synchronize, and disconnect actions.
- Display only bank, nickname, type, and last four digits.

### Venmo Import

- CSV upload and preview.
- Direct-import and suspected-duplicate sections.
- Side-by-side duplicate review and explicit resolution.
- Previously imported-file detection.

### Settings

- Traditional Chinese and English language selection.
- Merchant-rule management.
- Password change.
- Full personal backup download.
- Bank disconnection, ledger deletion, and sign out.

Desktop uses a left navigation rail. Narrow screens use compact navigation and responsive layouts; mobile browsing is supported, but version 1 remains desktop-first.

## 10. Synchronization

### Triggers

- Plaid's regular institution checks and `SYNC_UPDATES_AVAILABLE` webhooks are the primary update signal.
- A Vercel cron job runs once daily as a fallback.
- Login initiates a non-blocking pull of updates Plaid has already prepared.
- Sync Now can request a Plaid Transactions Refresh followed by synchronization. It is protected by a cooldown and clearly separated because Refresh can become billable after a future paid upgrade.

### Processing Rules

- Verify Plaid webhook signatures before doing work.
- Use `/transactions/sync` and persist the cursor only after a complete, successful page sequence.
- Make all processing idempotent.
- Upsert added and modified transactions and remove deleted transactions according to Plaid updates.
- Reconcile pending transactions that become posted rather than displaying duplicates.
- Preserve user-entered notes, category overrides, and inclusion overrides when Plaid modifies a source transaction.
- Isolate failures by Plaid Item so one bank cannot block other accounts.

## 11. Error Handling

- Retry transient Plaid and network failures with bounded exponential backoff.
- Show a per-institution failure state and last successful sync time after retries are exhausted.
- For expired consent or login-required errors, show a Reconnect action using Plaid Link update mode.
- Do not delete existing transactions merely because a synchronization attempt fails.
- Reject invalid CSV files before committing rows and display actionable row-level validation errors.
- Treat export generation as retryable and generate files only for the authenticated requester.
- Use non-sensitive error codes and correlation IDs in logs; present plain-language messages in the selected language.
- Fail closed on ownership uncertainty, invalid sessions, invalid webhook signatures, missing encryption keys, or vendor billing-state uncertainty.

## 12. Testing Strategy

### Unit Tests

- Signed-cent arithmetic, total spending, net amount, refunds, and transfer exclusion.
- Plaid-to-application category mapping.
- Merchant normalization and owner-scoped learned rules.
- Venmo parsing, fingerprinting, candidate matching, and resolution decisions.
- Translation keys and language-specific report headings.

### Database and Authorization Tests

- Row Level Security for every user-owned entity.
- User A cannot read, count, update, delete, export, or infer user B's data.
- Unauthenticated and unapproved-email requests are rejected.
- Uniqueness and ownership constraints prevent cross-user or duplicate records.

### Plaid Sandbox Integration Tests

- Initial 90-day import.
- Paginated incremental sync with added, modified, and removed transactions.
- Pending-to-posted reconciliation.
- Duplicate webhook delivery and idempotency.
- Invalid webhook signature rejection.
- Login-required and update-mode recovery.

### End-to-End Tests

- Two users sign in on separate browser sessions and remain isolated.
- Connect, synchronize, categorize, add a note, and see correct monthly totals.
- Add a manual transaction.
- Upload a Venmo CSV, review a suspected duplicate, and confirm totals.
- Switch languages.
- Export PDF and Excel and verify their totals against the UI.
- Download a full personal backup.

### Production Trial Verification

After Sandbox tests pass, each owner verifies one real OAuth connection for Chase, American Express, and Bank of America as applicable. Production verification must not expose secrets in screenshots, logs, fixtures, or source control.

## 13. Acceptance Criteria

- Two approved users can sign in from different computers with email and password.
- Each user can see only their own accounts, transactions, rules, reports, exports, and backups.
- Each person can connect Chase, American Express, and Bank of America through read-only Plaid Transactions access.
- Initial connection imports 90 days and later webhook, daily, login, and manual synchronization paths work without duplicates.
- The transaction list displays merchant, category, date, amount, and note and supports the approved filters and editing.
- Merchant recategorization automatically creates an owner-scoped rule for future transactions.
- Monthly reports correctly show total spending, net amount, and category spending.
- Transfers and card payments are excluded by default, refunds reduce spending, and overrides work.
- Manual and Venmo CSV transactions work; suspected duplicates require manual resolution.
- PDF, Excel, and full personal backup downloads contain only the authenticated user's correct data.
- Traditional Chinese and English interfaces and exports work.
- Desktop behavior is complete and mobile browser layouts do not break.
- Core unit, integration, authorization, security, and end-to-end tests pass.

## 14. Delivery Boundaries

The first implementation plan should deliver this version as one focused web application. Features listed under Non-Goals require separate future design approval. No vendor account should be upgraded to a paid plan, no bank should be connected in Production, and no deployment should receive live financial data without an explicit user action at the relevant setup step.
