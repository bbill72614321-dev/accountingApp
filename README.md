# Accounting Application

A bilingual personal accounting app with an owner-scoped manual transaction ledger.

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm
- A Docker-compatible runtime for local Supabase
- The Supabase CLI supplied through this repository's local development dependency

## Local setup

Install dependencies and start local Supabase:

```bash
npm install
npx supabase start
```

Create the local environment file, then copy the API URL and anon key reported by `npx supabase status` into it:

```bash
cp .env.example .env.local
npx supabase status
```

Open local Supabase Studio at `http://127.0.0.1:54323`, then use **Authentication → Users** to create exactly two development users. Keep their email addresses and passwords outside the repository. Before E2E, set `E2E_USER_ONE_EMAIL`, `E2E_USER_ONE_PASSWORD`, `E2E_USER_TWO_EMAIL`, and `E2E_USER_TWO_PASSWORD` in your shell; do not add their values to `.env.local` or any committed file.

Install Chromium once for the browser test:

```bash
npx playwright install chromium
```

## Commands

```bash
npm run dev
npm test
npm run test:db
npm run test:e2e
npm run check
```

The E2E test creates a transaction as the first user, confirms the second user cannot find it or open its captured edit URL, and then changes the second user's language to confirm the visible identity is retained.

## Production note

Production must use two invited users and public sign-ups must be disabled. Never expose development or production credentials in `.env.local` commits, tests, or documentation.

For the Plaid Trial connection and launch checklist, see [Plaid Trial setup](docs/plaid-trial-setup.md).

See the [approved design](docs/superpowers/specs/2026-08-26-personal-finance-web-app-design.md) and [implementation roadmap](docs/superpowers/plans/README.md).
