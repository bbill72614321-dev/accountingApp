# Foundation and Manual Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally runnable, bilingual two-user web app with secure email/password login, isolated manual transactions, learned merchant categories, and correct monthly spending summaries.

**Architecture:** Use Next.js App Router server components and server actions as the application boundary, with Supabase Auth and PostgreSQL providing sessions, storage, and Row Level Security. Keep money and categorization logic in pure TypeScript modules, use native HTML/CSS for forms and category bars, and call Supabase directly rather than adding repository or service abstractions before they are needed.

**Tech Stack:** Node.js 22, Next.js 16+, React 19, TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`, `@supabase/supabase-js`, local CLI), Zod, Vitest, pgTAP, Playwright, npm.

**Spec:** `docs/superpowers/specs/2026-08-26-personal-finance-web-app-design.md`

## Global Constraints

- Application files, plans, tests, and Git operations live under `/Users/liuliyuan/Documents/Liyuan/sideProject/accountingApplication`.
- Version 1 supports exactly two pre-created Supabase users; it has no public sign-up page.
- Authentication is email and password; Supabase email verification remains enabled.
- Every user-owned row has `user_id uuid not null references auth.users(id) on delete cascade` and RLS based on `(select auth.uid()) = user_id`.
- User A must not read, count, update, delete, or infer user B's records.
- Currency is USD only; store money as signed integer cents (`bigint` in PostgreSQL, safe integers in TypeScript).
- Income is positive; spending is negative; included refunds reduce category spending.
- Transfers and credit-card payments are represented with `include_in_report = false` when those sources are added in later phases.
- Fixed categories are Travel, Grocery, Shopping, Car, Dine Out, Utility, Entertainment, Learning, Home, Cat, and Other.
- Traditional Chinese (`zh-TW`) and English (`en`) are the only interface languages.
- No UI component library, chart library, state-management library, ORM, or custom authentication framework is added.
- Trust-boundary inputs use Zod; authorization, RLS, error handling that prevents data loss, and accessibility basics are never simplified away.
- Use Test-Driven Development: observe each new behavioral test fail before implementing it.
- Do not create Plaid, Venmo, export, backup, cron, or production deployment code in this phase.

## File Map

```text
src/
  app/
    actions/auth.ts                 # sign-in, sign-out, password reset/update
    actions/preferences.ts          # language cookie and profile preference
    actions/transactions.ts         # manual transaction mutations and learned rules
    (auth)/login/page.tsx           # public sign-in page
    (auth)/reset-password/page.tsx  # recovery-session password form
    (app)/layout.tsx                # authenticated navigation shell
    (app)/dashboard/page.tsx        # selected-month summary and category bars
    (app)/transactions/page.tsx     # owner-scoped list and filters
    (app)/transactions/new/page.tsx # manual transaction form
    (app)/transactions/[id]/edit/page.tsx # owner-scoped edit form or not-found
    (app)/settings/page.tsx          # language and merchant-rule management
    auth/callback/route.ts          # Supabase password-recovery callback
    globals.css                     # application tokens and responsive layout
    layout.tsx                      # root document and language attribute
    page.tsx                        # redirect to dashboard or login
  components/
    app-nav.tsx                     # desktop/mobile navigation
    category-bars.tsx               # native CSS category visualization
    language-switcher.tsx           # zh-TW/en form control
    manual-transaction-form.tsx     # accessible server-action form
    transaction-table.tsx           # five-column responsive table
  features/transactions/
    categories.ts                   # fixed category type, values, labels
    categories.test.ts
    merchant.ts                     # merchant normalization and rule application
    merchant.test.ts
    money.ts                        # strict USD parsing and display
    money.test.ts
    monthly-summary.ts              # pure monthly calculations
    monthly-summary.test.ts
    validation.ts                   # Zod manual transaction input schema
    validation.test.ts
  lib/
    env.ts                          # validated public/server environment access
    env.test.ts
    i18n.ts                         # two-language dictionary and lookup
    i18n.test.ts
    supabase/client.ts              # browser Supabase client
    supabase/server.ts              # cookie-aware server Supabase client
    supabase/proxy.ts               # session refresh helper
    auth.ts                         # requireUser and current-user helpers
proxy.ts                            # Next.js 16 session proxy
supabase/
  migrations/202608260001_manual_ledger.sql
  tests/manual_ledger_rls.test.sql
tests/e2e/manual-ledger.spec.ts
playwright.config.ts
vitest.config.ts
.env.example
.nvmrc
```

---

### Task 1: Scaffold the application and prove the test harness

**Files:**
- Create/modify: `package.json`
- Create: `.nvmrc`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `src/lib/env.test.ts`
- Create: `src/lib/env.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: none.
- Produces: `getPublicEnv(): { supabaseUrl: string; supabaseAnonKey: string }` and `getServerEnv(): { supabaseUrl: string; supabaseAnonKey: string; appUrl: string }`.

- [ ] **Step 1: Scaffold Next.js and install only Phase 1 dependencies**

From the repository root, run:

```bash
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias '@/*' --use-npm --yes
npm install @supabase/ssr @supabase/supabase-js zod
npm install --save-dev vitest @playwright/test supabase
```

If `create-next-app` reports that existing `docs/` prevents scaffolding, create the app in a temporary sibling directory, copy only its generated application/configuration files into this repository, and delete the temporary directory. Preserve `docs/` and `.git/` exactly.

Expected: `npm run dev`, `npm run lint`, and `npm run build` scripts exist; `docs/` and Git history remain present.

- [ ] **Step 2: Add deterministic scripts and runtime floor**

Set `.nvmrc` to:

```text
22
```

