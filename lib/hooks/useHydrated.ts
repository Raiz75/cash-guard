/* AI-CONTEXT-NOTE:{"R":"Hydration gate returning false during SSR and true after mount so theme-dependent renders never mismatch server and client markup.","IDD":[{"?":"Implemented with useSyncExternalStore: subscribe is a no-op, client snapshot true, server snapshot false — no setState inside useEffect (lint would reject it)"}],"A":[{"!!!":"components/shared/Header.tsx","CRITICAL":"gates the theme-toggle render"}],"AB":[{"?":"react version","useSyncExternalStore API"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify SSR output renders the neutral placeholder (not sun/moon)"},{"*":"Do not convert to setState-in-effect — react-hooks/set-state-in-effect rejects it"}]} */

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