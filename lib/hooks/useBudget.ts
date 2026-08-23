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
