# Design — Category icon, one-column list, and breakdown total

## Context

Three small UI/data changes to the Cash Guard PWA:

1. **Seeded categories all use the tag icon** — instead of the current per-category icons.
2. **Settings category list is one column** — instead of the current two-column grid.
3. **Spending by category shows a filtered total** — the sum of expenses in the selected range.

## Requirements

### 1. Seeded icons → all `tag`

- `lib/db/schema.ts` — `seedIfEmpty`:
  - Change every default category's `icon` to `"tag"` (Salary, Freelance, Food, Transport, Shopping, Bills, Entertainment, Other). Colors stay unchanged.
  - Existing browsers keep already-seeded categories with their old distinct icons because `seedIfEmpty` only inserts missing categories. To make the change apply to them too, run a one-time migration **inside the same `rw` transaction** (after the dedupe loop): any existing category that has a non-null `icon` gets `icon: "tag"`.
  - Rationale for "any non-null icon": only seeded categories ever receive a non-null icon — `addCategory` (`lib/db/repository.ts`) and `importTransactions` both write `icon: null`. So targeting non-null icons precisely covers already-seeded rows and never touches user-created ones.

### 2. One-column category list

- `components/settings/SettingsView.tsx` (the "Categories" card): change the container from `grid grid-cols-2 gap-2` to a single-column stacked layout (`flex flex-col gap-2`).
- Each row keeps its current content: icon, name, In/Ex badge, and edit/delete buttons.

### 3. Filtered total in "Spending by category"

- `components/dashboard/DashboardView.tsx`:
  - Compute `totalSpent` as the sum of the range-filtered `breakdown` amounts (`breakdown.reduce(...)`).
  - In the card header, below the `RangeFilter`, render an always-visible row:
    - Muted `Total` label on the left.
    - Bold `formatPeso(totalSpent)` on the right.
  - The row shows `₱0` when the range is empty. The existing "No expenses in this period." empty-state message in the card body stays.

## Out of scope

- No new category icons or icon picker; user-created categories keep `icon: null` (renders as tag via `CategoryIcon` fallback).
- No changes to CSV import/export, dashboard balance card, or transactions page.

## Verification

No test runner is configured in this project. Verify with:

```bash
npm run build
npm run lint
```

Both must pass.
