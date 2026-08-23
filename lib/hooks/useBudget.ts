/* AI-CONTEXT-NOTE:{"R":"Live-query React hooks exposing the overall budget and current-month expense total to the Budget screen.","IDD":[{"?":"Read-only useLiveQuery — never write inside the callback (ReadonlyError)"},{"!!":"Three-state contract: useBudget returns undefined while the live query is pending, null when no budget row exists, Budget once loaded — callers treat undefined as loading and null as the empty state"},{"?":"useMonthlySpent stays two-state (undefined until first tick) because 0 spent is meaningful"}],"A":[{"!!!":"components/budget/BudgetView.tsx","CRITICAL":"loading = budget === undefined || spent === undefined; !budget after load renders the empty state"},{"?":"tests/budgetView.test.ts","regression test mocks db.budgets.get resolving null"}],"AB":[{"?":"lib/db/schema.ts","db instance, Budget type, OVERALL_BUDGET_ID"},{"?":"dexie-react-hooks version","API compatibility"}],"E":[{"!!":"npm test -- tests/budgetView.test.ts","empty state must render when budgets.get('overall') resolves null"},{"!!":"npm run build","types must line up with Budget | null | undefined"},{"*":"A write introduced here would throw ReadonlyError at runtime"}]} */

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Budget, OVERALL_BUDGET_ID } from "@/lib/db/schema";
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
