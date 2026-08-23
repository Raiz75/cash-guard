# Monthly budget page + transactions pagination

Date: 2026-08-23

## Purpose

Two additions to Cash Guard:

1. **Monthly budget** — a single overall spending limit that applies to every calendar month and resets automatically. A dedicated Budget page (4th bottom-nav item) shows spent vs. limit with a progress bar; Sonner toasts warn when adding an expense crosses 50%, 75%, or 90% of the budget.
2. **Transactions pagination** — the transactions list shows 10 transactions at a time with a compact shadcn paginator (Previous / Page X of Y / Next).

The app is local-first, so the budget amount lives in IndexedDB alongside transactions and categories.

## Requirements

### 1. `lib/db/schema.ts` — budgets table

- Bump to `this.version(2)` keeping the version(1) store definitions intact; add `budgets: "id"`.
- New exported type:

```ts
export interface Budget {
  id: string; // always "overall" for now
  amount: number;
  createdAt: number;
  updatedAt: number;
}
```

- Add `budgets!: Table<Budget, string>` to the `DB` class.
- Dexie auto-migrates existing installs on first open after upgrade; no data loss, no user action needed.

### 2. `lib/db/repository.ts` — budget operations

- `getBudget(): Promise<Budget | null>` — reads the `"overall"` row; `null` when no budget has been set.
- `setBudget(amount: number): Promise<void>` — upsert via `db.budgets.put({ id: "overall", amount, createdAt/updatedAt })`; preserves the original `createdAt` when updating an existing row.
- `getMonthlySpent(): Promise<number>` — sums `amount` of all expense transactions whose ISO `date` string falls within `monthRange()` from `lib/format.ts` (lexicographic between-query on the indexed `date` field). Returns 0 when there are none.
- Extend `exportData()`? **No** — JSON backup stays transactions + categories only. The budget is a single number the user can re-enter (documented non-goal).

### 3. `lib/budget.ts` — pure tier logic (new)

Pure functions so Vitest covers the math without DOM or Dexie:

- `type BudgetTier = "ok" | "warn50" | "warn75" | "warn90" | "over"`.
- `budgetTier(spent: number, limit: number): { pct: number; tier: BudgetTier }` — `pct = (spent / limit) * 100`. Tiers: `< 50` → ok, `[50, 75)` → warn50, `[75, 90)` → warn75, `[90, 100)` → warn90, `>= 100` → over. `limit <= 0` returns `{ pct: 0, tier: "ok" }` (guards division by zero).
- `crossedTier(beforePct: number, afterPct: number): BudgetTier | null` — the highest threshold newly reached (`beforePct < t <= afterPct` for t in 50/75/90/100); `null` when nothing new was crossed. Crossing multiple tiers in one edit returns the highest one.

### 4. `lib/hooks/useBudget.ts` — live queries (new)

Same `useLiveQuery` pattern as `useTransactions.ts`:

- `useBudget(): Budget | undefined` — live-reads the budgets table.
- `useMonthlySpent(): number | undefined` — live-sums current-month expenses (reuses the same query logic as `getMonthlySpent`, reading through `db` directly).
- Read-only — never writes inside a live query (ReadonlyError).

### 5. `components/ui/pagination.tsx` and `components/ui/progress.tsx`

Two new shadcn/ui primitives matching the base-maia preset (Base UI under the hood where applicable):