Add these scripts to `package.json` without removing the scaffolded scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:db": "supabase test db",
    "test:e2e": "playwright test",
    "check": "npm run lint && npm run test && npm run build"
  },
  "engines": {
    "node": ">=20.9"
  }
}
```

Create `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-local-anon-key
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

Ensure `.env.local`, `.env.*.local`, Playwright output, and Supabase temporary files are ignored:

```gitignore
.env.local
.env.*.local
/playwright-report/
/test-results/
/supabase/.temp/
```

- [ ] **Step 3: Write the failing environment tests**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: { environment: 'node' },
})
```

Create `src/lib/env.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { getPublicEnv } from './env'

const original = { ...process.env }

afterEach(() => {
  process.env = { ...original }
})

describe('getPublicEnv', () => {
  it('rejects a missing Supabase URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(() => getPublicEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('returns validated public configuration', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    expect(getPublicEnv()).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'anon-key',
    })
  })
})
```

- [ ] **Step 4: Run the test and observe the intended failure**

Run:

```bash
npm test -- src/lib/env.test.ts
```

Expected: FAIL because `src/lib/env.ts` does not exist.

- [ ] **Step 5: Implement the minimal environment accessors**

Create `src/lib/env.ts`:

```ts
import { z } from 'zod'

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

