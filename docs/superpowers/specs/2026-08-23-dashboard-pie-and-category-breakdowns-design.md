# Design: Dashboard Donut, Budget Indicator, and Category Budget Breakdowns

Date: 2026-08-23
Branch: `feat/dashboard-pie-and-category-breakdowns`
Status: Approved (brainstorming session, 2026-08-23)

## Overview

Four changes to Cash Guard:

1. Replace the Settings icon in the bottom navigation with an appropriate gear icon.
2. Convert the dashboard "Spending by category" bar list into a donut (pie) chart using the shadcn Chart component.
3. Add a monthly-budget usage indicator to that same card (between the Total row and the chart).
4. Add category-level budget breakdowns on the Budget page, validated against the overall monthly budget, with the same tier warning system as the overall budget.

All data stays local-first in IndexedDB via Dexie. No new tables; no schema migration.

## 1 · Settings icon

`components/shared/BottomNav.tsx`: the Settings tab currently uses lucide `ChartPie` (a pie-chart icon — wrong affordance). Replace with Tabler `IconSettings`, matching the project's Tabler-icon convention and the existing `IconPigMoney` import pattern.

No behavior change.

## 2 · Dashboard donut chart

### Dependency

`npx shadcn@latest add chart` — generates `components/ui/chart.tsx` (ui boilerplate, excluded from AI-CONTEXT-NOTE per repo convention) and adds **recharts v3** (~100 KB gz, one-time service-worker cache). The maia preset already defines `--chart-1..5` tokens for light and dark in `app/globals.css`.

### Components

- **`lib/spending.ts`** (new, pure): `buildSpendingSlices(entries: [string, number][], categories: Category[])` → `{ name: string; value: number; fill: string }[]`, sorted high→low. Fill resolution: `category.color` when set; otherwise cycle deterministically through `var(--chart-1)` … `var(--chart-5)` by slice index. Zero-total input returns `[]`. Pure so it is unit-testable without DOM or Recharts.
- **`components/dashboard/SpendingDonut.tsx`** (new): wraps shadcn `ChartContainer` + Recharts `PieChart`/`Pie` (`dataKey="value"`, `innerRadius` ≈ 55%, `outerRadius` ≈ 85%, slices stroked with `var(--background)` for separation). Total spent rendered centered in the hole via an absolutely-positioned overlay div. Requires a `min-h-*`/aspect class on `ChartContainer` so `ResponsiveContainer` measures on first render (per shadcn docs).

### Dashboard integration

The Spending by Category card becomes:

1. Title + RangeFilter + Total row (unchanged).
2. Monthly budget indicator (section 3) — hidden when no budget exists.
3. Donut reflecting the selected range.
4. Legend list below: **all** categories (no top-5 cap), sorted high→low, each row = CategoryIcon · name · peso amount · % of total. Replaces the current bars entirely; the custom legend is ours, not Recharts'.

Empty state unchanged ("No expenses in this period."). Single-category case renders a full ring.

## 3 · Monthly budget indicator (dashboard)

Inside the Spending by Category card, between the Total row and the donut:

- Text: `₱X of ₱Y · Z% used`, labeled "Monthly budget".
- Thin tier-colored progress bar using the existing `budgetTier()` tiers (primary / amber-500 at 75–89 / destructive ≥ 90).

Rules:

- Always **month-to-date** regardless of the selected range filter (user requirement: tracks only the monthly budget, never per-category).
- Hidden entirely while loading or when no overall budget row exists.
- Data from the existing `useBudget()` + `useMonthlySpent()` hooks.

## 4 · Category budget breakdowns

### Data model (Approach A — namespaced rows)

Rows live in the existing `budgets` table with the unchanged shape `{ id, amount, createdAt, updatedAt }`:

- Overall budget: `id = "overall"` (`OVERALL_BUDGET_ID`, unchanged).
- Category budget: `id = "cat:<categoryId>"`.

New exports in `lib/db/schema.ts`:

```ts
export const CATEGORY_BUDGET_PREFIX = "cat:";
export function categoryBudgetId(categoryId: string): string;
export function parseCategoryBudgetId(id: string): string | null;
```

Breakdowns reference the category's stable `id`, so category renames need no cascade. No Dexie version bump — the table's index is already just `id`.

### Repository (`lib/db/repository.ts`)

| Function | Behavior |
|---|---|
| `getCategoryBudgets(): Promise<Budget[]>` | All rows whose id starts with the prefix. |
| `setCategoryBudget(categoryId, amount)` | Upsert preserving `createdAt`. Throws when: no overall budget exists ("Set a monthly budget first"); Σ(other breakdowns + amount) > overall.amount (over-allocation message). Exactly-equal sums are allowed. |
| `deleteCategoryBudget(categoryId)` | Removes the row if present. |
| `deleteCategory(id)` | Existing rw transaction extended to also delete the category's breakdown row atomically. |
| `setBudget(amount)` | Now rejects lowering the overall budget below Σ(current breakdowns), with a message naming the total allocated. |

