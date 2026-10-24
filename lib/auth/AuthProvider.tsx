/* AI-CONTEXT-NOTE:{"R":"React context providing the Supabase session, loading flag, and config error; gates the app and clears the query cache on user change.","IDD":[{"?":"Async IIFE in useEffect avoids synchronous setState in the effect body (lint rule)"},{"?":"applySession clears the query client only when the user id changes away from a non-null id"},{"?":"deleteLegacyDatabase is invoked once on mount"},{"?":"useQueryClient (context) is used, not the module singleton, so tests can assert clear"}],"A":[{"!!!":"components/auth/AuthGate.tsx","CRITICAL":"consumes useAuth"},{"!!!":"app/layout.tsx","CRITICAL":"wraps the tree in AuthProvider"},{"?":"tests/auth.test.ts","asserts session/config/loading/cache-clear"}],"AB":[{"?":"lib/supabase/client.ts","getSupabase may throw when env missing"},{"?":"lib/legacyCleanup.ts","deleteLegacyDatabase"},{"?":"@tanstack/react-query","useQueryClient"}],"E":[{"!!":"npm test -- tests/auth.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"}]} */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase/client";
import { deleteLegacyDatabase } from "@/lib/legacyCleanup";

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  configError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const applySession = useCallback((next: Session | null) => {
    const nextId = next?.user?.id ?? null;
    const prevId = userIdRef.current;
    if (prevId !== null && prevId !== nextId) {
      queryClient.clear();
    }
    userIdRef.current = nextId;
    setSession(next);
    setLoading(false);
  }, [queryClient]);

  useEffect(() => {
    void deleteLegacyDatabase();

    let unsubscribe: (() => void) | undefined;

    (async () => {
      let supabase;
      try {
        supabase = getSupabase();
      } catch (error) {
        setConfigError(error instanceof Error ? error.message : String(error));
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        applySession((data?.session as Session | null) ?? null);
      } catch (error) {
        setConfigError(error instanceof Error ? error.message : String(error));
        setLoading(false);
        return;
      }

      const { data: subscriptionData } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          applySession((nextSession as Session | null) ?? null);
        }
      );
      unsubscribe = () => subscriptionData.subscription.unsubscribe();
    })();

    return () => {
      unsubscribe?.();
    };
  }, [applySession]);

  const value = useMemo(
    () => ({ session, loading, configError }),
    [session, loading, configError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}