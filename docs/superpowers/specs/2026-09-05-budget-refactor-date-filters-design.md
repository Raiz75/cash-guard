# Design: Budget Refactor + Date Filters

**Date:** 2026-09-05  
**Status:** Approved  
**Scope:** Budget feature refactor (remove monthly cap) + transaction date filters (bydate, daterange)

---

## 1. Budget Refactor — Remove Monthly Cap

### Goal

The current budget flow requires setting a monthly spending cap first, then adding category breakdowns that must fit within that cap. This is inconvenient — the user must edit the cap just to increase the breakdown limit. Refactor so the budget is defined entirely by category breakdowns. The top card shows the sum of all breakdowns as the total budget.

### Current State

1. User sets a monthly cap (e.g. ₱20,000) via `BudgetDialog`
2. User adds category breakdowns (e.g. Food ₱3,000, Transport ₱2,000)
3. Validation: breakdowns must fit within the cap; lowering the cap requires reducing breakdowns first
4. Top card shows progress against the ₱20,000 cap
5. Breakdown section gated: cannot add breakdowns until a cap is set

### New State

1. No monthly cap — budget = sum of category breakdowns
2. User adds category breakdowns directly (no prerequisite)
3. Top card shows progress against sum of all breakdowns
4. "Add breakdown" button always available
5. If no breakdowns exist, top card shows "No budget yet" with CTA to add first breakdown

### Data Layer Changes

**`lib/db/schema.ts`:**
- Remove `OVERALL_BUDGET_ID` constant
- Keep `categoryBudgetId()`, `parseCategoryBudgetId()`, `CATEGORY_BUDGET_PREFIX` (used for all category budget rows)
- Keep `Budget` type and `budgets` table (still used for category breakdowns)

**`lib/db/repository.ts`:**
- Remove `getBudget()` function (fetched the overall budget row)
- Remove `setBudget()` function (created/updated the overall budget row)
- Update `setCategoryBudget()`: remove the validation that checks sum of breakdowns doesn't exceed overall cap
- Keep `getCategoryBudgets()`, `deleteCategoryBudget()`, `getMonthlySpentByCategory()`

**`lib/hooks/useBudget.ts`:**
- Remove `useBudget()` hook
- Add `useTotalBudget()` hook — returns sum of all category budget amounts (derived from `useCategoryBudgets()`)
- Keep `useCategoryBudgets()` and `useMonthlySpentByCategory()`

### UI Changes

**`components/budget/BudgetView.tsx`:**
- Top card: show `formatPeso(totalBudget - monthlySpent)` remaining, progress bar against `totalBudget`
- Empty state: "No budget yet" with "Add your first breakdown" CTA (opens `CategoryBudgetDialog`)
- Remove "Set monthly budget" button and related `BudgetDialog` trigger
- Breakdown section: "Add breakdown" button always enabled (no gating on overall budget)

**`components/budget/BudgetDialog.tsx`:**
- Delete this file entirely

**`components/budget/CategoryBudgetDialog.tsx`:**
- Remove validation: "Set a monthly budget first" check (no longer needed)
- Remove validation: "Exceeds the monthly budget" check (no cap to exceed)
- Keep: category selection, amount input, positive-amount validation

**`components/transactions/TransactionForm.tsx`:**
- Remove the overall-budget threshold toast logic (the `crossedTier` check for overall budget)
- Keep category-specific threshold toasts (fire when a category breakdown is crossed)

### Validation Changes

**`lib/validations/budget.ts`:**
- `budgetSchema` remains (used for category budget amount)
- Remove any overall-budget-specific validation

### Error Handling

- If `setCategoryBudget` is called with no category selected → existing "Choose a category" error
- No more "Set a monthly budget first" or "Exceeds the monthly budget" errors
- Amount must still be positive

---

## 2. Date Filters — bydate + daterange

### Goal

Replace the fixed "7 days" and "1 month" filters with flexible "By date" and "Date range" filters. Both the Transactions page and Home (dashboard spending card) share the same filter component.

### Current State

- `DateRange = "all" | "today" | "7d" | "1m"`
- `RangeFilter` renders 4 buttons: All time, Today, 7 days, 1 month
- `rangeStartISO()` computes a start date from the range
- Used on both Transactions page and Dashboard spending card

### New State

- `DateRange = "all" | "today" | "bydate" | "daterange"`
- `RangeFilter` renders 4 buttons: All time, Today, By date, Date range
- "By date" → opens a calendar popover to pick a single date
- "Date range" → opens a calendar popover to pick a start and end date
- Selected dates shown as compact text below the buttons

### New Dependencies

```bash
npx shadcn@latest add calendar
npx shadcn@latest add popover
```

