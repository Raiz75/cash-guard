# Budget Refactor + Date Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the monthly budget cap (budget = sum of category breakdowns) and replace fixed 7d/1m date filters with flexible bydate/daterange calendar pickers on both the Transactions and Dashboard pages.

**Architecture:** Two independent features sharing a common data layer. Budget refactor removes the `overall` budget row concept and derives totals from category breakdowns. Date filters extend the `DateRange` type to `DateFilter` with calendar popover UI via shadcn Calendar + Popover components.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui (base-maia), Dexie (IndexedDB), React DayPicker (via shadcn Calendar), Vitest.

## Global Constraints

- Node ≥ 20.9 required (use `~/.local/node/bin` on this machine)
- shadcn preset is `base-maia`, icon library is Tabler (`@tabler/icons-react`)
- All data is local-first (IndexedDB via Dexie) — no API routes, no server DB
- `useLiveQuery` callbacks must be read-only (no writes inside)
- `useWatch` (not `form.watch`) for React Compiler lint compatibility
- Theme colors: teal `--primary` for income/positive, `--destructive` for expense/negative — no hardcoded `green-600`/`red-600`
- AI-CONTEXT-NOTE required on every code file (first line)
- Tests: `npm test` (Vitest), lint: `npm run lint`, build: `npm run build`

---

## Task 1: Remove Overall Budget from Data Layer

**Files:**
- Modify: `lib/db/schema.ts` (remove `OVERALL_BUDGET_ID`)
- Modify: `lib/db/repository.ts` (remove `getBudget`, `setBudget`, update `setCategoryBudget` validation)
- Modify: `lib/hooks/useBudget.ts` (remove `useBudget` hook)
- Modify: `lib/validations/budget.ts` (remove `budgetSchema` — only used by deleted `BudgetDialog`)

**Interfaces:**
- Consumes: existing `Budget` type, `categoryBudgetId()`, `CATEGORY_BUDGET_PREFIX`
- Produces: removed `OVERALL_BUDGET_ID`, removed `getBudget()`, removed `setBudget()`, simplified `setCategoryBudget()`

- [ ] **Step 1: Remove `OVERALL_BUDGET_ID` from schema**

In `lib/db/schema.ts`, remove the line:
```ts
export const OVERALL_BUDGET_ID = "overall";
```

Keep `categoryBudgetId()`, `parseCategoryBudgetId()`, `CATEGORY_BUDGET_PREFIX`, `Budget` type, and `budgets` table definition.

- [ ] **Step 2: Remove `getBudget` and `setBudget` from repository**

In `lib/db/repository.ts`:
- Remove the `getBudget()` function entirely
- Remove the `setBudget()` function entirely
- Remove the import of `OVERALL_BUDGET_ID` from schema

- [ ] **Step 3: Simplify `setCategoryBudget` validation**

In `lib/db/repository.ts`, the `setCategoryBudget()` function currently:
1. Checks if overall budget exists (rejects "Set a monthly budget first")
2. Checks sum of other breakdowns + new amount doesn't exceed overall cap

Remove both checks. Keep only:
- Amount must be positive (> 0)
- Category ID must be provided

The simplified function body:
```ts
export async function setCategoryBudget(
  categoryId: string,
  amount: number
): Promise<void> {
  if (!categoryId) throw new Error("Choose a category");
  if (amount <= 0) throw new Error("Amount must be greater than 0");

  const id = categoryBudgetId(categoryId);
  const existing = await db.budgets.get(id);

  await db.budgets.put({
    id,
    amount,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}
```

- [ ] **Step 4: Remove `useBudget` hook**

In `lib/hooks/useBudget.ts`:
- Remove the `useBudget()` function entirely
- Remove the `OVERALL_BUDGET_ID` import
- Keep `useCategoryBudgets()` and `useMonthlySpentByCategory()`
- Keep `useMonthlySpent()`

- [ ] **Step 5: Remove `budgetSchema` from validations**

In `lib/validations/budget.ts`:
- Remove `budgetSchema` and `BudgetInput` type (only used by deleted `BudgetDialog`)
- Keep `categoryBudgetSchema` and `CategoryBudgetInput` type

- [ ] **Step 6: Update TransactionForm to remove overall-budget toast**

In `components/transactions/TransactionForm.tsx`:
- Remove the import of `getBudget` and `getMonthlySpent` from repository
- Remove the overall-budget threshold toast logic (the code that calls `getBudget()`, `getMonthlySpent()`, and `crossedTier()` for the overall budget)
- Keep the category-specific threshold toasts (the code that calls `getCategoryBudgets()`, `getMonthlySpentByCategory()`, and fires labeled per-category warnings)

