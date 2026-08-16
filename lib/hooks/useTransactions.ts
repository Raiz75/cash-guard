/* AI-CONTEXT-NOTE:{"R":"Live-query React hooks (useCategories, useTransactions, useRecentTransactions) keeping every screen reactive to IndexedDB changes.","IDD":[{"?":"Built on dexie-react-hooks' useLiveQuery so the UI updates automatically on write"},{"?":"Read-only by design: never perform a write inside a live query callback"},{"?":"Hooks return Category[]|Transaction[]|undefined — callers must coerce with ?? []"},{"?":"useRecentTransactions orders by createdAt (insertion time), others by date"}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"consumes all three hooks"},{"!!!":"components/transactions/TransactionsView.tsx","CRITICAL":"useTransactions"},{"?":"components/transactions/TransactionForm.tsx","useCategories"},{"?":"components/transactions/TransactionFilters.tsx","useCategories"},{"?":"components/settings/SettingsView.tsx","useCategories"}],"AB":[{"?":"lib/db/schema.ts","db instance and Transaction/Category types"},{"?":"dexie-react-hooks version","API compatibility"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify query index fields still match schema.ts indexes"},{"*":"A write introduced here inside useLiveQuery throws ReadonlyError at runtime"}]} */

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Transaction, type Category } from "@/lib/db/schema";

export function useCategories(type?: "income" | "expense"): Category[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.categories.orderBy("name").toArray();
    return type ? rows.filter((c) => c.type === type) : rows;
  }, [type]);
}

export function useTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => db.transactions.orderBy("date").reverse().toArray(), []);
}

export function useRecentTransactions(limit: number): Transaction[] | undefined {
  return useLiveQuery(
    () => db.transactions.orderBy("createdAt").reverse().limit(limit).toArray(),
    [limit]
  );
}