export function getPublicEnv() {
  const env = publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function getServerEnv() {
  const publicEnv = getPublicEnv()
  const appUrl = z.string().url().parse(process.env.NEXT_PUBLIC_APP_URL)
  return { ...publicEnv, appUrl }
}
```

- [ ] **Step 6: Verify foundation checks**

Run:

```bash
npm test -- src/lib/env.test.ts
npm run lint
npm run build
```

Expected: all commands PASS. The build may use `.env.local`; copy `.env.example` to `.env.local` and replace only local values if needed.

- [ ] **Step 7: Commit the foundation**

```bash
git add package.json package-lock.json .nvmrc .env.example .gitignore vitest.config.ts src
git commit -m "chore: scaffold accounting web app"
```

---

### Task 2: Implement money, categories, merchant rules, and monthly calculations

**Files:**
- Create: `src/features/transactions/categories.ts`
- Create: `src/features/transactions/categories.test.ts`
- Create: `src/features/transactions/money.ts`
- Create: `src/features/transactions/money.test.ts`
- Create: `src/features/transactions/merchant.ts`
- Create: `src/features/transactions/merchant.test.ts`
- Create: `src/features/transactions/monthly-summary.ts`
- Create: `src/features/transactions/monthly-summary.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `Category`, `CATEGORIES`, `normalizeMerchant`, `parseUsdToCents`, `formatUsd`, `SummaryTransaction`, `MonthlySummary`, and `summarizeMonth(transactions, month)`.

- [ ] **Step 1: Write failing category and money tests**

Create `src/features/transactions/categories.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS } from './categories'

describe('categories', () => {
  it('contains the approved categories in stable order', () => {
    expect(CATEGORIES).toEqual([
      'Travel', 'Grocery', 'Shopping', 'Car', 'Dine Out', 'Utility',
      'Entertainment', 'Learning', 'Home', 'Cat', 'Other',
    ])
  })

  it('has both labels for every category', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category].en).toBeTruthy()
      expect(CATEGORY_LABELS[category]['zh-TW']).toBeTruthy()
    }
  })
})
```

Create `src/features/transactions/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatUsd, parseUsdToCents } from './money'

describe('USD money helpers', () => {
  it.each([
    ['12', 1200], ['12.3', 1230], ['12.34', 1234], ['-0.99', -99],
  ])('parses %s without floating-point arithmetic', (input, expected) => {
    expect(parseUsdToCents(input)).toBe(expected)
  })

  it.each(['', '1.234', '$12', 'NaN', '90071992547410.00'])('rejects %s', (input) => {
    expect(() => parseUsdToCents(input)).toThrow()
  })

  it('formats signed USD cents', () => {
    expect(formatUsd(-1234, 'en')).toBe('-$12.34')
  })
})
```

- [ ] **Step 2: Run the tests and observe missing-module failures**

```bash
npm test -- src/features/transactions/categories.test.ts src/features/transactions/money.test.ts
```

Expected: FAIL because `categories.ts` and `money.ts` do not exist.

- [ ] **Step 3: Implement the fixed category and USD helpers**

Create `src/features/transactions/categories.ts`:

```ts
export const CATEGORIES = [
  'Travel', 'Grocery', 'Shopping', 'Car', 'Dine Out', 'Utility',
  'Entertainment', 'Learning', 'Home', 'Cat', 'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
export type Language = 'zh-TW' | 'en'

export const CATEGORY_LABELS: Record<Category, Record<Language, string>> = {
  Travel: { en: 'Travel', 'zh-TW': '旅遊' },
  Grocery: { en: 'Grocery', 'zh-TW': '日常雜貨' },
  Shopping: { en: 'Shopping', 'zh-TW': '購物' },
  Car: { en: 'Car', 'zh-TW': '汽車' },
  'Dine Out': { en: 'Dine Out', 'zh-TW': '外食' },
  Utility: { en: 'Utility', 'zh-TW': '水電與公共費用' },
  Entertainment: { en: 'Entertainment', 'zh-TW': '娛樂' },
  Learning: { en: 'Learning', 'zh-TW': '學習' },
  Home: { en: 'Home', 'zh-TW': '居家' },
  Cat: { en: 'Cat', 'zh-TW': '貓咪' },
  Other: { en: 'Other', 'zh-TW': '其他' },
}
```

Create `src/features/transactions/money.ts`:

```ts
import type { Language } from './categories'

const USD_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/

export function parseUsdToCents(input: string): number {
  const value = input.trim()
  const match = USD_PATTERN.exec(value)
  if (!match) throw new Error('Enter a USD amount with at most two decimals')
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [dollars, fractional = ''] = unsigned.split('.')
  const cents = Number(dollars) * 100 + Number(fractional.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) throw new Error('Amount is too large')
  return negative ? -cents : cents
}

export function formatUsd(cents: number, language: Language): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Amount must be integer cents')
  return new Intl.NumberFormat(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
    style: 'currency', currency: 'USD',
  }).format(cents / 100)
}
```

- [ ] **Step 4: Write failing merchant and summary tests**

Create `src/features/transactions/merchant.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeMerchant } from './merchant'

describe('normalizeMerchant', () => {
  it('normalizes casing, punctuation, and repeated whitespace', () => {
    expect(normalizeMerchant("  Trader Joe's #142  ")).toBe('TRADER JOES 142')
  })
})
```

Create `src/features/transactions/monthly-summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { summarizeMonth, type SummaryTransaction } from './monthly-summary'

const tx = (overrides: Partial<SummaryTransaction>): SummaryTransaction => ({
  date: '2026-08-10', amountCents: -1000, category: 'Other',
  pending: false, includeInReport: true, ...overrides,
})

describe('summarizeMonth', () => {
  it('calculates spending, refunds, income, exclusions, and net amount', () => {
    const summary = summarizeMonth([
      tx({ amountCents: -5000, category: 'Grocery' }),
      tx({ amountCents: 1000, category: 'Grocery' }),
      tx({ amountCents: 10000, category: null }),
      tx({ amountCents: -2500, category: 'Travel', includeInReport: false }),
      tx({ amountCents: -999, category: 'Other', pending: true }),
      tx({ date: '2026-07-31', amountCents: -3000 }),
    ], '2026-08')

    expect(summary.totalSpendingCents).toBe(4000)
    expect(summary.netAmountCents).toBe(6000)
    expect(summary.categorySpending.Grocery).toBe(4000)
    expect(summary.categorySpending.Travel).toBe(0)
  })
})
```

- [ ] **Step 5: Run the new tests and observe intended failures**

```bash
npm test -- src/features/transactions/merchant.test.ts src/features/transactions/monthly-summary.test.ts
```

Expected: FAIL because the implementation modules do not exist.

- [ ] **Step 6: Implement merchant normalization and the monthly summary**

Create `src/features/transactions/merchant.ts`:

```ts
export function normalizeMerchant(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
```

Create `src/features/transactions/monthly-summary.ts`:

```ts
import { CATEGORIES, type Category } from './categories'

export type SummaryTransaction = {
  date: string
  amountCents: number
  category: Category | null
  pending: boolean
  includeInReport: boolean
}

export type MonthlySummary = {
  totalSpendingCents: number
  netAmountCents: number
  categorySpending: Record<Category, number>
}

export function summarizeMonth(
  transactions: readonly SummaryTransaction[],
  month: `${number}-${string}`,
): MonthlySummary {
  const categorySpending = Object.fromEntries(CATEGORIES.map((name) => [name, 0])) as Record<Category, number>
  let netAmountCents = 0

  for (const transaction of transactions) {
    if (!transaction.date.startsWith(`${month}-`) || transaction.pending || !transaction.includeInReport) continue
    netAmountCents += transaction.amountCents
    if (transaction.category) categorySpending[transaction.category] -= transaction.amountCents
  }

  const totalSpendingCents = Math.max(0, Object.values(categorySpending).reduce((sum, value) => sum + value, 0))
  return { totalSpendingCents, netAmountCents, categorySpending }
}
```

- [ ] **Step 7: Run all domain tests**

```bash
npm test -- src/features/transactions
```

Expected: PASS.

- [ ] **Step 8: Commit the transaction domain**

```bash
git add src/features/transactions
git commit -m "feat: add transaction calculation domain"
```

---

### Task 3: Create the owner-scoped database schema and RLS tests

**Files:**
- Create: `supabase/config.toml` and standard local files via `supabase init`
- Create: `supabase/tests/manual_ledger_rls.test.sql`
- Create: `supabase/migrations/202608260001_manual_ledger.sql`

**Interfaces:**
- Consumes: the category values and signed-cent convention from Task 2.
- Produces: `profiles`, `transactions`, and `merchant_rules` tables with owner-only CRUD policies.

- [ ] **Step 1: Initialize Supabase local development**

```bash
npx supabase init
```

Expected: a version-controlled `supabase/config.toml` is created. Do not start services until Docker or another compatible runtime is available.

- [ ] **Step 2: Write the failing RLS database test**

Create `supabase/tests/manual_ledger_rls.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.com', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.com', '', now(), now(), now());

insert into public.transactions (user_id, source, normalized_merchant, transaction_date, amount_cents, source_category)
values
  ('11111111-1111-1111-1111-111111111111', 'manual', 'ALPHA', '2026-08-01', -1000, 'Grocery'),
  ('22222222-2222-2222-2222-222222222222', 'manual', 'BETA', '2026-08-02', -2000, 'Travel');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select results_eq('select count(*) from public.transactions', array[1::bigint], 'user one sees one row');
select results_eq($$select normalized_merchant from public.transactions$$, array['ALPHA'::text], 'user one sees only own row');
select is_empty($$update public.transactions set note = 'x' where user_id = '22222222-2222-2222-2222-222222222222' returning id$$, 'user one cannot update user two');
select is_empty($$delete from public.transactions where user_id = '22222222-2222-2222-2222-222222222222' returning id$$, 'user one cannot delete user two');
select throws_ok(
  $$insert into public.transactions (user_id, source, normalized_merchant, transaction_date, amount_cents) values ('22222222-2222-2222-2222-222222222222', 'manual', 'FORGED', '2026-08-03', -3000)$$,
  '42501', null, 'user one cannot insert for user two'
);

select * from finish();
rollback;
```

- [ ] **Step 3: Run the database test and observe the missing-table failure**

```bash
npx supabase start
npm run test:db
```

Expected: FAIL because `public.transactions` does not exist.

- [ ] **Step 4: Implement the minimal schema and policies**

Create `supabase/migrations/202608260001_manual_ledger.sql`:

```sql
create type public.app_language as enum ('zh-TW', 'en');
create type public.transaction_source as enum ('manual');
create type public.transaction_category as enum (
  'Travel', 'Grocery', 'Shopping', 'Car', 'Dine Out', 'Utility',
  'Entertainment', 'Learning', 'Home', 'Cat', 'Other'
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language public.app_language not null default 'zh-TW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source public.transaction_source not null,
  external_id text,
  raw_description text,
  normalized_merchant text not null default '',
  source_category public.transaction_category,
  category_override public.transaction_category,
  transaction_date date not null,
  amount_cents bigint not null check (amount_cents between -9007199254740991 and 9007199254740991),
  note text not null default '' check (char_length(note) <= 1000),
  pending boolean not null default false,
  include_in_report boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index transactions_external_id_unique
  on public.transactions (user_id, source, external_id)
  where external_id is not null;
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  normalized_merchant text not null check (normalized_merchant <> ''),
  category public.transaction_category not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_merchant)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
for each row execute function public.set_updated_at();
create trigger merchant_rules_updated_at before update on public.merchant_rules
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger auth_user_profile after insert on auth.users
for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.merchant_rules enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy transactions_select_own on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy merchant_rules_select_own on public.merchant_rules for select to authenticated
  using ((select auth.uid()) = user_id);
create policy merchant_rules_insert_own on public.merchant_rules for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy merchant_rules_update_own on public.merchant_rules for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy merchant_rules_delete_own on public.merchant_rules for delete to authenticated
  using ((select auth.uid()) = user_id);
```

- [ ] **Step 5: Reset, test, and lint the database**

```bash
npx supabase db reset
npm run test:db
npx supabase db lint --level warning
```

Expected: migration applies; all five pgTAP assertions PASS; database lint has no errors.

- [ ] **Step 6: Commit the database boundary**

```bash
git add supabase package.json package-lock.json
git commit -m "feat: add isolated manual ledger schema"
```

---

### Task 4: Add Supabase session handling and the authenticated shell

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/proxy.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/actions/auth.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/app-nav.tsx`
- Create: `proxy.ts`
- Modify: `src/app/page.tsx`
- Create: `src/features/transactions/validation.test.ts`
- Create: `src/features/transactions/validation.ts`

**Interfaces:**
- Consumes: `getPublicEnv`, `getServerEnv` from Task 1.
- Produces: `createBrowserClient()`, `createServerClient()`, `requireUser()`, `login`, `logout`, `requestPasswordReset`, `updatePassword`, and `manualTransactionSchema` for Task 5.

- [ ] **Step 1: Write failing form-boundary validation tests**

Create `src/features/transactions/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loginSchema, manualTransactionSchema, passwordResetRequestSchema, updatePasswordSchema } from './validation'