- [ ] **Step 7: Run tests to verify data layer changes**

Run: `npm test`
Expected: Existing tests may fail due to removed functions. Fix any import errors in test files.

- [ ] **Step 8: Commit**

```bash
git add lib/db/schema.ts lib/db/repository.ts lib/hooks/useBudget.ts lib/validations/budget.ts components/transactions/TransactionForm.tsx
git commit -m "refactor(budget): remove overall budget cap, derive total from category breakdowns"
```

---

## Task 2: Update Budget UI to Use Derived Total

**Files:**
- Modify: `components/budget/BudgetView.tsx` (top card shows total from breakdowns)
- Modify: `components/budget/CategoryBudgetDialog.tsx` (remove overall-budget gating)
- Delete: `components/budget/BudgetDialog.tsx`
- Modify: `app/budget/page.tsx` (if it imports BudgetDialog)

**Interfaces:**
- Consumes: `useCategoryBudgets()`, `useMonthlySpentByCategory()`, `useMonthlySpent()` from Task 1
- Produces: updated BudgetView with derived-total top card, always-enabled "Add breakdown" button

- [ ] **Step 1: Add `useTotalBudget` hook**

In `lib/hooks/useBudget.ts`, add a new hook:
```ts
export function useTotalBudget(): number | undefined {
  const catBudgets = useCategoryBudgets();
  if (catBudgets === undefined) return undefined;
  return catBudgets.reduce((sum, b) => sum + b.amount, 0);
}
```

- [ ] **Step 2: Update BudgetView top card**

In `components/budget/BudgetView.tsx`:
- Replace `useBudget()` with `useTotalBudget()`
- The top card now shows: `formatPeso(totalBudget - monthlySpent)` remaining
- Progress bar uses `budgetTier(monthlySpent, totalBudget)`
- Empty state: when `catBudgets` is loaded and empty (length === 0), show "No budget yet" with "Add your first breakdown" CTA
- Remove the "Set monthly budget" button and `BudgetDialog` import/trigger

- [ ] **Step 3: Update CategoryBudgetDialog**

In `components/budget/CategoryBudgetDialog.tsx`:
- Remove the check that requires an overall budget to exist before allowing breakdown creation
- The dialog should always be openable when the user clicks "Add breakdown"
- Keep category selection and amount input validation

- [ ] **Step 4: Delete BudgetDialog**

Delete `components/budget/BudgetDialog.tsx` entirely.

- [ ] **Step 5: Update budget page if needed**

Check `app/budget/page.tsx` for any BudgetDialog imports and remove them.

- [ ] **Step 6: Update budget tests**

Update `tests/budget.test.ts`, `tests/budgetView.test.ts`, `tests/categoryBudgetView.test.ts`:
- Remove tests for `getBudget`, `setBudget`, `useBudget`
- Add tests for `useTotalBudget` (derives sum from category budgets)
- Update BudgetView tests to expect derived total in top card
- Update CategoryBudgetDialog tests to verify no overall-budget gating

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add components/budget/ lib/hooks/useBudget.ts tests/budget*.ts tests/categoryBudgetView.test.ts
git commit -m "feat(budget): top card shows sum of category breakdowns as total"
```

---

## Task 3: Add shadcn Calendar and Popover Components

**Files:**
- Create: `components/ui/calendar.tsx` (via shadcn CLI)
- Create: `components/ui/popover.tsx` (via shadcn CLI)

**Interfaces:**
- Consumes: shadcn base-maia registry
- Produces: `Calendar` and `Popover` components for date picker UI

- [ ] **Step 1: Add calendar component**

Run: `npx shadcn@latest add calendar`

Verify `components/ui/calendar.tsx` is created.

- [ ] **Step 2: Add popover component**

Run: `npx shadcn@latest add popover`

Verify `components/ui/popover.tsx` is created.

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds with new components.

- [ ] **Step 4: Commit**

```bash
git add components/ui/calendar.tsx components/ui/popover.tsx
git commit -m "chore: add shadcn calendar and popover components"
```

---

## Task 4: Update DateFilter Types and RangeFilter Component

**Files:**
- Modify: `lib/format.ts` (update `DateRange`, add `DateFilter`, update `rangeStartISO`, add `rangeEndDateISO`)
- Modify: `components/shared/RangeFilter.tsx` (new button set, calendar popover UI)

**Interfaces:**
- Consumes: shadcn `Calendar` and `Popover` from Task 3
- Produces: `DateFilter` type, updated `RangeFilter` component with calendar pickers

- [ ] **Step 1: Update DateRange type and add DateFilter in format.ts**

In `lib/format.ts`, replace:
```ts
export type DateRange = "all" | "today" | "7d" | "1m";
```

With:
```ts
export type DateRange = "all" | "today" | "bydate" | "daterange";