These add `components/ui/calendar.tsx` and `components/ui/popover.tsx` (base-maia style, React DayPicker + Base UI).

### Type Changes

**`lib/format.ts`:**
```ts
export type DateRange = "all" | "today" | "bydate" | "daterange";

export type DateFilter = {
  range: DateRange;
  date?: string;       // for "bydate" — ISO date string
  startDate?: string;  // for "daterange" — ISO date string
  endDate?: string;    // for "daterange" — ISO date string
};

export function rangeStartISO(filter: DateFilter): string | null {
  if (filter.range === "all") return null;
  if (filter.range === "today") return toISODate(new Date());
  if (filter.range === "bydate") return filter.date ?? null;
  if (filter.range === "daterange") return filter.startDate ?? null;
  return null;
}

export function rangeEndDateISO(filter: DateFilter): string | null {
  if (filter.range === "daterange") return filter.endDate ?? null;
  return null;
}
```

### Component Changes

**`components/shared/RangeFilter.tsx`:**
- Props change: `value: DateFilter` instead of `value: DateRange`
- `onChange: (filter: DateFilter) => void` instead of `onChange: (range: DateRange) => void`
- Button set: All time | Today | By date | Date range
- When "By date" is selected and no date is set: auto-set to today
- When "By date" is active: show a `Popover` containing a `Calendar` (`mode="single"`)
- When "Date range" is active: show a `Popover` containing a `Calendar` (`mode="range"`)
- Display selected date(s) as compact text below the buttons:
  - Single: "Sep 6, 2026"
  - Range: "Sep 6 – Sep 12, 2026"
- Popover auto-closes on date selection (for single mode) or when user clicks outside

**`components/transactions/TransactionFilters.tsx`:**
- `Filters.range` type changes from `DateRange` to `DateFilter`
- `applyFilters()` update:
  - `bydate`: keep transactions where `tx.date === filter.date`
  - `daterange`: keep transactions where `tx.date >= filter.startDate && tx.date <= filter.endDate`
- Reset filter-specific date values when switching range types

**`components/transactions/TransactionsView.tsx`:**
- Default filter state: `{ type: "all", category: "all", search: "", range: { range: "all" } }`

**`components/dashboard/DashboardView.tsx`:**
- Same `DateFilter` usage for the spending-by-category card
- `expenseByCategory` map filters using `rangeStartISO(filter)` and `rangeEndDateISO(filter)`

### Date Comparison

All dates are stored as ISO `YYYY-MM-DD` strings. Lexicographic comparison (`>=`, `<=`) works correctly for date ranges. No changes needed to the comparison logic.

### Edge Cases

- Selecting "By date" with no date chosen → auto-default to today
- Selecting "Date range" with no dates chosen → auto-default to today–today
- Start date after end date in daterange → swap them automatically
- Clearing a filter resets date state

---

## 3. Files Changed (Summary)

| File | Action |
|------|--------|
| `lib/db/schema.ts` | Remove `OVERALL_BUDGET_ID` |
| `lib/db/repository.ts` | Remove `getBudget()`, `setBudget()`; update `setCategoryBudget()` validation |
| `lib/hooks/useBudget.ts` | Remove `useBudget()`; add `useTotalBudget()` |
| `lib/format.ts` | Update `DateRange` type; add `DateFilter` type; update `rangeStartISO()`; add `rangeEndDateISO()` |
| `lib/validations/budget.ts` | Remove overall-budget validation |
| `components/budget/BudgetView.tsx` | Top card shows total from breakdowns; empty state CTA |
| `components/budget/BudgetDialog.tsx` | Delete |
| `components/budget/CategoryBudgetDialog.tsx` | Remove overall-budget gating |
| `components/shared/RangeFilter.tsx` | New button set; calendar popover for bydate/daterange |
| `components/transactions/TransactionFilters.tsx` | Update `Filters.range` type; update `applyFilters()` |
| `components/transactions/TransactionsView.tsx` | Update default filter state |
| `components/transactions/TransactionForm.tsx` | Remove overall-budget threshold toast |
| `components/dashboard/DashboardView.tsx` | Update to use `DateFilter` |
| `components/ui/calendar.tsx` | New (shadcn add) |
| `components/ui/popover.tsx` | New (shadcn add) |
| `tests/budget.test.ts` | Update tests |
| `tests/budgetView.test.ts` | Update tests |
| `tests/categoryBudgetView.test.ts` | Update tests |

---

## 4. Testing Strategy

- **Budget:** verify total = sum of breakdowns, empty state renders, breakdown CRUD works without overall budget
- **Date filters:** verify bydate shows only matching date, daterange shows inclusive range, switching between types resets properly
- **Regression:** existing transaction CRUD, category management, and export still work
- **Run:** `npm test`, `npm run lint`, `npm run build`
