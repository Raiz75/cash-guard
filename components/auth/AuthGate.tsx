/* AI-CONTEXT-NOTE:{"R":"Gate component: shows loading skeleton, config error card, or AuthScreen based on auth state; renders the online/error shell plus children when authenticated.","IDD":[{"?":"Consumes useAuth from AuthProvider"},{"?":"Authenticated branch renders OfflineBanner and DataError before children"}],"A":[{"!!!":"app/layout.tsx","CRITICAL":"wraps children with AuthGate"},{"!!":"components/auth/AuthScreen.tsx","CRITICAL":"shown when unauthenticated"},{"?":"tests/auth.test.ts","asserts loading/config/session branches"}],"AB":[{"?":"lib/auth/AuthProvider.tsx","useAuth"},{"?":"components/shared/OfflineBanner.tsx","online banner"},{"?":"components/shared/DataError.tsx","error surface"}],"E":[{"!!":"npm test -- tests/auth.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"}]} */
"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { DataError } from "@/components/shared/DataError";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, configError, session } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Skeleton className="h-8 w-32" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent>
            <CardTitle className="mb-2">Configuration error</CardTitle>
            <p className="text-sm text-muted-foreground">{configError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <>
      <OfflineBanner />
      <DataError />
      {children}
    </>
  );
}