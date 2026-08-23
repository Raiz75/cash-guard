# Monthly Budget Page + Transactions Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monthly overall budget (own page, IndexedDB-backed, 50/75/90% toast warnings) and paginate the transactions list 10-at-a-time.

**Architecture:** All data stays local-first in Dexie/IndexedDB. A new `budgets` table (schema v2) holds one `"overall"` row; pure tier math lives in `lib/budget.ts`; live queries follow the existing `useLiveQuery` hook pattern. UI is built from new shadcn/base-maia primitives (`progress`, `pagination`) matching the preset. Spec: `docs/superpowers/specs/2026-08-23-budget-and-pagination-design.md`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui on `@base-ui/react` (base-maia), Dexie + dexie-react-hooks, React Hook Form + Zod, Sonner, Vitest + happy-dom.

## Global Constraints

- **Local-first:** every read/write goes through `lib/db/repository.ts` or a read-only `useLiveQuery`. Never write inside a `useLiveQuery` callback (`ReadonlyError`). No API routes, no server calls.
- **Node ≥ 20.9** required. On this machine system Node is 18 — prepend the user-local Node 22 install: `$env:Path = "$env:USERPROFILE\.local\node\bin;$env:Path"` before running npm commands (verify with `node -v`).
- **AI-CONTEXT-NOTE:** every NEW code file under `app/`, `components/` (except `components/ui/*`), `lib/` starts with a single-line JSON `AI-CONTEXT-NOTE` header per AGENTS.md. Files EDITED by this plan must have their existing header updated (R/A/AB/E stay accurate). Never delete an existing header.
- **Colors:** semantic tokens only — teal `primary`, `destructive` for over-budget. The single approved exception is `bg-amber-500` for the 75–89% bar tier (approved in the spec). No hardcoded `green-*`/`red-*`.
- **Icons:** Tabler (`@tabler/icons-react`) for new feature UI; lucide is acceptable only inside `components/ui/*` boilerplate (existing convention).
- **Base UI quirks:** Select `value`/`onValueChange` are `string | null` (coerce with `?? ""`). No `useEffect` + `setState` patterns that trip the `react-hooks/set-state-in-effect` lint rule.
- **Verification gates:** run `npm run lint` and `npm test` after every task; `npm run build` must pass before the final commit. Tests are Vitest: `npm test -- tests/<file>` runs one suite.
- **Commit style:** conventional commits (`feat:`, `test:`, `chore:`), one commit per task, staged files listed explicitly.

---

### Task 1: Budget tier pure logic

**Files:**
- Create: `lib/budget.ts`
- Test: `tests/budget.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `type BudgetTier = "ok" | "warn50" | "warn75" | "warn90" | "over"`; `type WarningTier = Exclude<BudgetTier, "ok">`; `BUDGET_TIER_MESSAGES: Record<WarningTier, string>`; `budgetTier(spent: number, limit: number): { pct: number; tier: BudgetTier }`; `crossedTier(beforePct: number, afterPct: number): WarningTier | null`. Tasks 6 and 8 consume these exact names.

- [ ] **Step 1: Write the failing test**

Create `tests/budget.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { budgetTier, crossedTier, BUDGET_TIER_MESSAGES } from "@/lib/budget";

describe("budgetTier", () => {
  it("returns ok below 50%", () => {
    expect(budgetTier(0, 1000)).toEqual({ pct: 0, tier: "ok" });
    expect(budgetTier(100, 1000)).toEqual({ pct: 10, tier: "ok" });
    expect(budgetTier(499.99, 1000).tier).toBe("ok");
  });

  it("returns warn50 at exactly 50% up to just under 75%", () => {
    expect(budgetTier(500, 1000).tier).toBe("warn50");
    expect(budgetTier(600, 1000).tier).toBe("warn50");
    expect(budgetTier(749.99, 1000).tier).toBe("warn50");
  });

  it("returns warn75 at exactly 75% up to just under 90%", () => {
    expect(budgetTier(750, 1000).tier).toBe("warn75");
    expect(budgetTier(899.99, 1000).tier).toBe("warn75");
  });

  it("returns warn90 at exactly 90% up to just under 100%", () => {
    expect(budgetTier(900, 1000).tier).toBe("warn90");
    expect(budgetTier(999.99, 1000).tier).toBe("warn90");
  });

  it("returns over at exactly 100% and beyond", () => {
    expect(budgetTier(1000, 1000).tier).toBe("over");
    expect(budgetTier(1500, 1000)).toEqual({ pct: 150, tier: "over" });
  });

  it("guards against zero or negative limits", () => {
    expect(budgetTier(100, 0)).toEqual({ pct: 0, tier: "ok" });
    expect(budgetTier(100, -5)).toEqual({ pct: 0, tier: "ok" });
  });
});

