/* AI-CONTEXT-NOTE:{"R":"Hook returning the first errored finance query (if any) plus a retry that invalidates all queries; drives the DataError surface.","IDD":[{"?":"Subscribes to the TanStack Query cache via useSyncExternalStore so DataError re-renders on cache changes"},{"?":"Scans Object.values(financeKeys) for status === error and normalizes the message"}],"A":[{"!!":"components/shared/DataError.tsx","CRITICAL":"consumes this hook"},{"?":"tests/dataError.test.ts","asserts message and retry refetch"}],"AB":[{"?":"lib/query/client.ts","financeKeys and queryClient context"},{"?":"@tanstack/react-query","useQueryClient, cache subscription"}],"E":[{"!!":"npm test -- tests/dataError.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"}]} */
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { financeKeys } from "@/lib/query/client";

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export function useFinanceError(): { message: string; retry: () => void } | null {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();

  const snapshot = useSyncExternalStore(
    (onStoreChange) => cache.subscribe(onStoreChange),
    () => {
      for (const key of Object.values(financeKeys)) {
        const state = queryClient.getQueryState(key as readonly unknown[]);
        if (state?.status === "error") {
          return normalizeError(state.error);
        }
      }
      return null;
    },
    () => null
  );

  if (snapshot === null) return null;

  return {
    message: snapshot,
    retry: () => {
      void queryClient.invalidateQueries();
    },
  };
}
