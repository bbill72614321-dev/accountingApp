# Accounting Application Implementation Roadmap

The approved design is implemented as four sequential, independently reviewable plans. Each phase leaves the application in a working state and is merged only after its own tests pass.

1. **Foundation and manual ledger** — Next.js foundation, Supabase email/password authentication, owner-scoped database schema and RLS, manual transactions, learned merchant categories, bilingual UI, and monthly dashboard.
2. **Plaid bank synchronization** — read-only Plaid Link, encrypted access tokens, account display, 90-day initial import, incremental reconciliation, signed webhooks, daily fallback sync, reconnect, disconnect, and refresh cooldown.
3. **Venmo import and duplicate review** — validated CSV parsing, upload fingerprinting, staged preview, duplicate candidates, explicit resolution, and idempotent commit.
4. **Reports, backup, and launch hardening** — PDF and Excel monthly exports, ZIP personal backup, deletion flows, rate limits, security headers, production configuration, deployment checks, and end-to-end acceptance tests.

The detailed Phase 1 plan is [2026-08-26-foundation-manual-ledger.md](2026-08-26-foundation-manual-ledger.md). Later phase plans are written only after the preceding phase is reviewed, so they can use the actual interfaces and file structure instead of speculative placeholders.

