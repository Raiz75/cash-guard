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
