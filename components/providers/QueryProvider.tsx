/* AI-CONTEXT-NOTE:{"R":"Client-only wrapper around TanStack QueryClientProvider so the root (Server Component) layout can provide the shared query client.","IDD":[{"?":"\"use client\" is required because QueryClientProvider uses React context"},{"?":"Imports the singleton queryClient from lib/query/client.ts"}],"A":[{"!!!":"app/layout.tsx","CRITICAL":"must wrap children with QueryProvider for queries to work"}],"AB":[{"?":"lib/query/client.ts","queryClient instance"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"}]} */
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { queryClient } from "@/lib/query/client";

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