export type DateFilter = {
  range: DateRange;
  date?: string;       // for "bydate" — ISO date string
  startDate?: string;  // for "daterange" — ISO date string
  endDate?: string;    // for "daterange" — ISO date string
};
```

- [ ] **Step 2: Update rangeStartISO**

Replace the existing `rangeStartISO` function:
```ts
export function rangeStartISO(filter: DateFilter): string | null {
  if (filter.range === "all") return null;
  if (filter.range === "today") return toISODate(new Date());
  if (filter.range === "bydate") return filter.date ?? null;
  if (filter.range === "daterange") return filter.startDate ?? null;
  return null;
}
```

- [ ] **Step 3: Add rangeEndDateISO**

Add a new function:
```ts
export function rangeEndDateISO(filter: DateFilter): string | null {
  if (filter.range === "daterange") return filter.endDate ?? null;
  return null;
}
```

- [ ] **Step 4: Rewrite RangeFilter component**

In `components/shared/RangeFilter.tsx`:

Update the `OPTIONS` array:
```ts
const OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "bydate", label: "By date" },
  { value: "daterange", label: "Date range" },
];
```

Update props:
```ts
interface RangeFilterProps {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
}
```

Add state for calendar open/close and date selection:
- When "By date" is selected and no date is set, auto-set to today
- When "Date range" is selected and no dates are set, auto-set to today–today
- Show a `Popover` with a `Calendar` (`mode="single"` for bydate, `mode="range"` for daterange)
- Display selected date(s) as compact text below the buttons

The component renders:
1. A row of 4 buttons (All time | Today | By date | Date range)
2. Below the buttons, if bydate/daterange is active: a Popover trigger showing the selected date(s)
3. The Popover contains a Calendar component

- [ ] **Step 5: Update TransactionsView default filter state**

In `components/transactions/TransactionsView.tsx`, update the default filter:
```ts
const [filters, setFilters] = useState<Filters>({
  type: "all",
  category: "all",
  search: "",
  range: { range: "all" },
});
```

- [ ] **Step 6: Update TransactionFilters**

In `components/transactions/TransactionFilters.tsx`:
- Change import from `import { rangeStartISO, type DateRange } from "@/lib/format"` to `import { rangeStartISO, rangeEndDateISO, type DateFilter } from "@/lib/format"`
- Update `Filters.range` type from `DateRange` to `DateFilter`
- Update `applyFilters` to handle bydate and daterange:

```ts
export function applyFilters(
  transactions: Transaction[],
  filters: Filters
): Transaction[] {
  const q = filters.search.toLowerCase().trim();
  const rangeStart = rangeStartISO(filters.range);
  const rangeEnd = rangeEndDateISO(filters.range);
  return transactions.filter((tx) => {
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.category !== "all" && tx.category !== filters.category) return false;
    if (rangeStart && tx.date < rangeStart) return false;
    if (rangeEnd && tx.date > rangeEnd) return false;
    if (q) {
      const haystack = `${tx.description ?? ""} ${tx.category}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
```

- [ ] **Step 7: Update DashboardView to use DateFilter**

In `components/dashboard/DashboardView.tsx`:
- Change import from `import { type DateRange } from "@/lib/format"` to `import { rangeStartISO, rangeEndDateISO, type DateFilter } from "@/lib/format"`
- Change `DateRange` state to `DateFilter` state
- Update the `RangeFilter` value/onChange props
- Update the expenseByCategory filter to use `rangeStartISO(filter)` and `rangeEndDateISO(filter)`

- [ ] **Step 8: Run tests and verify**

Run: `npm test && npm run lint && npm run build`
Expected: All pass.

- [ ] **Step 9: Commit**

```bash
git add lib/format.ts components/shared/RangeFilter.tsx components/transactions/TransactionFilters.tsx components/transactions/TransactionsView.tsx components/dashboard/DashboardView.tsx
git commit -m "feat(filters): replace 7d/1m with bydate/daterange calendar pickers"
```

---

## Task 5: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`
Open http://localhost:3000 and verify:
- Budget page: no "Set monthly budget" button; "Add breakdown" always works; top card shows sum of breakdowns
- Transactions page: filter buttons are All time | Today | By date | Date range; calendar popovers work
- Dashboard: spending card uses the same new filters
