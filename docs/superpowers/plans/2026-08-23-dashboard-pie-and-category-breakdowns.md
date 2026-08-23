# Dashboard Pie, Budget Indicator & Category Breakdowns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Settings nav icon, convert the dashboard spending breakdown to a shadcn/Recharts donut with an all-categories legend, add a month-to-date budget indicator to that card, and add validated category budget breakdowns with the full tier-warning system on the Budget page.

**Architecture:** Local-first Dexie storage — category budgets are namespaced rows (`id: "cat:<categoryId>"`) in the existing `budgets` table (no migration). All validation lives in `lib/db/repository.ts`; views consume read-only `useLiveQuery` hooks; tier visuals are shared maps; the donut is shadcn Chart (Recharts v3) fed by a pure slice-builder.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui base-maia (Base UI + Tabler), Dexie + dexie-react-hooks, React Hook Form + Zod v3, Recharts v3, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-08-23-dashboard-pie-and-category-breakdowns-design.md`

## Global Constraints

- Node ≥ 20.9 required. Run `node -v` before any npm command.
- Run one suite fast: `npm test -- tests/<file>.test.ts`.
- Every touched code file (except `components/ui/*` boilerplate) keeps its single-line `AI-CONTEXT-NOTE` JSON header — update `R`/`A`/`E` when purpose/deps/checks change; never delete an existing note. CLI-generated `components/ui/chart.tsx` is exempt.
- No Dexie version bump; the `budgets` row shape `{ id, amount, createdAt, updatedAt }` never changes.
- Semantic tokens only: teal `--primary`, `--destructive`, `amber-*` tiers (spec-approved exception).
- Tabler icons (`@tabler/icons-react`) for new UI icons.
- Base UI Select: coerce `value`/`onValueChange` with `?? ""`.
- Never write (rw) inside a `useLiveQuery` callback.
- Commit style matches history: `feat: …`, `fix: …`, `test: …`.
- After `npm run build`, `scripts/stamp-version.mjs` dirties `public/sw.js`, `public/manifest.webmanifest`, `lib/version.ts` — leave those unstaged (they ship with releases).

---

### Task 1: Settings icon swap

**Files:**
- Modify: `components/shared/BottomNav.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: Settings tab renders `IconSettings` instead of lucide `ChartPie`.

- [ ] **Step 1: Swap the icon**

In `components/shared/BottomNav.tsx` change the icon imports to:

```tsx
import { Home, List } from "lucide-react";
import { IconPigMoney, IconSettings } from "@tabler/icons-react";
```

and in `items`:

```tsx
  { href: "/settings", label: "Settings", icon: IconSettings },
```

Update the file's AI-CONTEXT-NOTE icon mention accordingly.

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build && npm test -- tests/budgetView.test.ts`
Expected: lint clean, build passes, suite green (BottomNav renders inside that test).

- [ ] **Step 3: Commit**

```bash
git add components/shared/BottomNav.tsx
git commit -m "fix: replace pie-chart icon with gear for Settings nav item"
```

---

### Task 2: Data layer — category budget rows + guards

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/repository.ts`
- Test: `tests/repository.test.ts` (extend)

**Interfaces:**
- Consumes: existing `db.budgets`, `OVERALL_BUDGET_ID`, `setBudget`, `deleteCategory`, `monthRange`, `formatPeso`.
- Produces (used by Tasks 4–6):

```ts
// lib/db/schema.ts
export const CATEGORY_BUDGET_PREFIX = "cat:";
export function categoryBudgetId(categoryId: string): string;
export function parseCategoryBudgetId(id: string): string | null;

// lib/db/repository.ts
export async function getCategoryBudgets(): Promise<Budget[]>;
export async function setCategoryBudget(categoryId: string, amount: number): Promise<void>;
export async function deleteCategoryBudget(categoryId: string): Promise<void>;
export async function getMonthlySpentByCategory(): Promise<Record<string, number>>;
// setBudget now throws if amount < Σ(category budgets); deleteCategory cascades its breakdown row
```

Error message fragments (assert with regex): `"Set a monthly budget first"`, `"left unallocated"`, `"already allocated"`.

- [ ] **Step 1: Write failing tests**

Extend the existing import from `@/lib/db/repository` in `tests/repository.test.ts` with `getCategoryBudgets`, `setCategoryBudget`, `deleteCategoryBudget`, `getMonthlySpentByCategory`; add `import { categoryBudgetId, parseCategoryBudgetId } from "@/lib/db/schema";` and `import { monthRange } from "@/lib/format";`. Append:

```ts
describe("category budget id helpers", () => {
  it("round-trips a category id", () => {
    const id = categoryBudgetId("abc123");
    expect(id).toBe("cat:abc123");
    expect(parseCategoryBudgetId(id)).toBe("abc123");
  });

  it("returns null for non-category rows", () => {
    expect(parseCategoryBudgetId("overall")).toBeNull();
  });
});

describe("setCategoryBudget", () => {
  it("creates then updates preserving createdAt", async () => {
    await setBudget(10000);
    await setCategoryBudget("catA", 3000);
    let rows = await getCategoryBudgets();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("cat:catA");
    expect(rows[0].amount).toBe(3000);
    const created = rows[0].createdAt;
    await setCategoryBudget("catA", 4500);
    rows = await getCategoryBudgets();
    expect(rows[0].amount).toBe(4500);
    expect(rows[0].createdAt).toBe(created);
  });

  it("rejects when no overall budget exists", async () => {
    await expect(setCategoryBudget("catA", 3000)).rejects.toThrow(
      "Set a monthly budget first"
    );
  });

  it("rejects over-allocation but allows exactly-equal totals", async () => {
    await setBudget(10000);
    await setCategoryBudget("a", 6000);
    await expect(setCategoryBudget("b", 5000)).rejects.toThrow(
      /left unallocated/
    );
    await setCategoryBudget("b", 4000);
    expect(await getCategoryBudgets()).toHaveLength(2);
  });

  it("editing a row does not double-count itself against the cap", async () => {
    await setBudget(10000);
    await setCategoryBudget("a", 6000);
    await setCategoryBudget("a", 9000);
    expect((await getCategoryBudgets())[0].amount).toBe(9000);
  });
});

describe("setBudget allocation guard", () => {
  it("rejects lowering below allocated total, allows equal", async () => {
    await setBudget(10000);
    await setCategoryBudget("a", 7000);
    await expect(setBudget(5000)).rejects.toThrow(/already allocated/);
    await setBudget(7000);
    expect((await getBudget())!.amount).toBe(7000);
  });
});

describe("deleteCategoryBudget", () => {
  it("removes only its own row", async () => {
    await setBudget(10000);
    await setCategoryBudget("a", 1000);
    await setCategoryBudget("b", 2000);
    await deleteCategoryBudget("a");
    const rows = await getCategoryBudgets();
    expect(rows.map((r) => r.id)).toEqual(["cat:b"]);
  });
});

describe("deleteCategory cascade", () => {
  it("deletes the category's breakdown row atomically", async () => {
    await setBudget(10000);
    const cat = await addCategory({ name: "Food", type: "expense" });
    await setCategoryBudget(cat.id, 2500);
    await deleteCategory(cat.id);
    expect(await getCategoryBudgets()).toHaveLength(0);
  });
});

describe("getMonthlySpentByCategory", () => {
  it("sums current-month expenses per category name", async () => {
    const { start } = monthRange();
    await addTransaction({ type: "expense", amount: 200, category: "Food", description: null, date: start });
    await addTransaction({ type: "expense", amount: 100, category: "Food", description: null, date: start });
    await addTransaction({ type: "expense", amount: 50, category: "Transport", description: null, date: start });
    await addTransaction({ type: "income", amount: 999, category: "Salary", description: null, date: start });
    const spent = await getMonthlySpentByCategory();
    expect(spent["Food"]).toBe(300);
    expect(spent["Transport"]).toBe(50);
    expect(spent["Salary"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/repository.test.ts`
Expected: FAIL — `categoryBudgetId` not exported / functions missing.

- [ ] **Step 3: Implement schema helpers**

In `lib/db/schema.ts`, below `OVERALL_BUDGET_ID`:

```ts
export const CATEGORY_BUDGET_PREFIX = "cat:";

export function categoryBudgetId(categoryId: string): string {
  return `${CATEGORY_BUDGET_PREFIX}${categoryId}`;
}

export function parseCategoryBudgetId(id: string): string | null {
  return id.startsWith(CATEGORY_BUDGET_PREFIX)
    ? id.slice(CATEGORY_BUDGET_PREFIX.length)
    : null;
}
```

Update the AI-CONTEXT-NOTE (`R` mentions namespaced category-budget rows; `A` gains repository consumers).

- [ ] **Step 4: Implement repository ops**

In `lib/db/repository.ts`: extend the format import to `import { monthRange, formatPeso } from "@/lib/format";`, extend the schema import with `CATEGORY_BUDGET_PREFIX` and `categoryBudgetId`, then add/modify:

```ts
export async function getCategoryBudgets(): Promise<Budget[]> {
  const rows = await db.budgets.toArray();
  return rows.filter((r) => r.id.startsWith(CATEGORY_BUDGET_PREFIX));
}

export async function setCategoryBudget(
  categoryId: string,
  amount: number
): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.budgets, async () => {
    const overall = await db.budgets.get(OVERALL_BUDGET_ID);
    if (!overall) throw new Error("Set a monthly budget first");
    const rows = await db.budgets.toArray();
    const otherTotal = rows
      .filter(
        (r) =>
          r.id.startsWith(CATEGORY_BUDGET_PREFIX) &&
          r.id !== categoryBudgetId(categoryId)
      )
      .reduce((sum, r) => sum + r.amount, 0);
    if (otherTotal + amount > overall.amount) {
      throw new Error(
        `Exceeds the monthly budget — only ${formatPeso(overall.amount - otherTotal)} left unallocated`
      );
    }
    const id = categoryBudgetId(categoryId);
    const existing = await db.budgets.get(id);
    await db.budgets.put({
      id,
      amount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  });
}

export async function deleteCategoryBudget(categoryId: string): Promise<void> {
  await db.budgets.delete(categoryBudgetId(categoryId));
}

export async function deleteCategory(id: string): Promise<void> {
  await db.transaction(
    "rw",
    db.transactions,
    db.categories,
    db.budgets,
    async () => {
      await db.categories.delete(id);
      await db.budgets.delete(categoryBudgetId(id));
    }
  );
}

export async function setBudget(amount: number): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.budgets, async () => {
    const rows = await db.budgets.toArray();
    const allocated = rows
      .filter((r) => r.id.startsWith(CATEGORY_BUDGET_PREFIX))
      .reduce((sum, r) => sum + r.amount, 0);
    if (allocated > amount) {
      throw new Error(
        `Reduce category budgets first — ${formatPeso(allocated)} is already allocated`
      );
    }
    const existing = await db.budgets.get(OVERALL_BUDGET_ID);
    await db.budgets.put({
      id: OVERALL_BUDGET_ID,
      amount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  });
}

export async function getMonthlySpentByCategory(): Promise<Record<string, number>> {
  const { start, end } = monthRange();
  const rows = await db.transactions
    .where("date")
    .between(start, end, true, true)
    .toArray();
  const spent: Record<string, number> = {};
  for (const t of rows) {
    if (t.type === "expense")
      spent[t.category] = (spent[t.category] ?? 0) + t.amount;
  }
  return spent;
}
```

(The existing `deleteCategory` body is fully replaced.)

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- tests/repository.test.ts`
Expected: PASS (all prior tests included).

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/repository.ts tests/repository.test.ts
git commit -m "feat: category budget rows in budgets table with allocation guards and cascades"
```

---

### Task 3: Shared tier styles + labeled warning messages

**Files:**
- Create: `components/budget/tierStyles.ts`
- Modify: `lib/budget.ts`
- Modify: `components/budget/BudgetView.tsx` (consume shared maps, behavior identical)
- Test: `tests/budget.test.ts` (extend)

**Interfaces:**
- Consumes: `BudgetTier`, `WarningTier`, `BUDGET_TIER_MESSAGES`, `BUDGET_THRESHOLDS` from `lib/budget.ts`.
- Produces (used by Tasks 4–6):

```ts
// lib/budget.ts
export function budgetTierMessage(tier: WarningTier, label?: string): string;

// components/budget/tierStyles.ts
export const BAR_COLOR: Record<BudgetTier, string>;
export const HINT_COLOR: Record<BudgetTier, string>;
export const HINT_TEXT: Record<BudgetTier, string>;
```

- [ ] **Step 1: Write failing tests**

Extend `tests/budget.test.ts` (add `budgetTierMessage` to the existing `@/lib/budget` import):

```ts
describe("budgetTierMessage", () => {
  it("uses generic monthly copy without a label", () => {
    expect(budgetTierMessage("warn50")).toBe("You've used 50% of your monthly budget");
    expect(budgetTierMessage("warn90")).toBe("You've used 90% of your monthly budget");
    expect(budgetTierMessage("over")).toBe("You've exceeded your monthly budget");
  });

  it("interpolates the category label", () => {
    expect(budgetTierMessage("warn50", "Food")).toBe("You've used 50% of your Food budget");
    expect(budgetTierMessage("warn75", "Transport")).toBe("You've used 75% of your Transport budget");
    expect(budgetTierMessage("over", "Food")).toBe("You've exceeded your Food budget");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/budget.test.ts`
Expected: FAIL — `budgetTierMessage` is not exported.

- [ ] **Step 3: Implement**

Append to `lib/budget.ts`:

```ts
export function budgetTierMessage(tier: WarningTier, label?: string): string {
  if (!label) return BUDGET_TIER_MESSAGES[tier];
  return tier === "over"
    ? `You've exceeded your ${label} budget`
    : `You've used ${BUDGET_THRESHOLDS.find((t) => t.tier === tier)!.threshold}% of your ${label} budget`;
}
```

Create `components/budget/tierStyles.ts` with an AI-CONTEXT-NOTE header describing it as the shared tier visual maps extracted from BudgetView:

```ts
import type { BudgetTier } from "@/lib/budget";

export const BAR_COLOR: Record<BudgetTier, string> = {
  ok: "bg-primary",
  warn50: "bg-primary",
  warn75: "bg-amber-500",
  warn90: "bg-destructive",
  over: "bg-destructive",
};

export const HINT_COLOR: Record<BudgetTier, string> = {
  ok: "text-muted-foreground",
  warn50: "text-muted-foreground",
  warn75: "text-amber-600 dark:text-amber-400",
  warn90: "font-medium text-destructive",
  over: "font-medium text-destructive",
};

export const HINT_TEXT: Record<BudgetTier, string> = {
  ok: "",
  warn50: "Halfway there — watch your spending.",
  warn75: "Getting close to your limit.",
  warn90: "Almost at your limit!",
  over: "You're over budget this month.",
};
```

In `components/budget/BudgetView.tsx`: delete the three local maps and add:

```tsx
import { BAR_COLOR, HINT_COLOR, HINT_TEXT } from "@/components/budget/tierStyles";
```

Update both files' AI-CONTEXT-NOTEs (`A`/`AB` cross-references).

- [ ] **Step 4: Verify**

Run: `npm test -- tests/budget.test.ts && npm test -- tests/budgetView.test.ts && npm run lint`
Expected: PASS, lint clean (view behavior unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/budget.ts components/budget/tierStyles.ts components/budget/BudgetView.tsx tests/budget.test.ts
git commit -m "feat: shared budget tier styles and labeled threshold messages"
```

---

### Task 4: shadcn Chart, slice builder, donut + indicator on dashboard

**Files:**
- Install: recharts + `components/ui/chart.tsx` via CLI
- Create: `lib/spending.ts`
- Create: `components/dashboard/SpendingDonut.tsx`
- Modify: `components/dashboard/DashboardView.tsx`
- Test: `tests/spending.test.ts` (new)

**Interfaces:**
- Consumes: `useBudget`, `useMonthlySpent` (existing); `BAR_COLOR` (Task 3); `budgetTier` (existing); shadcn `ChartContainer` + recharts `PieChart`/`Pie`; `Progress` with `indicatorClassName`.
- Produces:

```ts
// lib/spending.ts
export interface SpendingSlice { name: string; value: number; fill: string; }
export function buildSpendingSlices(entries: Array<[string, number]>, categories: Category[]): SpendingSlice[];
export function slicePercent(value: number, total: number): number;

// components/dashboard/SpendingDonut.tsx
export function SpendingDonut({ slices, total }: { slices: SpendingSlice[]; total: number });
```

- [ ] **Step 1: Install the chart primitive**

Run: `node -v` (must be ≥ 20.9), then `npx shadcn@latest add chart -y`
Expected: `components/ui/chart.tsx` created; `recharts` ^3 in package.json (`npm ls recharts` confirms). Do not hand-edit `components/ui/chart.tsx`.

- [ ] **Step 2: Write failing slice-builder tests**

Create `tests/spending.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSpendingSlices, slicePercent } from "@/lib/spending";
import type { Category } from "@/lib/db/schema";

const cats: Category[] = [
  { id: "1", name: "Food", type: "expense", icon: null, color: "#ff0000" },
  { id: "2", name: "Transport", type: "expense", icon: null, color: null },
];

describe("buildSpendingSlices", () => {
  it("sorts high to low and passes stored colors through", () => {
    const slices = buildSpendingSlices([["Transport", 100], ["Food", 300]], cats);
    expect(slices.map((s) => s.name)).toEqual(["Food", "Transport"]);
    expect(slices[0].fill).toBe("#ff0000");
  });

  it("cycles chart tokens for missing colors", () => {
    const slices = buildSpendingSlices(
      [["Transport", 100], ["Other", 50], ["More", 25], ["Extra", 10], ["Yet", 5], ["Sixth", 1]],
      cats
    );
    expect(slices[1].fill).toBe("var(--chart-2)");
    expect(slices[5].fill).toBe("var(--chart-1)");
  });

  it("returns [] for zero totals and empty input", () => {
    expect(buildSpendingSlices([["Food", 0]], cats)).toEqual([]);
    expect(buildSpendingSlices([], cats)).toEqual([]);
  });
});

describe("slicePercent", () => {
  it("rounds share of total and guards zero", () => {
    expect(slicePercent(25, 100)).toBe(25);
    expect(slicePercent(1, 3)).toBe(33);
    expect(slicePercent(5, 0)).toBe(0);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- tests/spending.test.ts`
Expected: FAIL — module `@/lib/spending` not found.

- [ ] **Step 4: Implement `lib/spending.ts`**

```ts
import type { Category } from "@/lib/db/schema";

export interface SpendingSlice {
  name: string;
  value: number;
  fill: string;
}

const FALLBACK_TOKENS = 5;

export function buildSpendingSlices(
  entries: Array<[string, number]>,
  categories: Category[]
): SpendingSlice[] {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return [];
  return sorted.map(([name, value], i) => {
    const cat = categories.find((c) => c.name === name);
    return {
      name,
      value,
      fill: cat?.color ?? `var(--chart-${(i % FALLBACK_TOKENS) + 1})`,
    };
  });
}

export function slicePercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- tests/spending.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `components/dashboard/SpendingDonut.tsx`**

Header note (single line): R = donut rendering via ChartContainer + Recharts PieChart with centered total; IDD = fills precomputed per data row, aspect-square keeps ResponsiveContainer measurable; A = !!! DashboardView sole consumer; AB = ui/chart.tsx, recharts v3, globals.css tokens; E = build/lint, single-slice ring, overlay alignment. Then:

```tsx
"use client";

import { Pie, PieChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatPeso } from "@/lib/format";
import type { SpendingSlice } from "@/lib/spending";

interface Props {
  slices: SpendingSlice[];
  total: number;
}

export function SpendingDonut({ slices, total }: Props) {
  const config = Object.fromEntries(
    slices.map((s) => [s.name, { label: s.name, color: s.fill }])
  ) satisfies ChartConfig;

  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <ChartContainer config={config} className="aspect-square max-h-[240px] w-full">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            strokeWidth={2}
            stroke="var(--background)"
          />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-sm font-semibold">{formatPeso(total)}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Wire the dashboard card**

In `components/dashboard/DashboardView.tsx` add imports:

```tsx
import { useBudget, useMonthlySpent } from "@/lib/hooks/useBudget";
import { budgetTier } from "@/lib/budget";
import { BAR_COLOR } from "@/components/budget/tierStyles";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { buildSpendingSlices, slicePercent } from "@/lib/spending";
import { Progress } from "@/components/ui/progress";
```

Inside the component, after `totalSpent`, add:

```tsx
const budget = useBudget();
const monthlySpent = useMonthlySpent();
const slices = buildSpendingSlices([...expenseByCategory.entries()], categories);
const legend = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]);
```

Delete the old `breakdown` array and `maxExpense` computation.

Replace the Spending by Category `CardContent` contents with:

```tsx
{budget && monthlySpent !== undefined ? (
  (() => {
    const { pct, tier } = budgetTier(monthlySpent, budget.amount);
    return (
      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Monthly budget</span>
          <span className="tabular-nums">
            {formatPeso(monthlySpent)} of {formatPeso(budget.amount)} · {Math.round(pct)}% used
          </span>
        </div>
        <Progress value={Math.min(pct, 100)} indicatorClassName={BAR_COLOR[tier]} />
      </div>
    );
  })()
) : null}
{slices.length === 0 ? (
  <p className="py-6 text-center text-sm text-muted-foreground">No expenses in this period.</p>
) : (
  <>
    <SpendingDonut slices={slices} total={totalSpent} />
    <div className="mt-4 space-y-2">
      {legend.map(([name, amount]) => {
        const cat = categories.find((c) => c.name === name);
        return (
          <div key={name} className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-1 font-medium">
              <CategoryIcon name={cat?.icon ?? null} className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{name}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatPeso(amount)} · {slicePercent(amount, totalSpent)}%
            </span>
          </div>
        );
      })}
    </div>
  </>
)}
```

Update the AI-CONTEXT-NOTE (`R` mentions donut + indicator; drop stale bar-width wording).

- [ ] **Step 8: Verify**

Run: `npm run build && npm run lint && npm test`
Expected: clean/green. Manual smoke via `npm run dev`: donut + legend on `/`, center total, indicator between Total row and chart when a budget exists; RangeFilter reslices but the indicator stays month-to-date.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json components/ui/chart.tsx lib/spending.ts components/dashboard/SpendingDonut.tsx components/dashboard/DashboardView.tsx tests/spending.test.ts
git commit -m "feat: dashboard spending donut via shadcn chart with all-category legend and monthly budget meter"
```

---

### Task 5: Breakdown UI on /budget (hooks, dialog, rows)

**Files:**
- Modify: `lib/hooks/useBudget.ts`
- Modify: `lib/validations/budget.ts`
- Create: `components/budget/CategoryBudgetDialog.tsx`
- Modify: `components/budget/BudgetView.tsx`
- Test: `tests/budget.test.ts` (schema cases), `tests/categoryBudgetView.test.ts` (new)

**Interfaces:**
- Consumes: Task 2 repository fns + `parseCategoryBudgetId`; Task 3 tier maps; `useCategories` from `@/lib/hooks/useTransactions`; `budgetTier`; `CategoryIcon`; `deleteCategoryBudget`.
- Produces:

```ts
// lib/hooks/useBudget.ts
export function useCategoryBudgets(): Budget[] | undefined;
export function useMonthlySpentByCategory(): Record<string, number> | undefined;

// lib/validations/budget.ts
export const categoryBudgetSchema; // { categoryId: string min(1), amount: coerce positive }
export type CategoryBudgetInput = z.infer<typeof categoryBudgetSchema>;
```

- [ ] **Step 1: Write failing tests**

Extend `tests/budget.test.ts` (add `categoryBudgetSchema` import):

```ts
describe("categoryBudgetSchema", () => {
  it("accepts a category pick with a positive amount", () => {
    expect(
      categoryBudgetSchema.safeParse({ categoryId: "c1", amount: 1500 }).success
    ).toBe(true);
    expect(categoryBudgetSchema.safeParse({ categoryId: "c1", amount: "1500" }).success).toBe(true);
  });

  it("rejects blank category and non-positive amounts", () => {
    expect(categoryBudgetSchema.safeParse({ categoryId: "", amount: 0 }).success).toBe(false);
    expect(categoryBudgetSchema.safeParse({ categoryId: "c1", amount: NaN }).success).toBe(false);
    expect(categoryBudgetSchema.safeParse({ categoryId: "c1", amount: "" }).success).toBe(false);
  });
});
```

Create `tests/categoryBudgetView.test.ts` (same Dexie-mock pattern as budgetView.test.ts, with a richer mock):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  budgetRow: null as unknown,
  budgetList: [] as unknown[],
  transactions: [] as Array<Record<string, unknown>>,
}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    budgets: {
      get: vi.fn(async () => state.budgetRow),
      toArray: vi.fn(async () => state.budgetList),
    },
    categories: {
      toArray: vi.fn(async () => [
        { id: "c1", name: "Food", type: "expense", icon: null, color: null },
      ]),
    },
    transactions: {
      where: vi.fn(() => ({
        between: vi.fn(() => ({
          toArray: vi.fn(async () => state.transactions),
        })),
      })),
    },
  },
}));

vi.mock("@/lib/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/schema")>();
  return { ...actual, db: mockDb };
});

vi.mock("dexie-react-hooks", async () => {
  const { useState, useEffect } = await import("react");
  return {
    useLiveQuery: (fn: () => Promise<unknown>) => {
      const [value, setValue] = useState<unknown>(undefined);
      useEffect(() => {
        let alive = true;
        fn().then((result) => {
          if (alive) setValue(result);
        });
        return () => {
          alive = false;
        };
      });
      return value;
    },
  };
});

import { BudgetView } from "@/components/budget/BudgetView";

beforeEach(() => {
  state.budgetRow = null;
  state.budgetList = [];
  state.transactions = [];
});

describe("BudgetView breakdown", () => {
  it("disables Add breakdown until an overall budget exists", async () => {
    render(createElement(BudgetView));
    expect(await screen.findByText("No budget yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeDisabled();
    expect(screen.getByText("Set a monthly budget first")).toBeInTheDocument();
  });

  it("renders a breakdown row with spent-vs-allotted and tier hint", async () => {
    state.budgetRow = { id: "overall", amount: 10000, createdAt: 1, updatedAt: 1 };
    state.budgetList = [
      { id: "overall", amount: 10000, createdAt: 1, updatedAt: 1 },
      { id: "cat:c1", amount: 8000, createdAt: 1, updatedAt: 1 },
    ];
    state.transactions = [
      { type: "expense", amount: 4000, category: "Food", date: new Date().toISOString().slice(0, 10) },
    ];
    render(createElement(BudgetView));
    expect(await screen.findByText("Food")).toBeInTheDocument();
    expect(screen.getByText(/of ₱8,000/)).toBeInTheDocument();
    expect(screen.getByText("Halfway there — watch your spending.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/budget.test.ts && npm test -- tests/categoryBudgetView.test.ts`
Expected: FAIL — `categoryBudgetSchema` not exported; view has no breakdown section.

- [ ] **Step 3: Implement schema + hooks**

Append to `lib/validations/budget.ts`:

```ts
export const categoryBudgetSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be greater than 0" })
    .positive("Amount must be greater than 0"),
});

export type CategoryBudgetInput = z.infer<typeof categoryBudgetSchema>;
```

Add to `lib/hooks/useBudget.ts` (extend the schema import with `CATEGORY_BUDGET_PREFIX`):

```ts
export function useCategoryBudgets(): Budget[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.budgets.toArray();
    return rows.filter((r) => r.id.startsWith(CATEGORY_BUDGET_PREFIX));
  }, []);
}

export function useMonthlySpentByCategory(): Record<string, number> | undefined {
  return useLiveQuery(async () => {
    const { start, end } = monthRange();
    const rows = await db.transactions
      .where("date")
      .between(start, end, true, true)
      .toArray();
    const spent: Record<string, number> = {};
    for (const t of rows) {
      if (t.type === "expense")
        spent[t.category] = (spent[t.category] ?? 0) + t.amount;
    }
    return spent;
  }, []);
}
```

- [ ] **Step 4: Create `components/budget/CategoryBudgetDialog.tsx`**

AI-CONTEXT-NOTE: R = dialog to add/edit one category breakdown with repository allocation errors shown inline; IDD = editing locks the Select, form.reset on open, root-level error never a toast; A = !! BudgetView opens it; AB = validations/budget.ts, repository.setCategoryBudget, ui/dialog+select (`?? ""` coercion); E = build/lint, over-allocation inline message, success toast+close. Body:

```tsx
"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  categoryBudgetSchema,
  type CategoryBudgetInput,
} from "@/lib/validations/budget";
import { setCategoryBudget } from "@/lib/db/repository";
import type { Category } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing?: { categoryId: string; name: string } | null;
}

export function CategoryBudgetDialog({ open, onOpenChange, categories, editing }: Props) {
  const form = useForm<CategoryBudgetInput>({
    resolver: zodResolver(categoryBudgetSchema),
    defaultValues: {
      categoryId: editing?.categoryId ?? "",
      amount: undefined as unknown as number,
    },
  });

  useEffect(() => {
    if (open)
      form.reset({
        categoryId: editing?.categoryId ?? "",
        amount: undefined as unknown as number,
      });
  }, [open, editing, form]);

  const watchCategory = useWatch({ control: form.control, name: "categoryId" }) ?? "";

  const onSubmit = async (data: CategoryBudgetInput) => {
    try {
      await setCategoryBudget(data.categoryId, data.amount);
      toast.success("Category budget saved");
      onOpenChange(false);
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Could not save",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit breakdown" : "Add breakdown"}</DialogTitle>
          <DialogDescription>
            Monthly limit for one category. Breakdowns cannot exceed your overall
            budget.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cb-category">Category</Label>
            <Select
              value={watchCategory}
              disabled={Boolean(editing)}
              onValueChange={(v) => form.setValue("categoryId", v ?? "")}
            >
              <SelectTrigger id="cb-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cb-amount">Amount (₱)</Label>
            <Input
              id="cb-amount"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            ) : null}
          </div>
          {form.formState.errors.root ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Wire the Breakdown section into `BudgetView`**

Add imports to `components/budget/BudgetView.tsx`:

```tsx
import { useCategories } from "@/lib/hooks/useTransactions";
import { parseCategoryBudgetId, type Category } from "@/lib/db/schema";
import { deleteCategoryBudget } from "@/lib/db/repository";
import { toast } from "sonner";
import {
  useBudget,
  useMonthlySpent,
  useCategoryBudgets,
  useMonthlySpentByCategory,
} from "@/lib/hooks/useBudget";
import { CategoryBudgetDialog } from "@/components/budget/CategoryBudgetDialog";
import { CardHeader, CardTitle } from "@/components/ui/card";
```

Extend the existing hook imports line instead of duplicating `useBudget`/`useMonthlySpent`. Inside the component add:

```tsx
const catBudgets = useCategoryBudgets() ?? [];
const spentByCat = useMonthlySpentByCategory() ?? {};
const allCategories = useCategories() ?? [];
const [dialogOpen, setDialogOpen] = useState(false);
const [editing, setEditing] = useState<{ categoryId: string; name: string } | null>(null);

const unallocated = allCategories.filter(
  (c) => c.type === "expense" && !catBudgets.some((b) => parseCategoryBudgetId(b.id) === c.id)
);

const remove = async (cat: Category) => {
  try {
    await deleteCategoryBudget(cat.id);
    toast.success(`${cat.name} budget removed`);
  } catch {
    toast.error("Could not remove the category budget");
  }
};
```

Below the existing budget `</Card>` insert:

```tsx
<Card>
  <CardHeader className="flex-row items-center justify-between space-y-0">
    <CardTitle className="text-sm">Breakdown</CardTitle>
    <Button
      size="sm"
      variant="outline"
      disabled={!budget || loading}
      onClick={() => {
        setEditing(null);
        setDialogOpen(true);
      }}
    >
      Add breakdown
    </Button>
  </CardHeader>
  <CardContent>
    {!budget ? (
      <p className="text-xs text-muted-foreground">Set a monthly budget first</p>
    ) : catBudgets.length === 0 ? (
      <p className="py-4 text-center text-xs text-muted-foreground">
        Split your budget across categories, e.g. Food ₱3,000 of ₱10,000.
      </p>
    ) : (
      <div className="space-y-3">
        {catBudgets.map((b) => {
          const cid = parseCategoryBudgetId(b.id)!;
          const cat = allCategories.find((c) => c.id === cid);
          if (!cat) return null;
          const spent = spentByCat[cat.name] ?? 0;
          const { pct, tier } = budgetTier(spent, b.amount);
          return (
            <div key={b.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  <CategoryIcon name={cat.icon} className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums">
                  {formatPeso(spent)} of {formatPeso(b.amount)}
                </span>
              </div>
              <Progress value={Math.min(pct, 100)} indicatorClassName={BAR_COLOR[tier]} />
              <div className="flex items-center justify-between gap-2">
                {HINT_TEXT[tier] ? (
                  <p className={cn("text-xs", HINT_COLOR[tier])}>{HINT_TEXT[tier]}</p>
                ) : (
                  <span />
                )}
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing({ categoryId: cid, name: cat.name });
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => remove(cat)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </CardContent>
</Card>
```

Next to the existing `<BudgetDialog />` mount add:

```tsx
<CategoryBudgetDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  categories={unallocated}
  editing={editing}
/>
```

(In edit mode the Select is disabled and shows via `watchCategory`, so passing only unallocated categories is fine.)

Update BudgetView's AI-CONTEXT-NOTE (R covers breakdowns; E adds the new suite).

- [ ] **Step 6: Run to verify pass**

Run: `npm test -- tests/budget.test.ts && npm test -- tests/categoryBudgetView.test.ts && npm test -- tests/budgetView.test.ts && npm run lint`
Expected: PASS everywhere. If the `of ₱8,000` assertion fails on decimal formatting, widen to `/of ₱8,000(\.00)?/`.

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useBudget.ts lib/validations/budget.ts components/budget/CategoryBudgetDialog.tsx components/budget/BudgetView.tsx tests/budget.test.ts tests/categoryBudgetView.test.ts
git commit -m "feat: category budget breakdowns with tier warnings and allocation-capped dialog"
```

---

### Task 6: Expense-save category toast wiring

**Files:**
- Modify: `components/transactions/TransactionForm.tsx`
- Test: `tests/transactionFormToast.test.ts` (new)

**Interfaces:**
- Consumes: `getCategoryBudgets`, `getMonthlySpentByCategory`, `categoryBudgetId` (Task 2); `budgetTierMessage` (Task 3); existing `crossedTier`, `getBudget`, `getMonthlySpent`, `useCategories`.
- Produces: saving a current-month expense whose category has a breakdown fires `toast.warning(budgetTierMessage(tier, categoryName))` after the overall toast; warning failures stay best-effort.

- [ ] **Step 1: Write failing test**

Create `tests/transactionFormToast.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  getBudget: vi.fn(),
  getMonthlySpent: vi.fn(),
  getCategoryBudgets: vi.fn(),
  getMonthlySpentByCategory: vi.fn(),
  addTransaction: vi.fn(async () => ({})),
  updateTransaction: vi.fn(async () => {}),
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

vi.mock("@/lib/hooks/useTransactions", () => ({
  useCategories: () => [
    { id: "c1", name: "Food", type: "expense", icon: null, color: null },
    { id: "c2", name: "Salary", type: "income", icon: null, color: null },
  ],
}));

vi.mock("@/lib/db/repository", () => ({
  addTransaction: mocks.addTransaction,
  updateTransaction: mocks.updateTransaction,
  getBudget: mocks.getBudget,
  getMonthlySpent: mocks.getMonthlySpent,
  getCategoryBudgets: mocks.getCategoryBudgets,
  getMonthlySpentByCategory: mocks.getMonthlySpentByCategory,
}));

import { TransactionForm } from "@/components/transactions/TransactionForm";

beforeEach(() => {
  Object.values(mocks.toast).forEach((fn) => fn.mockReset());
  [mocks.getBudget, mocks.getMonthlySpent, mocks.getCategoryBudgets, mocks.getMonthlySpentByCategory].forEach((fn) => fn.mockReset());
  mocks.addTransaction.mockClear();

  mocks.getBudget.mockResolvedValue({ id: "overall", amount: 1000, createdAt: 1, updatedAt: 1 });
  mocks.getCategoryBudgets.mockResolvedValue([
    { id: "cat:c1", amount: 500, createdAt: 1, updatedAt: 1 },
  ]);
  let overallPhase = 0;
  mocks.getMonthlySpent.mockImplementation(async () => (overallPhase++ === 0 ? 400 : 700));
  let catPhase = 0;
  mocks.getMonthlySpentByCategory.mockImplementation(async () =>
    catPhase++ === 0 ? { Food: 200 } : { Food: 500 }
  );
});

describe("TransactionForm budget toasts", () => {
  it("fires overall and category threshold warnings on one save", async () => {
    render(createElement(TransactionForm));

    fireEvent.change(screen.getByLabelText("Amount (₱)"), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith("Transaction added");
    });
    await waitFor(() => {
      expect(mocks.toast.warning).toHaveBeenNthCalledWith(
        1,
        "You've used 50% of your monthly budget"
      );
      expect(mocks.toast.warning).toHaveBeenNthCalledWith(
        2,
        "You've exceeded your Food budget"
      );
    });
    expect(mocks.addTransaction).toHaveBeenCalledTimes(1);
  });

  it("keeps saves successful when warning lookups reject", async () => {
    mocks.getBudget.mockRejectedValue(new Error("boom"));
    mocks.getCategoryBudgets.mockRejectedValue(new Error("boom"));

    render(createElement(TransactionForm));
    fireEvent.change(screen.getByLabelText("Amount (₱)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith("Transaction added");
    });
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(mocks.toast.warning).not.toHaveBeenCalled();
  });
});
```

Crossing math: overall 40% → 70% crosses 50 → warn50; category 40% → 100% crosses up to over.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/transactionFormToast.test.ts`
Expected: FAIL — second (category) warning never fires.

- [ ] **Step 3: Implement in TransactionForm**

In `components/transactions/TransactionForm.tsx` extend imports:

```tsx
import {
  addTransaction,
  updateTransaction,
  getBudget,
  getMonthlySpent,
  getCategoryBudgets,
  getMonthlySpentByCategory,
} from "@/lib/db/repository";
import { crossedTier, BUDGET_TIER_MESSAGES, budgetTierMessage } from "@/lib/budget";
import { categoryBudgetId } from "@/lib/db/schema";
```

In `onSubmit`, extend the pre-write snapshot block (keep existing overall logic; add category snapshot):

```tsx
let limit: number | null = null;
let spentBefore: number | null = null;
let catLimit: number | null = null;
let catSpentBefore: number | null = null;
let catLabel: string | null = null;

if (data.type === "expense") {
  const { start, end } = monthRange();
  const inCurrentMonth = data.date >= start && data.date <= end;
  if (inCurrentMonth) {
    try {
      const budget = await getBudget();
      if (budget) {
        limit = budget.amount;
        spentBefore = await getMonthlySpent();
      }
      const cat = (categories ?? []).find((c) => c.name === data.category);
      if (cat) {
        const row = (await getCategoryBudgets()).find(
          (r) => r.id === categoryBudgetId(cat.id)
        );
        if (row) {
          catLimit = row.amount;
          catSpentBefore = (await getMonthlySpentByCategory())[cat.name] ?? 0;
          catLabel = cat.name;
        }
      }
    } catch {
      limit = null;
      spentBefore = null;
      catLimit = null;
      catSpentBefore = null;
      catLabel = null;
    }
  }
}
```

After the existing overall-warning try/catch (still before `onDone?.()`), add:

```tsx
try {
  if (catLimit !== null && catSpentBefore !== null && catLabel) {
    const catSpentAfter =
      (await getMonthlySpentByCategory())[catLabel] ?? 0;
    const crossed = crossedTier(
      (catSpentBefore / catLimit) * 100,
      (catSpentAfter / catLimit) * 100
    );
    if (crossed) {
      toast.warning(budgetTierMessage(crossed, catLabel));
    }
  }
} catch {
  // Category warnings are best-effort like the overall ones.
}
```

Update the file's AI-CONTEXT-NOTE (`R` mentions per-category warnings; `E` adds the toast suite).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/transactionFormToast.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add components/transactions/TransactionForm.tsx tests/transactionFormToast.test.ts
git commit -m "feat: per-category budget threshold warnings on expense save"
```

---

### Task 7: Full verification

- [ ] **Step 1:** Run `node -v` (≥ 20.9), then `npm run build && npm run lint && npm test`
  Expected: build clean, lint clean, entire Vitest suite green.
- [ ] **Step 2:** Confirm no stamp churn is staged: `git status --short` — leave `public/sw.js`, `public/manifest.webmanifest`, `lib/version.ts` modifications unstaged if present.
- [ ] **Step 3:** Manual smoke on `npm run dev`: settings tab gear icon; dashboard donut/legend/indicator; /budget breakdown add→edit→remove flow incl. an over-allocation rejection showing the inline message.

---

## Self-Review Notes

- Spec coverage: icon (Task 1), donut + legend (Task 4), indicator (Task 4), data layer + guards (Task 2), shared tiers/messages (Task 3), breakdown UI + validation schema + hooks (Task 5), expense-save toasts (Task 6), full gate (Task 7).
- Type consistency verified across tasks: `categoryBudgetId`/`parseCategoryBudgetId`, `getCategoryBudgets(): Budget[]`, `setCategoryBudget(categoryId: string, amount: number): Promise<void>`, `budgetTierMessage(tier, label?)`, `BAR_COLOR/HINT_COLOR/HINT_TEXT`, `buildSpendingSlices/SlicePercent`, `useCategoryBudgets`, `useMonthlySpentByCategory`, `CategoryBudgetInput`.

