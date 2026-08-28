# Signal Console UI Redesign

## Decision

The selected visual direction is **B — Signal Console**. The product will feel like a precise, private personal ledger: dark, calm, compact, and readable. It will not use neon effects, faux-terminal syntax, game-like decorations, or visual noise.

## Goals

- Make the two core jobs equally easy: record/review a transaction quickly, and understand a month at a glance.
- Make the transactions page easy to scan, filter, and act on without hiding the existing data fields.
- Give each private user an unambiguous sense of their current month, unreviewed items, and spending by category.
- Preserve all existing behaviour: separate accounts, bilingual UI, USD, manual entries, delete, exports, reports, and authentication.

## Information architecture

The application shell has a narrow persistent desktop rail and a responsive compact mobile header.

- Overview (`/dashboard`) — current-month outflow, net amount, category leader, unreviewed total, selected category breakdown, and the most recent activity.
- Transactions (`/transactions`) — the daily working ledger, where the user scans and manages entries.
- Add transaction (`/transactions/new`) — one focused, short form.
- Monthly report (`/reports/monthly`) — a closeable month: outflow, net amount, category totals, then export/print actions.
- Settings — language and account preferences.

The active location is shown by a solid high-contrast rail item, not only by a subtle color change. The current user's email and the logout control remain together at the bottom of the rail.

## Visual system

### Color and surface

- Background: near-black blue-charcoal, not pure black.
- Raised panels: only one level lighter than the background, with thin cool-gray borders.
- Primary text: soft white; secondary information: desaturated blue-gray.
- Positive/net indicator: muted mint green.
- Spending/outgoing value: soft warm red, reserved for money and destructive actions.
- Awaiting confirmation: muted amber.
- Charts and category chips: restrained cool colors with adequate contrast; color is never the only state cue.

### Typography and rhythm

- UI text uses the existing system sans stack, with tabular numerals for monetary values.
- Dashboard headline money values are prominent; supporting labels use a small uppercase tracking treatment.
- Data tables keep a compact but touch-safe row height. Columns align to consistent edges so amounts can be compared vertically.
- Corners are modestly rounded, with no glassmorphism or strong gradients.

### Motion and accessibility

- Interactions use 150–200 ms opacity/color changes only. Respect `prefers-reduced-motion`.
- Keyboard focus is visible with a mint outline.
- Text/background and interactive states meet WCAG AA contrast. Status labels accompany color.

## Dashboard layout

1. **Console header**: current month and quick "Add transaction" action.
2. **Primary readout**: monthly spending displayed as the dominant number, accompanied by transaction count and month selector.
3. **Two supporting readouts**: net balance and items awaiting review. These are compact and directly actionable.
4. **Category signal**: a ranked, horizontal category list with amount, share, and a clear total; no decorative chart unless it improves comparison.
5. **Recent ledger**: the latest transactions in the same visual language as the transactions page, with a direct link to see all.

## Transactions layout

This page is the operational centre, not a collection of cards.

- Top area: page title, current result count, primary "Add transaction" button, and a compact filter bar.
- The filter bar includes month, category, account/source when available, and a clear all-filters control. On small screens it collapses into a labelled filter control.
- A slim summary strip shows: total outflow, income/net context, and **Needs review**. Tapping/clicking Needs review applies that filter.
- Desktop table columns, in order: **Merchant**, **Category**, **Date**, **Amount**, **Note**, **Status**, **Actions**.
- Merchant is the visual anchor with a small category marker. Category is a readable chip, not only a color dot. Amounts are right-aligned and use tabular numerals.
- A manually entered transaction is labelled `Manual`; an imported transaction will later be labelled by its bank. A Venmo/import candidate that needs attention displays `Needs review` in amber.
- The transaction detail/edit action is the primary row action. Delete remains available for manual transactions only and requires a confirmation.
- Empty, filtered-empty, and loading states each explain what happened and expose the next useful action.

## Mobile behavior

- The rail becomes a header with navigation trigger; the current page remains visible.
- Summary blocks stack in priority order.
- The transaction table becomes a two-line ledger list: merchant/category at left, date/amount at right; note and status appear beneath. Selecting a row opens the existing edit/detail flow.
- Destructive action is never placed next to a primary tap target on mobile.

## Bilingual content

- All labels, statuses, empty states, confirmation text, and chart/table labels receive zh-TW and English translations.
- English financial terms stay concise: `Spent`, `Net`, `Needs review`, `Manual`, `Delete`.
- Chinese equivalents should be natural, not literal: `支出`, `淨額`, `待確認`, `手動輸入`, `刪除`.

## Out of scope

- Plaid Link, bank syncing, Venmo automation, new data models, banking credentials, and changes to access policies.
- New chart libraries or a component-library migration unless implementation proves a small existing dependency cannot meet the design.

## Acceptance criteria

- The app has a consistent dark Signal Console visual system on login, shell, dashboard, transactions, monthly report, forms, and settings.
- A user can identify the active page, add a transaction, log out, and find delete on eligible manual entries without instruction.
- The transaction list visibly distinguishes merchant, category, date, amount, note, and review status at desktop and mobile widths.
- Existing data isolation, categories, bilingual switching, report/export flows, and tests remain intact.
