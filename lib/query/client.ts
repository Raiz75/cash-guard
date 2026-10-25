import { QueryClient } from "@tanstack/react-query";

export const financeKeys = {
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
  budgets: ["budgets"] as const,
  monthlySpent: ["monthly-spent"] as const,
  monthlySpentByCategory: ["monthly-spent-by-category"] as const,
} as const;

declare global {
  var __cashGuardQueryClient: QueryClient | undefined;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  });
}

export const queryClient: QueryClient =
  process.env.NODE_ENV !== "production" && globalThis.__cashGuardQueryClient
    ? globalThis.__cashGuardQueryClient
    : (() => {
        const c = makeQueryClient();
        if (process.env.NODE_ENV !== "production") {
          globalThis.__cashGuardQueryClient = c;
        }
        return c;
      })();

export async function invalidateFinance(): Promise<void> {
  await Promise.all(
    Object.values(financeKeys).map((key) => queryClient.invalidateQueries({ queryKey: key }))
  );
}