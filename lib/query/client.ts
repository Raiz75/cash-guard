/* AI-CONTEXT-NOTE:{"R":"TanStack Query client singleton with finance query keys and a shared invalidateFinance helper; instance cached on globalThis in non-production to survive HMR.","IDD":[{"?":"One QueryClient with staleTime 30s, retry 1, refetchOnWindowFocus/reconnect enabled"},{"?":"globalThis cache in dev prevents duplicate clients during HMR"},{"?":"invalidateFinance invalidates all queries to refresh finance data after writes"}],"A":[{"!!":"components/providers/QueryProvider.tsx","CRITICAL":"provides this client to the tree"},{"?":"lib/db/repository.ts (future)","writes call invalidateFinance after mutations"}],"AB":[{"?":"@tanstack/react-query version","QueryClient API"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"financeKeys values must stay exactly [\"categories\"], [\"transactions\"], [\"budgets\"], [\"monthly-spent\"], [\"monthly-spent-by-category\"]"}]} */
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
  await queryClient.invalidateQueries();
}
