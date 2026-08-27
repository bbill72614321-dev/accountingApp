# Task 7 report: two-user isolation E2E and Phase 1 verification

## Implementation

- Added a Chromium-only Playwright configuration that starts the local Next.js app at `127.0.0.1:3000` and retains traces on failure.
- Added one two-context E2E test. It signs in as user one, creates a uniquely named manual grocery transaction, captures and validates its edit URL, verifies the changed dashboard total, and verifies user two can neither find the transaction nor open the captured URL. It then submits the existing language form as user two and checks both English navigation and that user two’s email remains visible.
- The test requires the four `E2E_USER_*` variables before execution and contains no credentials.
- Replaced the scaffold README with Node 22, local Supabase, two-user Studio setup, Chromium install, verification commands, production invitation/sign-up guidance, and links to the approved design and roadmap.
- Excluded Playwright specs from Vitest while preserving Vitest’s default exclusions. Without this, `npm test` imports the E2E environment guard and fails before the unit suite can run.

## RED/GREEN evidence

- RED: `npx playwright test --list tests/e2e/manual-ledger.spec.ts` failed with `Missing required E2E variable: E2E_USER_ONE_EMAIL`, confirming the credential guard runs before browser work.
- RED: after adding the Playwright spec, `npm test` failed because Vitest discovered `tests/e2e/manual-ledger.spec.ts` and executed its E2E-only guard.
- First attempted config change replacing `exclude` exposed Vitest’s default-exclusion behavior by incorrectly collecting `node_modules` tests. Source inspection identified the root cause: a user `exclude` replaces defaults.
- GREEN: `vitest.config.ts` now appends `tests/e2e/**` to `configDefaults.exclude`; `npm test` passed with 10 files and 30 tests.

## Verification

Using Node 22.23.2:

- `npx playwright install chromium` — passed; Chromium and its required helper binaries were installed in the Playwright cache.
- `npm run lint` — passed with no output/errors.
- `npm test` — passed, 10 files / 30 tests.
- `npm run build` — passed; TypeScript and production route generation completed.
- `npm run check` — passed; lint, unit tests, and build all completed successfully.
- `git diff --check` — passed with no output.

## Pending runtime checks

- `npx supabase start` cannot run in this environment: neither Docker nor Podman is installed/available on `PATH`.
- Consequently `npm run test:db` cannot connect to local PostgreSQL at `127.0.0.1:54322` and did not pass.
- `npm run test:e2e -- tests/e2e/manual-ledger.spec.ts` correctly refuses to run without the required two-user environment variables. A live run additionally requires `npx supabase start`, two Studio users, and real `.env.local` local keys. It was not possible to prove the live RLS and browser assertions here.

Phase 1 is therefore **not marked complete** in `docs/superpowers/plans/README.md`; the roadmap is intentionally unchanged until the remaining database and E2E commands pass in a Docker-compatible local Supabase environment.

## Self-review

- The E2E test uses separate browser contexts and a timestamped merchant so concurrent/repeated execution does not depend on shared transaction data.
- The captured edit route uses a UUID shape assertion before user two navigates to it, preventing a weak path-only isolation check.
- The language assertion submits the existing form rather than assuming `selectOption` persists a server action.
- README examples do not contain any real credentials, and `.env.local` remains untouched.
- No Phase 2/Plaid work or unrelated dependencies were introduced.

## Final-review fix wave

The final review follow-up is represented by these committed-intent artifacts:

- `src/features/transactions/merchant-rule.ts` and its test now encode the effective-category filter as `category_override = selected OR (category_override IS NULL AND source_category = selected)`. An override therefore wins and a stale source category cannot make a row appear in the wrong category filter.
- The manual edit page selects both category columns and pre-fills the effective category through `displayedCategory`. `updateManualTransaction` authenticates before calling the owner-scoped `update_manual_transaction_and_rule` RPC. The RPC locks and verifies the authenticated owner’s manual row, updates the complete row, clears the stale override, and upserts the authenticated owner’s merchant rule in the same transaction.
- `src/app/actions/auth.ts`, `.env.example`, `supabase/config.toml`, and the approved Phase 1 plan now use `http://127.0.0.1:3000`; the reset callback is the exact allowlisted `/auth/callback?next=/reset-password` URL.
- `supabase/tests/manual_ledger_rls.test.sql` now has 31 pgTAP assertions, including profile visibility/count/update/delete/forged insert, merchant-rule visibility/count/update/delete/forged insert, the existing transaction checks, both RPC paths, and security-definer/function execution privileges.
- `package.json` and `package-lock.json` require Node `>=22`. The final migration revokes `PUBLIC` execution on the security-definer profile trigger function while leaving trigger invocation intact.
- The new `src/app/actions/auth.test.ts` regression test verifies the exact local password-recovery callback, and the transaction action test verifies the single atomic RPC argument contract.

## Final verification status

- Fresh Node 22.23.2 `npm run check` passed: ESLint clean, 11 Vitest files/34 tests passed, and the Next production build completed. `git diff --check` also passed with no output.
- `npm run test:db` was run and remains pending with the exact failure `LegacyDbConnectError ... ECONNREFUSED 127.0.0.1:54322`; it requires Docker or Podman plus a local Supabase database, neither of which is available in this environment.
- `npx playwright test --list tests/e2e/manual-ledger.spec.ts` was run and stopped at the explicit guard `Missing required E2E variable: E2E_USER_ONE_EMAIL`. The full `npm run test:e2e -- tests/e2e/manual-ledger.spec.ts` command additionally requires a started local Supabase instance, two Studio-created users, and local Supabase keys in `.env.local`; no credentials are committed and no browser/RLS pass is claimed here.
- Because the database and live two-user browser gates remain pending, `docs/superpowers/plans/README.md` intentionally remains unchanged and Phase 1 is not marked complete.
