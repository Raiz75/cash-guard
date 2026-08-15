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