describe('form validation', () => {
  it('normalizes a valid login', () => {
    expect(loginSchema.parse({ email: ' ONE@example.com ', password: 'long-enough' }).email).toBe('one@example.com')
  })

  it('rejects an invalid category and date', () => {
    expect(() => manualTransactionSchema.parse({
      merchant: 'Store', category: 'Unknown', date: '08/01/2026', amount: '-12.00', note: '',
    })).toThrow()
  })

  it('validates both password-reset boundaries', () => {
    expect(passwordResetRequestSchema.parse({ email: ' ONE@example.com ' })).toEqual({ email: 'one@example.com' })
    expect(() => updatePasswordSchema.parse({ password: 'short', confirmation: 'short' })).toThrow()
    expect(() => updatePasswordSchema.parse({ password: 'long-enough', confirmation: 'different-value' })).toThrow()
  })
})
```

- [ ] **Step 2: Run the validation test and observe the failure**

```bash
npm test -- src/features/transactions/validation.test.ts
```

Expected: FAIL because `validation.ts` does not exist.

- [ ] **Step 3: Implement exact boundary schemas**

Create `src/features/transactions/validation.ts`:

```ts
import { z } from 'zod'
import { CATEGORIES } from './categories'
import { parseUsdToCents } from './money'

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
  confirmation: z.string().min(8).max(128),
}).refine(({ password, confirmation }) => password === confirmation, {
  message: 'Passwords do not match', path: ['confirmation'],
})