Validation lives in the repository (single source of truth); dialogs surface thrown messages inline/toast.

### Hooks & pure helpers

- `useCategoryBudgets(): Budget[] | undefined` — live query over prefixed rows.
- `useMonthlySpentByCategory(): Record<string, number> | undefined` — monthRange-scoped expenses grouped by category **name** (keys are names because transactions join by name; views map budget `categoryId` → name via `useCategories`).
- `lib/budget.ts`: add `budgetTierMessage(tier: WarningTier, label?: string): string` — returns `"You've used 75% of your Food budget"` when labeled, otherwise the existing `BUDGET_TIER_MESSAGES` copy. Keep boundary math untouched.

### Tier styles shared

Extract the main card's `BAR_COLOR` / `HINT_COLOR` / `HINT_TEXT` maps into `components/budget/tierStyles.ts` so the main budget card and each breakdown row render identical tier visuals.

### Budget page UI

Under the main budget card, a "Breakdown" section:

- Header: title + "Add breakdown" button (disabled with hint until an overall budget exists).
- One row per category budget: CategoryIcon + category name, `₱spent of ₱allotted this month`, tier-colored `Progress` bar, tier hint text, Edit and Remove actions.
- Remove acts immediately with a success toast (consistent with lightweight local-first UX; no extra confirm dialog).
- Empty state: short hint text inviting the first breakdown.

**`components/budget/CategoryBudgetDialog.tsx`** (new, RHF + Zod):

- Fields: expense-category Select (only expense categories without an existing breakdown; locked/disabled when editing) and amount Input.
- `categoryBudgetSchema` in `lib/validations/budget.ts`: `categoryId` non-empty string, `amount` positive number (mirrors `budgetSchema`'s amount rules).
- Save calls `setCategoryBudget`; repository errors (over-allocation, missing overall) render as an inline destructive message inside the dialog (form-level error under the fields), not a toast. Success closes with a success toast.

### Toast warnings on expense save

`components/transactions/TransactionForm.tsx` already computes before/after monthly pct for the overall budget and fires `crossedTier` toasts. Extend: when saving an **expense**, additionally resolve the transaction's category id, compute that category's month-to-date spend before/after including the saved transaction, and if `crossedTier` fires for its category budget, toast `budgetTierMessage(tier, categoryName)`. Both toasts may fire for one save (stacked) — acceptable.

## Error handling summary

| Situation | Behavior |
|---|---|
| Add breakdown with no overall budget | Button disabled + repository throws as backstop |
| Breakdown exceeds remaining allocation | Inline dialog error; repository throw |
| Lowering overall budget below Σ breakdowns | Error surfaced in BudgetDialog (catch → toast with repository message) |
| Category deleted | Breakdown row removed atomically |
| Category renamed | Nothing needed (id-keyed) |
| CSV import / export | Unchanged; budgets not included in backups (out of scope) |

## Testing plan (Vitest, per repo convention — happy path + rejection + edge case)

- **tests/repository.test.ts** (extend): `setCategoryBudget` creates then updates preserving `createdAt`; rejection when no overall budget; over-allocation rejection with exactly-equal allowed; `setBudget` rejects going below allocation, allows equal; `deleteCategory` cascades the breakdown row; `deleteCategoryBudget` removes only its row.
- **tests/budget.test.ts** (extend): `budgetTierMessage` labeled vs unlabeled; existing boundary tests keep passing.
- **tests/spending.test.ts** (new): `buildSpendingSlices` mapping/sorting, fill fallback cycling, zero-total guard.
- **tests/categoryBudgetView.test.ts** (new, Dexie-mocked like budgetView test): rows render with tier colors/text; empty state; add disabled without overall budget; validation rejection path.
- Transaction-form category-toast behavior covered alongside existing budget-toast tests where they live.

## Verification

```bash
npm run build   # TypeScript + production build
npm run lint    # must be clean
npm test        # full Vitest suite
```

## Conventions

- AI-CONTEXT-NOTE headers added/updated on every touched code file (except `components/ui/*` boilerplate).
- Semantic tokens only: teal `--primary` positive, `--destructive` negative; amber tier colors follow the existing spec-approved exception.
- Base UI Select `value`/`onValueChange` coerced through `?? ""` / `?? null`.
- Never write inside `useLiveQuery` callbacks.

## Out of scope

- Budgets in CSV/JSON backup export-import.
- Per-month (historical) budgets — budgets always describe the current calendar month.
- Income-category budgets; pie chart for income.
- Editing a breakdown's category after creation (delete + re-add instead).
