# Reversible transaction reconciliation

User-approved scope: the 61 previously reviewed one-to-one Chase transaction pairs dated 2026-09-01 or later. Retain ambiguous repeated charges and the unmatched pending charge. Keep the current authorized account's row, carry forward user metadata, and prefer the older row's inclusion/exclusion and category when they differ.

Implementation:
- Preserve both provider IDs and transaction rows. Mark the older row with `duplicate_of`, require it to remain excluded from reports, and hide marked rows from transaction lists, dashboards, reports, month selectors and reimbursements.
- Preserve the chosen imported category using `source_category_locked`; later provider upserts may refresh financial details but cannot overwrite this category. User category overrides remain editable.
- Store before/after transaction and split snapshots in an administrative RLS-protected reconciliation batch. Original split records remain on hidden rows; canonical split records carry the preserved split settings.
- The one-time operations live in ignored private backups, including scoped export, approved pair IDs, guarded application SQL and rollback SQL. Never commit financial data, provider IDs, credentials or backup content.

Verification:
- Schema regression checks run inside a rolled-back transaction: category locking/unlocking, same-owner canonical references, no duplicate chains, excluded reporting, restoration and audit RLS.
- The actual approved batch is first applied and restored inside a rolled-back transaction. Validate all 122 rows against the fresh backup, preserve all out-of-scope transactions/splits, and refuse to overwrite changed rows.
- Verify Supabase REST filters for both transactions and nested reimbursement transactions, plus the app's lint, tests and production build.

Deployment order: additive schema migration, tests, app deployment, then atomic data batch. Register only the new migration; do not replay historical migration-history gaps.

Limits: this operation reconciles only the approved pairs. It does not infer additional duplicate transactions or merge historical bank accounts. Rollback refuses to overwrite rows edited after reconciliation; subsequent changes require a reviewed merge.
