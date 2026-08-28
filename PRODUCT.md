# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two family members in the United States who each sign in to a private personal ledger. They use different computers and must never see one another's financial data.

## Product Purpose

A bilingual USD personal-finance application for quickly recording and categorizing personal transactions during the month, then reviewing spending and net amount at month-end.

## Positioning

Each person has a separate, private ledger with a fixed category system, monthly settlement, and on-demand PDF and Excel exports. The app is intentionally a focused household tool, not a shared household budget or public finance product.

## Operating Context

Users add and edit manual transactions regularly, scan and filter the transaction record, and use the monthly dashboard to understand total spending, net amount, and category spending. A future phase will import read-only US bank transactions through Plaid and review Venmo imports manually.

## Capabilities and Constraints

- Email-and-password access for two pre-approved users.
- Traditional Chinese and English interfaces; USD only.
- Fixed categories: Travel, Grocery, Shopping, Car, Dine Out, Utility, Entertainment, Learning, Home, Cat, and Other.
- Manual transactions distinguish income from expense without requiring the user to enter a sign.
- Monthly exports are generated on demand and are not persisted.
- Data isolation is enforced by Supabase Auth and Row Level Security.
- No bank money movement, shared ledger, multi-currency support, or investment tracking.

## Brand Commitments

The interface must become a modern, dark-background operating tool that remains calm and highly legible for frequent transaction work and monthly review.

## Evidence on Hand

The application has working authenticated screens, live transaction data, bilingual copy, and monthly reporting calculations. No logo, bespoke illustration set, or external brand assets are available; future design work must not fabricate financial claims or institutional affiliations.

## Product Principles

1. Separate ownership must be obvious in behavior and never compromised in the interface.
2. Frequent tasks must be quick to scan and act on.
3. The monthly view should turn raw transactions into a clear financial picture.
4. Visual refinement must not obscure money direction, data status, or destructive actions.
5. Bilingual copy and responsive use are first-class requirements.

## Accessibility & Inclusion

Keyboard-accessible controls, visible focus states, and WCAG AA contrast are required. Color alone must not convey transaction direction, category, inclusion, or destructive actions.