export const manualTransactionSchema = z.object({
  merchant: z.string().trim().max(200),
  category: z.preprocess((value) => value === '' ? null : value, z.enum(CATEGORIES).nullable()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().transform(parseUsdToCents),
  note: z.string().trim().max(1000),
}).superRefine(({ amount, category }, context) => {
  if (amount < 0 && category === null) {
    context.addIssue({ code: 'custom', path: ['category'], message: 'Spending requires a category' })
  }
})
```

Run `npm test -- src/features/transactions/validation.test.ts`; expected PASS.

- [ ] **Step 4: Implement Supabase browser and server clients**

Create `src/lib/supabase/client.ts`:

```ts
'use client'

import { createBrowserClient as createClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/env'

export function createBrowserClient() {
  const env = getPublicEnv()
  return createClient(env.supabaseUrl, env.supabaseAnonKey)
}
```

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPublicEnv } from '@/lib/env'

export async function createServerClient() {
  const cookieStore = await cookies()
  const env = getPublicEnv()
  return createSupabaseServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session.
        }
      },
    },
  })
}
```

- [ ] **Step 5: Implement session refresh and authenticated user lookup**

Create `src/lib/supabase/proxy.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPublicEnv } from '@/lib/env'

const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/settings']

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })
  const env = getPublicEnv()
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data } = await supabase.auth.getClaims()
  const protectedPath = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))
  if (!data?.claims && protectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}
```

Create root `proxy.ts`:

```ts
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

Create `src/lib/auth.ts`:

```ts
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login')
  return data.user
}
```

- [ ] **Step 6: Implement server-only authentication actions**

Create `src/app/actions/auth.ts` with `'use server'`. Define and export this shared state and these actions:

```ts
export type ActionState = { status: 'idle' | 'success' | 'error'; message: string }
export async function login(_state: ActionState, formData: FormData): Promise<ActionState>
export async function logout(): Promise<void>
export async function requestPasswordReset(_state: ActionState, formData: FormData): Promise<ActionState>
export async function updatePassword(_state: ActionState, formData: FormData): Promise<ActionState>
```

Use this complete file body:

```ts
 'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import {
  loginSchema, passwordResetRequestSchema, updatePasswordSchema,
} from '@/features/transactions/validation'

export type ActionState = { status: 'idle' | 'success' | 'error'; message: string }
const INVALID_LOGIN = { status: 'error', message: 'Unable to sign in' } as const
const RESET_RESPONSE = { status: 'success', message: 'If the account exists, a reset link has been sent.' } as const

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'), password: formData.get('password'),
  })
  if (!parsed.success) return INVALID_LOGIN
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return INVALID_LOGIN
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function requestPasswordReset(
  _state: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return RESET_RESPONSE
  const supabase = await createServerClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getServerEnv().appUrl}/auth/callback?next=/reset-password`,
  })
  return RESET_RESPONSE
}

export async function updatePassword(
  _state: ActionState, formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'), confirmation: formData.get('confirmation'),
  })
  if (!parsed.success) return { status: 'error', message: 'Unable to update password' }
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return { status: 'error', message: 'Recovery session expired' }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { status: 'error', message: 'Unable to update password' }
  return { status: 'success', message: 'Password updated' }
}
```

Do not log emails, passwords, provider errors, or tokens.

- [ ] **Step 7: Build the public login and authenticated shell**

Implement:

- `/login`: accessible email/password labels, autocomplete attributes, generic inline status, sign-in submit, and password-reset request. No sign-up link.
- `/auth/callback`: exchange the `code` query parameter with `exchangeCodeForSession`; accept `next` only when it starts with one `/` but not `//`, otherwise use `/reset-password`.
- `/reset-password`: render labeled password and confirmation fields posting `updatePassword`; use `autocomplete="new-password"` and show the returned generic status.
- Authenticated layout: call `requireUser`, render the email and `<AppNav />`, and provide a sign-out form.
- `/`: use `getUser`; redirect authenticated users to `/dashboard`, otherwise `/login`.
- `AppNav`: links to Dashboard, Transactions, and Settings; desktop sidebar and compact small-screen navigation use the same markup.

- [ ] **Step 8: Verify auth code and build**

```bash
npm test
npm run lint
npm run build
```

Expected: PASS. Manually create two local Supabase users through Studio at `http://127.0.0.1:54323`, keep public sign-ups disabled in the production project, and confirm invalid credentials use a generic error.

- [ ] **Step 9: Commit authentication**

```bash
git add src proxy.ts
git commit -m "feat: add private Supabase authentication"
```

---

### Task 5: Add manual transactions and learned merchant categories

**Files:**
- Create: `src/app/actions/transactions.ts`
- Create: `src/app/(app)/transactions/page.tsx`
- Create: `src/app/(app)/transactions/new/page.tsx`
- Create: `src/app/(app)/transactions/[id]/edit/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/components/manual-transaction-form.tsx`
- Create: `src/components/transaction-table.tsx`
- Create: `src/features/transactions/merchant-rule.test.ts`
- Create: `src/features/transactions/merchant-rule.ts`

**Interfaces:**
- Consumes: `requireUser`, `createServerClient`, `manualTransactionSchema`, `normalizeMerchant`, `Category`, and `formatUsd`.
- Produces: `createManualTransaction`, `updateManualTransaction`, `deleteTransaction`, `updateTransactionCategory`, `updateTransactionNote`, `setTransactionIncluded`, `deleteMerchantRule`, and a five-column owner-scoped transaction page.

- [ ] **Step 1: Write the failing learned-rule test**

Create `src/features/transactions/merchant-rule.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { displayedCategory } from './merchant-rule'

describe('displayedCategory', () => {
  it('prefers the user override over the mapped source category', () => {
    expect(displayedCategory({ sourceCategory: 'Shopping', categoryOverride: 'Cat' })).toBe('Cat')
  })

  it('falls back to the source category', () => {
    expect(displayedCategory({ sourceCategory: 'Grocery', categoryOverride: null })).toBe('Grocery')
  })
})
```

- [ ] **Step 2: Run the test and observe the missing-module failure**

```bash
npm test -- src/features/transactions/merchant-rule.test.ts
```

Expected: FAIL because `merchant-rule.ts` does not exist.

- [ ] **Step 3: Implement the category precedence helper**

Create `src/features/transactions/merchant-rule.ts`:

