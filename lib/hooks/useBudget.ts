/* AI-CONTEXT-NOTE:{"R":"Live-query React hooks exposing the overall budget, current-month expense total, per-category budget rows (useCategoryBudgets), and current-month spend keyed by category name (useMonthlySpentByCategory) to the Budget screen breakdown.","IDD":[{"?":"Read-only useLiveQuery — never write inside the callback (ReadonlyError)"},{"!!":"Three-state contract: useBudget returns undefined while the live query is pending, null when no budget row exists, Budget once loaded — callers treat undefined as loading and null as the empty state"},{"?":"useMonthlySpent/useCategoryBudgets/useMonthlySpentByCategory stay two-state (undefined until first tick) because empty results are meaningful; callers coerce with ?? []/?? {}"},{"?":"useCategoryBudgets filters budgets.toArray by CATEGORY_BUDGET_PREFIX client-side so overall and category rows share one table"},{"?":"useMonthlySpentByCategory keys by transaction.category NAME (the schema join key), not category id"}],"A":[{"!!!":"components/budget/BudgetView.tsx","CRITICAL":"loading = budget === undefined || spent === undefined; !budget after load renders the empty state; catBudgets/spentByCat drive the breakdown rows"},{"!!":"Task 6 dashboard consumers","consume useCategoryBudgets + useMonthlySpentByCategory for donut/breakdown"},{"?":"tests/budgetView.test.ts","regression test mocks db.budgets.get resolving null"},{"?":"tests/categoryBudgetView.test.ts","exercises all four hooks through BudgetView"}],"AB":[{"?":"lib/db/schema.ts","db instance, Budget type, OVERALL_BUDGET_ID, CATEGORY_BUDGET_PREFIX"},{"?":"lib/format.ts","monthRange bounds the monthly queries"},{"?":"dexie-react-hooks version","API compatibility"}],"E":[{"!!":"npm test -- tests/budgetView.test.ts","empty state must render when budgets.get('overall') resolves null"},{"!!":"npm test -- tests/categoryBudgetView.test.ts","breakdown rows render from toArray filtering + name-keyed spend"},{"!!":"npm run build","types must line up with Budget | null | undefined and Record<string, number>"},{"*":"A write introduced here would throw ReadonlyError at runtime"}]} */

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type Budget,
  OVERALL_BUDGET_ID,
  CATEGORY_BUDGET_PREFIX,
} from "@/lib/db/schema";
import { monthRange } from "@/lib/format";

export function useBudget(): Budget | null | undefined {
  return useLiveQuery(
    async () => (await db.budgets.get(OVERALL_BUDGET_ID)) ?? null,
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
