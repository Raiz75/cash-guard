"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <CardHeader>
            <CardTitle className="mb-2">Configuration error</CardTitle>
          </CardHeader>
          <CardContent>
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