```ts
import type { Category } from './categories'

export function displayedCategory(input: {
  sourceCategory: Category | null
  categoryOverride: Category | null
}): Category | null {
  return input.categoryOverride ?? input.sourceCategory
}
```

Run the focused test; expected PASS.

- [ ] **Step 4: Implement owner-derived transaction actions**

Create `src/app/actions/transactions.ts` with `'use server'`. Every action must call `requireUser()` and use that returned ID; never accept `user_id` from a form.

Required signatures:

```ts
export async function createManualTransaction(_state: ActionState, formData: FormData): Promise<ActionState>
export async function updateManualTransaction(_state: ActionState, formData: FormData): Promise<ActionState>
export async function deleteTransaction(formData: FormData): Promise<void>
export async function updateTransactionCategory(formData: FormData): Promise<void>
export async function updateTransactionNote(formData: FormData): Promise<void>
export async function setTransactionIncluded(formData: FormData): Promise<void>
export async function deleteMerchantRule(formData: FormData): Promise<void>
```

`createManualTransaction` validates the five form fields, derives `normalized_merchant`, inserts `source = 'manual'`, and redirects to `/transactions`. `updateManualTransaction` accepts an additional Zod-validated transaction UUID, updates merchant, normalized merchant, category, date, signed cents, and note only where both `id` and `user_id` match, and rejects non-manual rows. `deleteTransaction` uses the same ID/owner/source checks before deletion. `updateTransactionCategory` validates transaction UUID and `Category`, updates only the authenticated user's transaction, and upserts `(user_id, normalized_merchant, category)` into `merchant_rules` when the merchant key is non-empty. `deleteMerchantRule` validates a rule UUID and deletes it only where `user_id` matches. Note is limited to 1,000 characters. Inclusion accepts only literal `true` or `false`. Each mutation checks the Supabase error and calls `revalidatePath('/transactions')`, `revalidatePath('/settings')`, and `revalidatePath('/dashboard')` after success.

- [ ] **Step 5: Implement the manual form and list**

`ManualTransactionForm` uses these exact native fields; the empty category represents income and validation rejects it for a negative amount:

```tsx
<label htmlFor="merchant">{dictionary.merchant}</label>
<input id="merchant" name="merchant" maxLength={200} />
<label htmlFor="category">{dictionary.category}</label>
<select id="category" name="category" defaultValue="Other">
  <option value="">{dictionary.noSpendingCategory}</option>
  {CATEGORIES.map((category) => (
    <option key={category} value={category}>{CATEGORY_LABELS[category][language]}</option>
  ))}
</select>
<label htmlFor="date">{dictionary.date}</label>
<input id="date" name="date" type="date" required />
<label htmlFor="amount">{dictionary.amount}</label>
<input id="amount" name="amount" inputMode="decimal" placeholder="-12.34" required />
<label htmlFor="note">{dictionary.note}</label>
<textarea id="note" name="note" maxLength={1000} />
```

The new-transaction page renders this form. The transactions page:

- Calls `requireUser`.
- Reads only the signed-in user's rows, ordered by `transaction_date desc, created_at desc`.
- Accepts `month`, `category`, and `q` search parameters and validates them before adding query filters.
- Passes rows to `TransactionTable`.

The edit page validates the route UUID, queries `.eq('id', id).eq('user_id', user.id).eq('source', 'manual').maybeSingle()`, calls `notFound()` when absent, and renders the same fields prefilled plus a separate delete form. The Settings page queries the signed-in user's merchant rules ordered by normalized merchant and renders a delete button posting the rule UUID; an empty state is shown when no rules exist.

`TransactionTable` displays Merchant, Category, Date, Amount, and Note. Category uses an accessible `<select>` that posts `updateTransactionCategory`; note uses a short form; included/excluded status and an accessible Edit link to `/transactions/{id}/edit` are available in the row details without adding a sixth primary column. Positive amounts and negative amounts must not rely on color alone; include `+`/`−` text.

- [ ] **Step 6: Verify manual transaction behavior**

```bash
npm test -- src/features/transactions
npm run lint
npm run build
```

Expected: PASS. With local Supabase running, sign in as user one, create a `-12.34` Grocery transaction, change it to Cat, and confirm the transaction and merchant rule rows both belong to user one.

- [ ] **Step 7: Commit the manual ledger**

```bash
git add src/app/actions/transactions.ts src/app/'(app)'/transactions src/components src/features/transactions
git commit -m "feat: add private manual transaction ledger"
```

---

### Task 6: Add bilingual preferences and the monthly dashboard

**Files:**
- Create: `src/lib/i18n.test.ts`
- Create: `src/lib/i18n.ts`
- Create: `src/app/actions/preferences.ts`
- Create: `src/components/language-switcher.tsx`
- Create: `src/components/category-bars.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: authenticated navigation and transaction components to use dictionary labels

**Interfaces:**
- Consumes: `Language`, `CATEGORY_LABELS`, `summarizeMonth`, `formatUsd`, `createServerClient`, and `requireUser`.
- Produces: `getDictionary(language)`, `getLanguage()`, `setLanguage`, and the monthly dashboard.

- [ ] **Step 1: Write the failing translation-completeness test**

Create `src/lib/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { dictionaries } from './i18n'

describe('translations', () => {
  it('keeps English and Traditional Chinese keys identical', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries['zh-TW']).sort())
  })
})
```

- [ ] **Step 2: Run the test and observe the missing-module failure**

```bash
npm test -- src/lib/i18n.test.ts
```

Expected: FAIL because `i18n.ts` does not exist.

- [ ] **Step 3: Implement the two explicit dictionaries**

Create `src/lib/i18n.ts` exactly as follows; later components may only consume these keys or add the same key to both languages in the same commit:

```ts
import { cookies } from 'next/headers'
import type { Language } from '@/features/transactions/categories'

