/* AI-CONTEXT-NOTE:{"R":"TanStack Query hooks exposing total budget (derived from category budgets), current-month expense total, per-category budget rows, and current-month spend keyed by category name, all gated on the auth session.","IDD":[{"?":"Replaced dexie-react-hooks useLiveQuery with useQuery over the Supabase repository"},{"!!":"useTotalBudget derives total by summing category budgets; returns undefined while loading, 0 if no budgets"},{"?":"Every hook reads useAuth() and passes enabled: !!session so reads stay off when signed out"},{"?":"useMonthlySpentByCategory keys by transaction.category NAME (the repository join key), not category id"}],"A":[{"!!!":"components/budget/BudgetView.tsx","CRITICAL":"totalBudget from useTotalBudget drives the top card; spent from useMonthlySpent; catBudgets/spentByCat drive the breakdown rows"},{"!!":"components/dashboard/DashboardView.tsx","consumes useCategoryBudgets + useMonthlySpentByCategory"},{"?":"tests/hooks.test.ts","exercises all hooks"}],"AB":[{"?":"lib/query/client.ts","financeKeys"},{"?":"lib/db/repository.ts","getCategoryBudgets, getMonthlySpent, getMonthlySpentByCategory"},{"?":"lib/auth/AuthProvider.tsx","useAuth session gating"},{"?":"lib/db/types.ts","Budget type"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/hooks.test.ts"},{"?":"Verify useTotalBudget returns undefined while pending and 0 when loaded but empty"}]} */
"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth/AuthProvider";
import { financeKeys } from "@/lib/query/client";
import { getCategoryBudgets, getMonthlySpent, getMonthlySpentByCategory } from "@/lib/db/repository";
import type { Budget } from "@/lib/db/types";

export function useTotalBudget(): number | undefined {
  const catBudgets = useCategoryBudgets();
  if (catBudgets === undefined) return undefined;
  return catBudgets.reduce((sum, b) => sum + b.amount, 0);
}

export function useMonthlySpent(): number | undefined {
  const { session } = useAuth();
  return useQuery({
    queryKey: financeKeys.monthlySpent,
    queryFn: getMonthlySpent,
    enabled: !!session,
  }).data;
}

export function useCategoryBudgets(): Budget[] | undefined {
  const { session } = useAuth();
  return useQuery({
    queryKey: financeKeys.budgets,
    queryFn: getCategoryBudgets,
    enabled: !!session,
  }).data;
}

export function useMonthlySpentByCategory(): Record<string, number> | undefined {
  const { session } = useAuth();
  return useQuery({
    queryKey: financeKeys.monthlySpentByCategory,
    queryFn: getMonthlySpentByCategory,
    enabled: !!session,
  }).data;
}