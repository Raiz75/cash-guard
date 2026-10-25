/* AI-CONTEXT-NOTE:{"R":"TanStack Query hooks (useCategories, useTransactions, useRecentTransactions) reading through the Supabase repository, gated on the auth session and sharing finance query keys.","IDD":[{"?":"Replaced live query with useQuery so screens react to cache invalidation after writes"},{"?":"enabled: !!session prevents reads before auth and keeps repository calls off when signed out"},{"?":"useCategories filters client-side inside select; useRecentTransactions sorts a copy by createdAt desc then slices so the source array is not mutated"},{"?":"Return types stay Category[]|Transaction[]|undefined so existing screens compile unchanged"}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"consumes all three hooks"},{"!!!":"components/transactions/TransactionsView.tsx","CRITICAL":"useTransactions"},{"?":"components/transactions/TransactionForm.tsx","note":"useCategories"},{"?":"components/transactions/TransactionFilters.tsx","note":"useCategories"},{"?":"components/settings/SettingsView.tsx","note":"useCategories"}],"AB":[{"?":"lib/query/client.ts","note":"financeKeys"},{"?":"lib/db/repository.ts","note":"listCategories, listTransactions"},{"?":"lib/auth/AuthProvider.tsx","note":"useAuth session gating"},{"?":"lib/db/types.ts","note":"Category, Transaction, TransactionType"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/hooks.test.ts"},{"?":"Verify select filters/sort do not mutate the cached array"}]} */
"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/AuthProvider";
import { financeKeys } from "@/lib/query/client";
import { listCategories, listTransactions } from "@/lib/db/repository";
import type { Category, Transaction, TransactionType } from "@/lib/db/types";

export function useCategories(type?: TransactionType): Category[] | undefined {
  const { session } = useAuth();
  return useQuery({
    queryKey: financeKeys.categories,
    queryFn: listCategories,
    enabled: !!session,
    select: (rows) => (type ? rows.filter((c) => c.type === type) : rows),
  }).data;
}

export function useTransactions(): Transaction[] | undefined {
  const { session } = useAuth();
  return useQuery({
    queryKey: financeKeys.transactions,
    queryFn: listTransactions,
    enabled: !!session,
  }).data;
}

export function useRecentTransactions(limit: number): Transaction[] | undefined {
  const { session } = useAuth();
  return useQuery({
    queryKey: financeKeys.transactions,
    queryFn: listTransactions,
    enabled: !!session,
    select: (rows) => [...rows].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit),
  }).data;
}