export type Dictionary = {
  login: string; email: string; password: string; forgotPassword: string
  sendResetLink: string; resetPassword: string; confirmPassword: string
  dashboard: string; transactions: string; settings: string; merchant: string; category: string
  date: string; amount: string; note: string; totalSpending: string
  netAmount: string; newTransaction: string; save: string; filters: string
  month: string; search: string; language: string; signOut: string
  noTransactions: string; noCategorySpending: string; noSpendingCategory: string
  syncLater: string; included: string; excluded: string; edit: string; delete: string
  merchantRules: string; noMerchantRules: string
  invalidLogin: string; resetSent: string; updateFailed: string
  recoveryExpired: string; passwordUpdated: string
}

export const dictionaries: Record<Language, Dictionary> = {
  en: {
    login: 'Sign in', email: 'Email', password: 'Password', forgotPassword: 'Forgot password?',
    sendResetLink: 'Send reset link', resetPassword: 'Reset password', confirmPassword: 'Confirm password',
    dashboard: 'Dashboard', transactions: 'Transactions', settings: 'Settings', merchant: 'Merchant', category: 'Category',
    date: 'Date', amount: 'Amount', note: 'Note', totalSpending: 'Total spending',
    netAmount: 'Net amount', newTransaction: 'New transaction', save: 'Save', filters: 'Filters',
    month: 'Month', search: 'Search', language: 'Language', signOut: 'Sign out',
    noTransactions: 'No transactions found.', noCategorySpending: 'No category spending this month.',
    noSpendingCategory: 'Income / no spending category', syncLater: 'Bank sync is added in Phase 2.',
    included: 'Included', excluded: 'Excluded', edit: 'Edit', delete: 'Delete',
    merchantRules: 'Merchant rules', noMerchantRules: 'No merchant rules yet.', invalidLogin: 'Unable to sign in.',
    resetSent: 'If the account exists, a reset link has been sent.', updateFailed: 'Unable to update password.',
    recoveryExpired: 'Recovery session expired.', passwordUpdated: 'Password updated.',
  },
  'zh-TW': {
    login: '登入', email: '電子郵件', password: '密碼', forgotPassword: '忘記密碼？',
    sendResetLink: '寄送重設連結', resetPassword: '重設密碼', confirmPassword: '確認密碼',
    dashboard: '每月結算', transactions: '交易紀錄', settings: '設定', merchant: '商家', category: '分類',
    date: '日期', amount: '金額', note: '備註', totalSpending: '支出',
    netAmount: '淨額', newTransaction: '新增交易', save: '儲存', filters: '篩選',
    month: '月份', search: '搜尋', language: '語言', signOut: '登出',
    noTransactions: '找不到交易紀錄。', noCategorySpending: '本月尚無分類支出。',
    noSpendingCategory: '收入／不列支出分類', syncLater: '銀行同步會在第二階段加入。',
    included: '列入結算', excluded: '不列入結算', edit: '編輯', delete: '刪除',
    merchantRules: '商家分類規則', noMerchantRules: '目前沒有商家分類規則。', invalidLogin: '無法登入。',
    resetSent: '如果帳戶存在，重設連結已寄出。', updateFailed: '無法更新密碼。',
    recoveryExpired: '密碼重設工作階段已過期。', passwordUpdated: '密碼已更新。',
  },
}

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language]
}