describe("crossedTier", () => {
  it("returns the newly crossed tier", () => {
    expect(crossedTier(40, 55)).toBe("warn50");
    expect(crossedTier(60, 80)).toBe("warn75");
    expect(crossedTier(80, 95)).toBe("warn90");
    expect(crossedTier(95, 120)).toBe("over");
  });

  it("treats landing exactly on a threshold as crossing it", () => {
    expect(crossedTier(49.9, 50)).toBe("warn50");
    expect(crossedTier(74.9, 75)).toBe("warn75");
    expect(crossedTier(89.9, 90)).toBe("warn90");
    expect(crossedTier(99.9, 100)).toBe("over");
  });

  it("returns null when nothing new is crossed", () => {
    expect(crossedTier(10, 20)).toBeNull();
    expect(crossedTier(50, 60)).toBeNull();
    expect(crossedTier(20, 20)).toBeNull();
  });

  it("returns null when spend decreases", () => {
    expect(crossedTier(80, 40)).toBeNull();
  });

  it("returns the highest tier on a multi-tier jump", () => {
    expect(crossedTier(30, 96)).toBe("warn90");
    expect(crossedTier(10, 200)).toBe("over");
  });
});

describe("BUDGET_TIER_MESSAGES", () => {
  it("has a message for every warning tier", () => {
    expect(BUDGET_TIER_MESSAGES.warn50).toContain("50%");
    expect(BUDGET_TIER_MESSAGES.warn75).toContain("75%");
    expect(BUDGET_TIER_MESSAGES.warn90).toContain("90%");
    expect(BUDGET_TIER_MESSAGES.over).toContain("exceeded");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/budget.test.ts`
Expected: FAIL — cannot resolve `@/lib/budget` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/budget.ts` (with AI-CONTEXT-NOTE header):

```ts
/* AI-CONTEXT-NOTE:{"R":"Pure monthly-budget tier math — budgetTier maps spend vs limit to ok/warn50/warn75/warn90/over, crossedTier finds the highest newly-reached threshold, BUDGET_TIER_MESSAGES holds toast copy.","IDD":[{"?":"Pure functions with no Dexie/React imports so Vitest covers boundary behavior without DOM or DB"},{"?":"Thresholds are inclusive lower bounds: 50/75/90/100 reached exactly counts as crossing"},{"?":"limit<=0 guards division by zero and reports ok"}],"A":[{"!!":"components/budget/BudgetView.tsx","bar color + hint text come from budgetTier"},{"!!":"components/transactions/TransactionForm.tsx","overspend toast uses crossedTier + BUDGET_TIER_MESSAGES"},{"?":"lib/hooks/useBudget.ts","consumers pair it with useMonthlySpent/useBudget"}],"AB":[{"?":"None — standalone pure module"}],"E":[{"!!!":"npm test -- tests/budget.test.ts","boundary cases exactly at 50/75/90/100 must pass"},{"*":"Floating-point: 900/1000*100 may exceed 90 slightly — tiers tolerate it"}]} */

export type BudgetTier = "ok" | "warn50" | "warn75" | "warn90" | "over";

export type WarningTier = Exclude<BudgetTier, "ok">;

export const BUDGET_THRESHOLDS = [
  { threshold: 50, tier: "warn50" },
  { threshold: 75, tier: "warn75" },
  { threshold: 90, tier: "warn90" },
  { threshold: 100, tier: "over" },
] as const satisfies ReadonlyArray<{ threshold: number; tier: WarningTier }>;

export const BUDGET_TIER_MESSAGES: Record<WarningTier, string> = {
  warn50: "You've used 50% of your monthly budget",
  warn75: "You've used 75% of your monthly budget",
  warn90: "You've used 90% of your monthly budget",
  over: "You've exceeded your monthly budget",
};

export function budgetTier(spent: number, limit: number): { pct: number; tier: BudgetTier } {
  if (limit <= 0) return { pct: 0, tier: "ok" };
  const pct = (spent / limit) * 100;
  let tier: BudgetTier = "ok";
  for (const { threshold, tier: next } of BUDGET_THRESHOLDS) {
    if (pct >= threshold) tier = next;
  }
  return { pct, tier };
}

export function crossedTier(beforePct: number, afterPct: number): WarningTier | null {
  for (let i = BUDGET_THRESHOLDS.length - 1; i >= 0; i--) {
    const { threshold, tier } = BUDGET_THRESHOLDS[i];
    if (beforePct < threshold && afterPct >= threshold) return tier;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/budget.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/budget.ts tests/budget.test.ts
git commit -m "feat: budget tier logic with 50/75/90/100 thresholds"
```

---

### Task 2: Paginate helper

**Files:**
- Create: `lib/paginate.ts`
- Test: `tests/paginate.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `paginate<T>(items: T[], page: number, size: number): { rows: T[]; totalPages: number }` — clamps out-of-range pages, `totalPages >= 1`. Task 9 consumes this exact signature.

- [ ] **Step 1: Write the failing test**

Create `tests/paginate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { paginate } from "@/lib/paginate";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("paginate", () => {
  it("slices the requested page", () => {
    const { rows, totalPages } = paginate(range(25), 2, 10);
    expect(rows).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(totalPages).toBe(3);
  });

  it("handles an exact multiple as a full last page", () => {
    const { rows, totalPages } = paginate(range(20), 2, 10);
    expect(totalPages).toBe(2);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toBe(11);
  });

  it("clamps pages beyond the range to the last page", () => {
    const { rows, totalPages } = paginate(range(25), 99, 10);
    expect(totalPages).toBe(3);
    expect(rows).toEqual([21, 22, 23, 24, 25]);
  });

  it("clamps non-positive pages to page 1", () => {
    expect(paginate(range(25), 0, 10).rows[0]).toBe(1);
    expect(paginate(range(25), -3, 10).rows[0]).toBe(1);
  });

  it("returns one empty page for empty input", () => {
    expect(paginate([], 1, 10)).toEqual({ rows: [], totalPages: 1 });
  });

  it("treats a non-positive size as 1", () => {
    expect(paginate([1, 2], 2, 0)).toEqual({ rows: [2], totalPages: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/paginate.test.ts`
Expected: FAIL — cannot resolve `@/lib/paginate`.

- [ ] **Step 3: Write the implementation**

Create `lib/paginate.ts` (with AI-CONTEXT-NOTE header):

```ts
/* AI-CONTEXT-NOTE:{"R":"Pure array paginator returning the rows for a page plus total page count, used by the transactions list.","IDD":[{"?":"Clamps page into [1, totalPages] and floors size to >=1 so callers never slice out of bounds or divide by zero"},{"?":"Generic + pure so it is unit-testable without DOM"}],"A":[{"!!":"components/transactions/TransactionsView.tsx","slices the filtered list via paginate"},{"?":"tests/paginate.test.ts","covers boundaries"}],"AB":[{"?":"None — standalone pure module"}],"E":[{"!!!":"npm test -- tests/paginate.test.ts","exact-multiple and clamp cases must pass"}]} */

export function paginate<T>(
  items: T[],
  page: number,
  size: number
): { rows: T[]; totalPages: number } {
  const safeSize = Math.max(1, Math.floor(size));
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeSize;
  return { rows: items.slice(start, start + safeSize), totalPages };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/paginate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/paginate.ts tests/paginate.test.ts
git commit -m "feat: pure paginate helper for paged lists"
```

---

### Task 3: Dexie schema v2 + repository budget operations

**Files:**
- Modify: `lib/db/schema.ts` (add `Budget` type, `budgets` table, `OVERALL_BUDGET_ID`; bump to `version(2)`)
- Modify: `lib/db/repository.ts` (add `getBudget`, `setBudget`, `getMonthlySpent`)
- Modify: `tests/repository.test.ts` (extend mock + new describes)

**Interfaces:**
- Consumes: `monthRange(): { start: string; end: string }` from `lib/format.ts` (exists).
- Produces: `OVERALL_BUDGET_ID = "overall"` (from schema.ts); `getBudget(): Promise<Budget | null>`; `setBudget(amount: number): Promise<void>`; `getMonthlySpent(): Promise<number>`. Tasks 4, 6, 8 consume these exact signatures.

- [ ] **Step 1: Extend the failing tests**

In `tests/repository.test.ts`:

(a) In the `vi.hoisted` block, add a budgets store and give `makeTable` `put` and `where().between()` support. Replace the whole hoisted/mock section with:

```ts
const { mockDb, transactionsStore, categoriesStore, budgetsStore } = vi.hoisted(() => {
  const transactionsStore: Array<{ id: string; [key: string]: unknown }> = [];
  const categoriesStore: Array<{ id: string; [key: string]: unknown }> = [];
  const budgetsStore: Array<{ id: string; [key: string]: unknown }> = [];

  function makeTable<T extends { id: string }>(store: T[]) {
    return {
      _store: store,
      add: vi.fn(async (item: T) => {
        store.push(item);
        return item;
      }),
      put: vi.fn(async (item: T) => {
        const i = store.findIndex((x) => x.id === item.id);
        if (i >= 0) store[i] = item;
        else store.push(item);
        return item.id;
      }),
      update: vi.fn(async (id: string, changes: Partial<T>) => {
        const rec = store.find((x) => x.id === id);
        if (rec) Object.assign(rec, changes);
        return rec ? 1 : 0;
      }),
      delete: vi.fn(async (id: string) => {
        const i = store.findIndex((x) => x.id === id);
        if (i >= 0) store.splice(i, 1);
      }),
      get: vi.fn(async (id: string) => store.find((x) => x.id === id)),
      toArray: vi.fn(async () => [...store]),
      bulkAdd: vi.fn(async (items: T[]) => {
        store.push(...items);
      }),
      where: vi.fn((field: keyof T) => ({
        equals: vi.fn((val: unknown) => ({
          count: vi.fn(async () => store.filter((x) => x[field] === val).length),
          modify: vi.fn(async (changes: Partial<T>) => {
            for (const rec of store) {
              if (rec[field] === val) Object.assign(rec, changes);
            }
          }),
        })),
        between: vi.fn(
          (lo: unknown, hi: unknown, incLo = true, incHi = true) => ({
            toArray: vi.fn(async () =>
              store.filter((x) => {
                const v = x[field];
                return (incLo ? v >= lo : v > lo) && (incHi ? v <= hi : v < hi);
              })
            ),
          })
        ),
      })),
    };
  }

  const db = {
    transactions: makeTable(transactionsStore),
    categories: makeTable(categoriesStore),
    budgets: makeTable(budgetsStore),
    transaction: vi.fn(async (_mode: string, ...args: unknown[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === "function") return cb();
    }),
  };

  return { mockDb: db, transactionsStore, categoriesStore, budgetsStore };
});
```

(b) Extend the post-mock import list and `beforeEach`:

```ts
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addCategory,
  updateCategory,
  deleteCategory,
  exportData,
  importTransactions,
  transactionCountForCategory,
  reassignCategory,
  getBudget,
  setBudget,
  getMonthlySpent,
} from "@/lib/db/repository";

beforeEach(() => {
  transactionsStore.length = 0;
  categoriesStore.length = 0;
  budgetsStore.length = 0;
  vi.clearAllMocks();
});
```

(c) Append the new describes at the end of the file:

```ts
describe("setBudget/getBudget", () => {
  it("returns null when no budget has been set", async () => {
    expect(await getBudget()).toBeNull();
  });

  it("inserts the overall budget", async () => {
    await setBudget(20000);
    const budget = await getBudget();
    expect(budget).toMatchObject({ id: "overall", amount: 20000 });
    expect(budgetsStore).toHaveLength(1);
  });

  it("updates in place and preserves createdAt", async () => {
    await setBudget(20000);
    const first = await getBudget();
    await setBudget(25000);
    const second = await getBudget();
    expect(second!.amount).toBe(25000);
    expect(second!.createdAt).toBe(first!.createdAt);
    expect(second!.updatedAt).toBeGreaterThanOrEqual(second!.createdAt);
    expect(budgetsStore).toHaveLength(1);
  });
});

describe("getMonthlySpent", () => {
  it("sums current-month expenses only", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15)); // Aug 15 2026 -> month 2026-08-01..31
    try {
      await addTransaction({ type: "expense", amount: 100, category: "Food", date: "2026-08-01" });
      await addTransaction({ type: "expense", amount: 40, category: "Food", date: "2026-08-31" });
      await addTransaction({ type: "expense", amount: 999, category: "Rent", date: "2026-07-31" });
      await addTransaction({ type: "expense", amount: 888, category: "Rent", date: "2026-09-01" });
      await addTransaction({ type: "income", amount: 5000, category: "Salary", date: "2026-08-05" });
      expect(await getMonthlySpent()).toBe(140);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 0 when there are no expenses this month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15));
    try {
      await addTransaction({ type: "income", amount: 5000, category: "Salary", date: "2026-08-05" });
      expect(await getMonthlySpent()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/repository.test.ts`
Expected: FAIL — `getBudget`, `setBudget`, `getMonthlySpent` do not exist (TypeScript/runtime errors).

- [ ] **Step 3: Schema changes**

In `lib/db/schema.ts` add after the `Category` interface:

```ts
export interface Budget {
  id: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}

export const OVERALL_BUDGET_ID = "overall";
```

Extend the `DB` class (keep version(1) untouched, add version(2)):

```ts
class DB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;

  constructor() {
    super("cash-guard");
    this.version(1).stores({
      transactions: "id, type, category, date, createdAt",
      categories: "id, type, name",
    });
    this.version(2).stores({
      transactions: "id, type, category, date, createdAt",
      categories: "id, type, name",
      budgets: "id",
    });
  }
}
```

Update the file's `AI-CONTEXT-NOTE`: R mentions three tables incl. budgets; A/E mention the v2 migration (old installs upgrade losslessly).

- [ ] **Step 4: Repository functions**

In `lib/db/repository.ts`:

Import additions (top of file):

```ts
import { db, newId, type Transaction, type Category, type Budget, OVERALL_BUDGET_ID } from "./schema";
import { monthRange } from "@/lib/format";
```

Append at the end of the file:

```ts
export async function getBudget(): Promise<Budget | null> {
  const row = await db.budgets.get(OVERALL_BUDGET_ID);
  return row ?? null;
}

export async function setBudget(amount: number): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.budgets, async () => {
    const existing = await db.budgets.get(OVERALL_BUDGET_ID);
    await db.budgets.put({
      id: OVERALL_BUDGET_ID,
      amount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  });
}

export async function getMonthlySpent(): Promise<number> {
  const { start, end } = monthRange();
  const rows = await db.transactions
    .where("date")
    .between(start, end, true, true)
    .toArray();
  return rows
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}
```

Update the file's `AI-CONTEXT-NOTE`: R mentions budget CRUD + monthly spend; A adds BudgetView/TransactionForm consumers; E mentions `npm test -- tests/repository.test.ts`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/repository.test.ts`
Expected: PASS — all pre-existing suites still green (mock change is backward compatible) plus new suites.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS — nothing else regressed.

- [ ] **Step 7: Commit**

```bash
git add lib/db/schema.ts lib/db/repository.ts tests/repository.test.ts
git commit -m "feat: budgets table (schema v2) and budget/monthly-spend repository ops"
```

---

### Task 4: Live-query hooks

**Files:**
- Create: `lib/hooks/useBudget.ts`

**Interfaces:**
- Consumes: `db`, `Budget`, `OVERALL_BUDGET_ID` from `lib/db/schema.ts`; `monthRange` from `lib/format.ts`.
- Produces: `useBudget(): Budget | undefined`; `useMonthlySpent(): number | undefined` (both `undefined` while the query loads). Task 6 consumes these.

- [ ] **Step 1: Write the hooks**

Create `lib/hooks/useBudget.ts` (with AI-CONTEXT-NOTE header):

```ts
/* AI-CONTEXT-NOTE:{"R":"Live-query React hooks exposing the overall budget and current-month expense total to the Budget screen.","IDD":[{"?":"Read-only useLiveQuery — never write inside the callback (ReadonlyError)"},{"?":"Return undefined while loading; callers must guard before rendering numbers"}],"A":[{"!!":"components/budget/BudgetView.tsx","sole consumer of both hooks"}],"AB":[{"?":"lib/db/schema.ts","db instance, Budget type, OVERALL_BUDGET_ID"},{"?":"dexie-react-hooks version","API compatibility"}],"E":[{"!!":"npm run build","types must line up with Budget"},{"*":"A write introduced here would throw ReadonlyError at runtime"}]} */

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Budget, OVERALL_BUDGET_ID } from "@/lib/db/schema";
import { monthRange } from "@/lib/format";

export function useBudget(): Budget | undefined {
  return useLiveQuery(
    async () => (await db.budgets.get(OVERALL_BUDGET_ID)) ?? undefined,
    []
  );
}

export function useMonthlySpent(): number | undefined {
  return useLiveQuery(async () => {
    const { start, end } = monthRange();
    const rows = await db.transactions
      .where("date")
      .between(start, end, true, true)
      .toArray();
    return rows
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, []);
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint; if ($?) { npm run build }`
Expected: lint clean, build passes (hooks compile against real Dexie types).

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useBudget.ts
git commit -m "feat: useBudget and useMonthlySpent live-query hooks"
```

---

### Task 5: shadcn primitives — Progress and Pagination

**Files:**
- Create: `components/ui/progress.tsx`
- Create: `components/ui/pagination.tsx`

**Interfaces:**
- Consumes: `@base-ui/react/progress` (Root auto-applies indicator width `%` inline), `buttonVariants` from `components/ui/button.tsx` (variants `outline`, sizes `sm`; base classes include disabled styling).
- Produces: `Progress` with props `ProgressPrimitive.Root.Props & { indicatorClassName?: string }` (value 0–100); `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext` (plain `<button>`s accepting `disabled`/`onClick`). Tasks 6 and 9 consume these exact component names.

- [ ] **Step 1: Progress primitive**

Create `components/ui/progress.tsx` (no AI-CONTEXT-NOTE — `components/ui/*` is excluded):

```tsx
"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  indicatorClassName,
  ...props
}: ProgressPrimitive.Root.Props & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full overflow-hidden rounded-[inherit]">
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn("h-full bg-primary transition-all", indicatorClassName)}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
```

(The Indicator sets `width: <percent>%` and `height: inherit` itself — verified in `node_modules/@base-ui/react/progress/indicator/ProgressIndicator.js`.)

- [ ] **Step 2: Pagination primitive**

Create `components/ui/pagination.tsx`:

```tsx
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="pagination"
      aria-label="pagination"
      className={cn("mx-auto w-full", className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center justify-between gap-2", className)}
      {...props}
    />
  )
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="pagination-item"
      className={cn("", className)}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="pagination-previous"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
      {...props}
    >
      <ChevronLeft data-icon="inline-start" />
      Previous
    </button>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="pagination-next"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
      {...props}
    >
      Next
      <ChevronRight data-icon="inline-end" />
    </button>
  )
}

export { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext }
```

- [ ] **Step 3: Verify**

Run: `npm run lint; if ($?) { npm run build }`
Expected: clean (primitives are not yet referenced — unused-file lint must still pass).

- [ ] **Step 4: Commit**

```bash
git add components/ui/progress.tsx components/ui/pagination.tsx
git commit -m "feat: shadcn progress and pagination primitives"
```

---

### Task 6: Budget validation, dialog, view, route

**Files:**
- Create: `lib/validations/budget.ts`
- Create: `components/budget/BudgetDialog.tsx`
- Create: `components/budget/BudgetView.tsx`
- Create: `app/budget/page.tsx`
- Test: `tests/budget.test.ts` (extend with `budgetSchema` cases)

**Interfaces:**
- Consumes: `getBudget`/`setBudget`/`getMonthlySpent` (Task 3); `useBudget`/`useMonthlySpent` (Task 4); `budgetTier`, `BudgetTier`, `formatPeso`; shadcn `Progress` (Task 5); `Header`, `BottomNav` (existing shared shell).
- Produces: `/budget` route rendering `BudgetView`; `BudgetDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (open: boolean) => void; initial?: number })`.

- [ ] **Step 1: Failing schema tests**

Extend `tests/budget.test.ts`. First, add to the import block at the top of the file:

```ts
import { budgetSchema } from "@/lib/validations/budget";
```

Then append this describe at the end of the file:

```ts
describe("budgetSchema", () => {
  it("accepts a positive amount", () => {
    expect(budgetSchema.safeParse({ amount: 20000 }).success).toBe(true);
  });

  it("coerces numeric strings", () => {
    const parsed = budgetSchema.safeParse({ amount: "1500" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(1500);
  });

  it.each([0, -1])("rejects non-positive amount %s", (amount) => {
    expect(budgetSchema.safeParse({ amount }).success).toBe(false);
  });
});
```

Run: `npm test -- tests/budget.test.ts`
Expected: FAIL — `@/lib/validations/budget` unresolved.

- [ ] **Step 2: Validation schema**

Create `lib/validations/budget.ts` (with AI-CONTEXT-NOTE header):

```ts
/* AI-CONTEXT-NOTE:{"R":"Zod schema and inferred input type for the monthly budget form.","IDD":[{"?":"Coerces the number input (valueAsNumber yields NaN for blanks — coercion + positive() produce a friendly error)"},{"?":"z.infer keeps form types and validation in lockstep"}],"A":[{"!!":"components/budget/BudgetDialog.tsx","resolver + BudgetInput"},{"!":"tests/budget.test.ts","schema cases"}],"AB":[{"?":"zod version"}],"E":[{"!!":"npm test -- tests/budget.test.ts","positive/coerce/reject cases"}]} */

import { z } from "zod";

export const budgetSchema = z.object({
  amount: z.coerce.number().positive("Budget must be greater than 0"),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
```

Run: `npm test -- tests/budget.test.ts`
Expected: PASS.

- [ ] **Step 3: BudgetDialog**

Create `components/budget/BudgetDialog.tsx` (with AI-CONTEXT-NOTE header):

```tsx
/* AI-CONTEXT-NOTE:{"R":"Dialog (RHF + Zod) to set or edit the overall monthly budget amount.","IDD":[{"?":"form.reset on open re-syncs defaults without remount tricks; open/close controlled by parent"},{"?":"Save calls repository.setBudget which upserts the single overall row"}],"A":[{"!!":"components/budget/BudgetView.tsx","opens this dialog"}],"AB":[{"?":"lib/validations/budget.ts","budgetSchema, BudgetInput"},{"?":"lib/db/repository.ts","setBudget"},{"?":"components/ui/dialog.tsx, input, label, button","shadcn primitives"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Success toast + close; failure keeps dialog open with error toast"},{"*":"Blank amount must show 'Budget must be greater than 0'"}]} */

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { budgetSchema, type BudgetInput } from "@/lib/validations/budget";
import { setBudget } from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: number;
}

export function BudgetDialog({ open, onOpenChange, initial }: Props) {
  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { amount: initial },
  });

  useEffect(() => {
    if (open) form.reset({ amount: initial });
  }, [open, initial, form]);

  const onSubmit = async (data: BudgetInput) => {
    try {
      await setBudget(data.amount);
      toast.success("Monthly budget saved");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the budget");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Monthly budget</DialogTitle>
          <DialogDescription>
            Applies to every calendar month and resets automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Amount (₱)</Label>
            <Input
              id="budget-amount"
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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

- [ ] **Step 4: BudgetView**

Create `components/budget/BudgetView.tsx` (with AI-CONTEXT-NOTE header):

```tsx
/* AI-CONTEXT-NOTE:{"R":"Budget screen (/budget) — shows remaining vs monthly limit with a tier-colored Progress bar, empty state, and the set/edit BudgetDialog.","IDD":[{"?":"Shared shell: Header + centered max-w-md column + pb-20 + fixed BottomNav"},{"?":"Bar color by tier: primary below 75%, amber-500 75-89%, destructive >=90 (spec-approved exception)"},{"?":"Loading guards: both hooks undefined until first live-query tick"}],"A":[{"!!!":"app/budget/page.tsx","renders this view"},{"!!":"components/budget/BudgetDialog.tsx","opened for set/edit"}],"AB":[{"?":"lib/hooks/useBudget.ts","useBudget + useMonthlySpent"},{"?":"lib/budget.ts","budgetTier drives color/hint"},{"?":"lib/format.ts","formatPeso"},{"?":"components/shared (Header, BottomNav)","shell"},{"?":"components/ui/progress.tsx","indicatorClassName prop"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Empty state before first budget; negative remaining renders via formatPeso"},{"*":"Over-budget shows destructive text and red bar"}]} */

"use client";

import { useState } from "react";
import { IconPigMoney } from "@tabler/icons-react";

import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BudgetDialog } from "@/components/budget/BudgetDialog";
import { useBudget, useMonthlySpent } from "@/lib/hooks/useBudget";
import { budgetTier, type BudgetTier } from "@/lib/budget";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";

const BAR_COLOR: Record<BudgetTier, string> = {
  ok: "bg-primary",
  warn50: "bg-primary",
  warn75: "bg-amber-500",
  warn90: "bg-destructive",
  over: "bg-destructive",
};

const HINT_COLOR: Record<BudgetTier, string> = {
  ok: "text-muted-foreground",
  warn50: "text-muted-foreground",
  warn75: "text-amber-600 dark:text-amber-400",
  warn90: "font-medium text-destructive",
  over: "font-medium text-destructive",
};

const HINT_TEXT: Record<BudgetTier, string> = {
  ok: "",
  warn50: "Halfway there — watch your spending.",
  warn75: "Getting close to your limit.",
  warn90: "Almost at your limit!",
  over: "You're over budget this month.",
};

export function BudgetView() {
  const budget = useBudget();
  const spent = useMonthlySpent();
  const [dialogOpen, setDialogOpen] = useState(false);

  const monthLabel = new Date().toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const loading = budget === undefined || spent === undefined;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-20">
      <Header title="Budget" subtitle={monthLabel} />

      <main className="flex-1 space-y-4 px-4 pt-4">
        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : !budget ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <IconPigMoney className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No budget yet</p>
                  <p className="text-sm text-muted-foreground">
                    Set a monthly spending limit to track what's left to spend.
                  </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  Set monthly budget
                </Button>
              </div>
            ) : (
              (() => {
                const limit = budget.amount;
                const { pct, tier } = budgetTier(spent!, limit);
                const remaining = limit - spent!;
                return (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-2xl font-semibold">
                        {formatPeso(remaining)}
                      </p>
                      <p className="text-xs text-muted-foreground">remaining</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPeso(spent!)} spent of {formatPeso(limit)}
                    </p>
                    <Progress
                      value={Math.min(pct, 100)}
                      indicatorClassName={BAR_COLOR[tier]}
                    />
                    <div className="flex items-center justify-between gap-2">
                      {HINT_TEXT[tier] ? (
                        <p className={cn("text-xs", HINT_COLOR[tier])}>
                          {HINT_TEXT[tier]}
                        </p>
                      ) : (
                        <span />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogOpen(true)}
                      >
                        Edit budget
                      </Button>
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={budget?.amount}
      />
    </div>
  );
}
```

- [ ] **Step 5: Route**

Create `app/budget/page.tsx` (with AI-CONTEXT-NOTE header):

```tsx
/* AI-CONTEXT-NOTE:{"R":"Budget route (/budget) — renders BudgetView with page metadata.","IDD":[{"?":"force-dynamic because all content is client-side data from IndexedDB"}],"A":[{"?":"components/budget/BudgetView.tsx","rendered here"}],"AB":[{"?":"components/budget/BudgetView.tsx","prop/behavior changes reflected here"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Keep force-dynamic and the metadata title"}]} */

import type { Metadata } from "next";
import { BudgetView } from "@/components/budget/BudgetView";

export const metadata: Metadata = { title: "Budget · Cash Guard" };
export const dynamic = "force-dynamic";

export default function BudgetPage() {
  return <BudgetView />;
}
```

- [ ] **Step 6: Verify**

Run: `npm test; if ($?) { npm run lint }; if ($?) { npm run build }`
Expected: tests pass, lint clean, build passes.

- [ ] **Step 7: Commit**

```bash
git add lib/validations/budget.ts components/budget/BudgetDialog.tsx components/budget/BudgetView.tsx app/budget/page.tsx tests/budget.test.ts
git commit -m "feat: budget page with tier-colored progress and set/edit dialog"
```

---

### Task 7: Bottom nav entry

**Files:**
- Modify: `components/shared/BottomNav.tsx`

**Interfaces:**
- Consumes: existing `items` array shape `{ href, label, icon }`.
- Produces: `/budget` nav entry between Transactions and Settings (Tabler `IconPigMoney`).

- [ ] **Step 1: Edit BottomNav**

In `components/shared/BottomNav.tsx`:

Change the Tabler import line (add below the lucide import):

```tsx
import { IconPigMoney } from "@tabler/icons-react";
```

Replace the `items` array:

```tsx
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/budget", label: "Budget", icon: IconPigMoney },
  { href: "/settings", label: "Settings", icon: ChartPie },
];
```

Update the file's `AI-CONTEXT-NOTE`: R says four destinations; A/AB mention `/budget`; E notes active highlighting across four tabs and pb-20 shells.

- [ ] **Step 2: Verify**

Run: `npm run lint; if ($?) { npm run build }`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/shared/BottomNav.tsx
git commit -m "feat: add Budget destination to bottom navigation"
```

---

### Task 8: Overspend toasts in TransactionForm

**Files:**
- Modify: `components/transactions/TransactionForm.tsx` (the `onSubmit` handler + imports)

**Interfaces:**
- Consumes: `getBudget`, `getMonthlySpent` (Task 3); `crossedTier`, `BUDGET_TIER_MESSAGES` (Task 1); `monthRange` from `lib/format.ts`.
- Produces: side-effect only — `toast.warning` when saving an expense dated in the current calendar month crosses 50/75/90/100%.

- [ ] **Step 1: Edit the submit flow**

In `components/transactions/TransactionForm.tsx`:

Extend the repository import:

```tsx
import {
  addTransaction,
  updateTransaction,
  getBudget,
  getMonthlySpent,
} from "@/lib/db/repository";
```

Add two imports:

```tsx
import { crossedTier, BUDGET_TIER_MESSAGES } from "@/lib/budget";
import { todayISO, monthRange } from "@/lib/format";
```

(the file already imports `todayISO` — merge into that line rather than duplicating.)

Replace the entire `onSubmit` function:

```tsx
const onSubmit = async (data: TransactionInput) => {
  try {
    let limit: number | null = null;
    let spentBefore: number | null = null;

    if (data.type === "expense") {
      const { start, end } = monthRange();
      const inCurrentMonth = data.date >= start && data.date <= end;
      if (inCurrentMonth) {
        const budget = await getBudget();
        if (budget) {
          limit = budget.amount;
          spentBefore = await getMonthlySpent();
        }
      }
    }

    if (editing && id) {
      await updateTransaction(id, data);
      toast.success("Transaction updated");
    } else {
      await addTransaction(data);
      toast.success("Transaction added");
    }

    if (limit !== null && spentBefore !== null) {
      const spentAfter = await getMonthlySpent();
      const crossed = crossedTier(
        (spentBefore / limit) * 100,
        (spentAfter / limit) * 100
      );
      if (crossed) {
        toast.warning(BUDGET_TIER_MESSAGES[crossed]);
      }
    }

    onDone?.();
  } catch {
    toast.error("Something went wrong saving the transaction");
  }
};
```

Update the file's `AI-CONTEXT-NOTE`: AB gains `lib/budget.ts` and budget repository ops; E gains "saving a current-month expense crossing 50/75/90/100% fires the matching warning toast".

- [ ] **Step 2: Verify**

Run: `npm run lint; if ($?) { npm run build }; if ($?) { npm test }`
Expected: all clean/passing.

- [ ] **Step 3: Commit**

```bash
git add components/transactions/TransactionForm.tsx
git commit -m "feat: budget threshold warning toasts on expense saves"
```

---

### Task 9: Transactions pagination wiring

**Files:**
- Modify: `components/transactions/TransactionsView.tsx`

**Interfaces:**
- Consumes: `paginate` (Task 2); shadcn `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext` (Task 5); existing `applyFilters`, `Filters`, `TransactionList`.
- Produces: list sliced to `PAGE_SIZE = 10`; filter changes reset to page 1; render-time clamp prevents blank last pages.

- [ ] **Step 1: Wire state and slicing**

In `components/transactions/TransactionsView.tsx`:

Add imports:

```tsx
import { paginate } from "@/lib/paginate";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
```

Add a constant above the component:

```tsx
const PAGE_SIZE = 10;
```

Inside `TransactionsView`, add page state next to the filters state:

```tsx
const [page, setPage] = useState(1);
```

Replace the `filters` onChange usage and the `filtered` memo area with:

```tsx
const filtered = useMemo(
  () => applyFilters(transactions, filters),
  [transactions, filters]
);

const { rows, totalPages } = useMemo(
  () => paginate(filtered, page, PAGE_SIZE),
  [filtered, page]
);
const displayPage = Math.min(page, totalPages);

const handleFiltersChange = (next: Filters) => {
  setFilters(next);
  setPage(1);
};
```

Change `<TransactionFilters filters={filters} onChange={setFilters} />` to:

```tsx
<TransactionFilters filters={filters} onChange={handleFiltersChange} />
```

Change the list render to use the page rows:

```tsx
<TransactionList
  transactions={rows}
  onEdit={openEdit}
  onDelete={setDeleting}
/>
```

Immediately after the closing `</Card>` (still inside `<main>`), add the pager:

```tsx
{filtered.length > PAGE_SIZE && (
  <Pagination>
    <PaginationContent>
      <PaginationItem>
        <PaginationPrevious
          disabled={displayPage <= 1}
          onClick={() => setPage(displayPage - 1)}
        />
      </PaginationItem>
      <PaginationItem className="text-sm text-muted-foreground">
        Page {displayPage} of {totalPages}
      </PaginationItem>
      <PaginationItem>
        <PaginationNext
          disabled={displayPage >= totalPages}
          onClick={() => setPage(displayPage + 1)}
        />
      </PaginationItem>
    </PaginationContent>
  </Pagination>
)}
```

The header subtitle `${filtered.length} shown` stays unchanged (full filtered count).

Update the file's `AI-CONTEXT-NOTE`: IDD gains pagination decisions (PAGE_SIZE=10, reset-on-filter, render-clamp via displayPage); A/AB gain `lib/paginate.ts` and `components/ui/pagination.tsx`; E gains pagination checks.

- [ ] **Step 2: Verify**

Run: `npm test; if ($?) { npm run lint }; if ($?) { npm run build }`
Expected: all passing/clean.

- [ ] **Step 3: Commit**

```bash
git add components/transactions/TransactionsView.tsx
git commit -m "feat: paginate transactions 10 per page with compact prev/next pager"
```

---

### Task 10: Full verification

**Files:** none created/modified (verification only).

- [ ] **Step 1: Whole suite**

Run: `npm test`
Expected: every suite passes (`budget`, `paginate`, `repository`, `format`, `csv`, `transaction`).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero errors/warnings.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: TypeScript + build pass (stamped files may appear as working-tree changes per repo convention — leave them alone).

- [ ] **Step 4: Working tree check**

Run: `git status`
Expected: clean apart from (optionally) version-stamped artifacts. Confirm nothing was missed.

- [ ] **Step 5: Manual smoke (dev or production build)**

Verify in browser:
1. `/budget` shows empty state → set ₱20,000 → card shows remaining/spent/bar.
2. Add expenses: crossing 50%, 75%, 90%, 100% each fires the matching Sonner warning; bar turns amber at ≥75%, red at ≥90%; hint text updates.
3. Existing install opens with all old data intact (Dexie v1→v2 migration).
4. `/transactions`: >10 rows paginates 10-at-a-time; changing any filter jumps back to page 1; deleting the only row of the last page never shows a blank page; ≤10 rows hides the pager entirely.