- `pagination.tsx`: `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext`, `PaginationLink` (only what's used).
- `progress.tsx`: `Progress` indicator bar whose filled segment color is controllable via `className` on the indicator.

### 6. Budget UI

- **`app/budget/page.tsx`**: `force-dynamic` route rendering `BudgetView`, metadata title `"Budget · Cash Guard"` (mirrors the other three routes).
- **`components/budget/BudgetView.tsx`**: shared shell (`Header`, `BottomNav`, centered `max-w-md` column with `pb-20`).
  - Header subtitle shows the current month label (e.g. "August 2026").
  - Card contents: month label, big remaining figure (`formatPeso(limit - spent)`, negative shown when over), secondary line "spent of limit", and the `Progress` bar.
  - Bar fill by tier: below 75% → `bg-primary`; 75–89% → `bg-amber-500`; ≥ 90% → `bg-destructive`. Tier text hint beside amounts ("50% of budget used", etc.) driven by `budgetTier`.
  - Empty state (no budget row): card prompts to set a first monthly limit.
  - "Set budget" / "Edit budget" Button opens `BudgetDialog`.
- **`components/budget/BudgetDialog.tsx`**: shadcn `Dialog` + React Hook Form + Zod schema (`lib/validations/budget.ts`: positive number > 0, coerced from input). Save calls `repository.setBudget`, success toast, closes dialog; error toast on failure.

### 7. Bottom nav

- **`components/shared/BottomNav.tsx`**: add `{ href: "/budget", label: "Budget" }` between Transactions and Settings. Icon: Tabler `IconPigMoney` (project convention is Tabler for new UI).

### 8. Threshold toasts on save

In **`components/transactions/TransactionForm.tsx`** `onSubmit`, after a successful save of an **expense** whose `date` falls inside the current calendar month:

1. Before writing, read current `getMonthlySpent()` + `getBudget()`.
2. After the write, recompute `getMonthlySpent()`.
3. If a budget exists and `crossedTier(beforePct, afterPct)` is non-null → `toast.warning(...)` naming the crossed tier ("You've used 75% of your monthly budget"; over → "You've exceeded your monthly budget").

Income saves and deletes never trigger warnings. No persistence of "already warned" state — re-crossing after a delete/re-add warns again (acceptable; simple).

### 9. Transactions pagination

- **`components/transactions/TransactionsView.tsx`**:
  - `PAGE_SIZE = 10`; new `page` state (1-based).
  - Filter changes reset to page 1 by wrapping `onChange` with a handler that does both `setFilters` and `setPage(1)` — no `useEffect` setState (React Compiler lint).
  - Displayed page clamps during render: `displayPage = Math.min(page, totalPages)` so deleting rows never reveals a blank page.
  - List renders `paginate(filtered, displayPage, PAGE_SIZE).rows`; pager hidden entirely when `filtered.length <= PAGE_SIZE`.
  - Compact pager under the card: `PaginationPrevious` ("Previous"), middle item "Page X of Y", `PaginationNext` ("Next"); buttons disabled at the bounds.
  - Header subtitle `"N shown"` keeps reporting the full filtered count.
- **`lib/paginate.ts`** (new pure helper): `paginate<T>(items: T[], page: number, size: number): { rows: T[]; totalPages: number }` — clamps out-of-range pages, `totalPages >= 1`.

## Testing (Vitest)

- **`tests/budget.test.ts`** (new): `budgetTier` boundaries exactly at 50/75/90/100, just-below values, zero/negative limit guard; `crossedTier` happy path (single crossing), no crossing, backwards move (delete-like), multi-tier jump returns highest.
- **`tests/repository.test.ts`** (extend): budget read when absent (`null`), `setBudget` insert then update preserving `createdAt`, `getMonthlySpent` includes expenses in-month, excludes other months/income, returns 0 on empty.
- **`tests/paginate.test.ts`** (new): happy path, exact-multiple boundary (10 items → 1 page), partial last page, page beyond range clamps, empty input, non-positive page/size guards.

## Non-goals

- No per-category budgets (schema leaves room, but nothing reads/writes them today).
- No changes to CSV/JSON export/import for budgets.
- No persistent "warned" memory, notifications, or widget badges.
- No dashboard budget summary card — budget lives on its own page only.
- No numbered-page pagination; compact Previous/Next only.

## Verification

- `npm test` — new suites above pass.
- `npm run lint` clean; `npm run build` passes (TypeScript + production build).
- Manual: set a budget on /budget; add expenses and observe bar color tiers and toasts at 50/75/90%; add >100% expense → over-state; old install opens without data loss (Dexie v2 migration); /transactions paginates 10-at-a-time, filter change jumps back to page 1, deleting last row of last page doesn't blank out.