export async function getLanguage(): Promise<Language> {
  return (await cookies()).get('app-language')?.value === 'en' ? 'en' : 'zh-TW'
}
```

- [ ] **Step 4: Implement language persistence**

Create `src/app/actions/preferences.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function setLanguage(formData: FormData) {
  const user = await requireUser()
  const language = z.enum(['zh-TW', 'en']).parse(formData.get('language'))
  const supabase = await createServerClient()
  const { error } = await supabase.from('profiles').update({ language }).eq('user_id', user.id)
  if (error) throw error
  ;(await cookies()).set('app-language', language, { sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' })
  revalidatePath('/', 'layout')
}
```

`LanguageSwitcher` posts this action from a labeled select.

- [ ] **Step 5: Implement the dashboard query and native category bars**

The dashboard validates `month` as `/^\d{4}-\d{2}$/`, defaulting to the current month in the user's browser-visible timezone for Phase 1. It queries included rows within the month's date bounds, converts database rows into `SummaryTransaction`, and calls the same `summarizeMonth` function used by tests.

`CategoryBars` receives `MonthlySummary`, finds the highest category value, and renders each non-zero category as:

```tsx
<li>
  <div className="category-bar-label">
    <span>{label}</span>
    <span>{formatUsd(value, language)} · {summary.totalSpendingCents === 0 ? '0.0' : (value / summary.totalSpendingCents * 100).toFixed(1)}%</span>
  </div>
  <div className="category-bar-track" aria-label={`${label}: ${formatUsd(value, language)}`}>
    <div className="category-bar-fill" style={{ width: `${Math.max(2, value / max * 100)}%` }} />
  </div>
</li>
```

Do not install a chart library. Dashboard summary cards show total spending and net amount, expose stable `data-testid="total-spending"` and `data-testid="net-amount"` hooks, and category links navigate to `/transactions?month=YYYY-MM&category=...`.

- [ ] **Step 6: Apply bilingual labels and responsive application styles**

- Root layout sets `<html lang={language}>`.
- Navigation, login, dashboard, forms, filters, empty states, and table headings read from the dictionary.
- `globals.css` defines a small token set for background, surface, text, muted text, border, accent, success, and danger.
- Desktop uses a left navigation rail; below 760px, navigation becomes horizontal and the transaction table permits horizontal scrolling.
- Focus rings are visible; labels are explicit; color contrast meets WCAG AA; motion is not required.

- [ ] **Step 7: Verify bilingual monthly reporting**

```bash
npm test
npm run lint
npm run build
```

Expected: PASS. Manually switch languages, confirm the URL and user data do not change, and confirm the August sample totals match Task 2's expected values.

- [ ] **Step 8: Commit the dashboard**

```bash
git add src
git commit -m "feat: add bilingual monthly dashboard"
```

---

### Task 7: Prove two-user isolation and complete Phase 1

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/manual-ledger.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/README.md`

**Interfaces:**
- Consumes: the complete Phase 1 application.
- Produces: a repeatable local verification flow and documented setup.

- [ ] **Step 1: Configure Playwright against the local app**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

Install the single test browser:

```bash
npx playwright install chromium
```

- [ ] **Step 2: Write the two-user isolation E2E test**

Create `tests/e2e/manual-ledger.spec.ts` with executable selectors and environment guards:

```ts
import { expect, test, type Page } from '@playwright/test'

const required = [
  'E2E_USER_ONE_EMAIL', 'E2E_USER_ONE_PASSWORD',
  'E2E_USER_TWO_EMAIL', 'E2E_USER_TWO_PASSWORD',
] as const
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required E2E variable: ${name}`)
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/Email|電子郵件/).fill(email)
  await page.getByLabel(/Password|密碼/).fill(password)
  await page.getByRole('button', { name: /Sign in|登入/ }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('keeps both family members isolated and preserves identity on language change', async ({ browser }) => {
  const uniqueMerchant = `Isolation ${Date.now()}`
  const userOne = await browser.newContext()
  const pageOne = await userOne.newPage()
  await signIn(pageOne, process.env.E2E_USER_ONE_EMAIL!, process.env.E2E_USER_ONE_PASSWORD!)
  const totalBefore = await pageOne.getByTestId('total-spending').textContent()
  await pageOne.getByRole('link', { name: /New transaction|新增交易/ }).click()
  await pageOne.getByLabel(/Merchant|商家/).fill(uniqueMerchant)
  await pageOne.getByLabel(/Category|分類/).selectOption('Grocery')
  await pageOne.getByLabel(/Date|日期/).fill(new Date().toISOString().slice(0, 10))
  await pageOne.getByLabel(/Amount|金額/).fill('-12.34')
  await pageOne.getByRole('button', { name: /Save|儲存/ }).click()
  await expect(pageOne.getByText(uniqueMerchant)).toBeVisible()
  const transactionRow = pageOne.getByRole('row').filter({ hasText: uniqueMerchant })
  const editPath = await transactionRow.getByRole('link', { name: /Edit|編輯/ }).getAttribute('href')
  expect(editPath).toMatch(/^\/transactions\/[0-9a-f-]+\/edit$/)
  await pageOne.goto('/dashboard')
  await expect(pageOne.getByTestId('total-spending')).not.toHaveText(totalBefore ?? '')

  const userTwo = await browser.newContext()
  const pageTwo = await userTwo.newPage()
  await signIn(pageTwo, process.env.E2E_USER_TWO_EMAIL!, process.env.E2E_USER_TWO_PASSWORD!)
  await pageTwo.goto(`/transactions?q=${encodeURIComponent(uniqueMerchant)}`)
  await expect(pageTwo.getByText(uniqueMerchant)).toHaveCount(0)
  await pageTwo.goto(editPath!)
  await expect(pageTwo.getByText(uniqueMerchant)).toHaveCount(0)
  await expect(pageTwo.getByText(/not.*found|找不到/i)).toBeVisible()
  await pageTwo.getByLabel(/Language|語言/).selectOption('en')
  await expect(pageTwo.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(pageTwo.getByText(process.env.E2E_USER_TWO_EMAIL!)).toBeVisible()

  await userOne.close()
  await userTwo.close()
})
```

Do not hard-code credentials or commit `.env.local`. The edit-route assertion proves user two cannot open user one's captured manual transaction URL.

- [ ] **Step 3: Run the E2E test and fix only observed failures**

With local Supabase running and the two local users created:

```bash
npm run test:e2e -- tests/e2e/manual-ledger.spec.ts
```

Expected: PASS in Chromium. If the test exposes a defect, use `systematic-debugging` before editing the application.

- [ ] **Step 4: Document the exact local setup**

Replace the scaffold README with:

- Requirements: Node 22, npm, Docker-compatible runtime, Supabase CLI through the local dev dependency.
- `npm install`, `npx supabase start`, copying `.env.example` to `.env.local`, and obtaining local keys from `npx supabase status`.
- Creating exactly two development users through local Supabase Studio.
- Commands: `npm run dev`, `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run check`.
- A warning that production must use two invited users with public sign-ups disabled.
- A link to the approved design and this roadmap.

Mark Phase 1 as complete in the roadmap only after every verification command passes.

- [ ] **Step 5: Run the full Phase 1 verification gate**

```bash
npm run lint
npm test
npm run test:db
npm run build
npm run test:e2e -- tests/e2e/manual-ledger.spec.ts
git diff --check
git status --short
```

Expected: all checks PASS; `git diff --check` prints nothing; only intended Phase 1 changes are present.

- [ ] **Step 6: Commit Phase 1 verification**

```bash
git add README.md playwright.config.ts tests docs/superpowers/plans/README.md
git commit -m "test: verify isolated manual ledger"
```

Phase 1 is then ready for `requesting-code-review`. Do not begin the Plaid plan until review findings are resolved.
