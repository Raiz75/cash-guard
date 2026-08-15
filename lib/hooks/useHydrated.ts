/**
 * FILE NAME: useHydrated.ts
 *
 * ROLE: Hydration gate that returns false during SSR and true after mount, so theme-dependent renders never mismatch server and client markup.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Implemented with useSyncExternalStore: subscribe is a no-op, client snapshot is true, server snapshot is false — no setState inside useEffect (lint would reject it).
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
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Keep every entry on one line (no wrapped continuations) so Better Comments highlights the full line
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
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