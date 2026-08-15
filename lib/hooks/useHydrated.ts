/**
 * FILE NAME: useHydrated.ts
 *
 * ROLE: Hydration gate that returns false during SSR and true after mount, so
 * theme-dependent renders never mismatch server and client markup.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Implemented with useSyncExternalStore: subscribe is a no-op, client snapshot is
 *     true, server snapshot is false — no setState inside useEffect (lint would reject it).
 *
 * AFFECTS:
 * ! - components/shared/Header.tsx (CRITICAL: gates the theme-toggle render)
 *
 * AFFECTED BY:
 * ? - react version (useSyncExternalStore API)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify SSR output renders the neutral placeholder (not sun/moon)
 * * - Do not convert to setState-in-effect — react-hooks/set-state-in-effect rejects it
 */

"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}