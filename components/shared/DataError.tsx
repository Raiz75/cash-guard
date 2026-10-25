"use client";

import { Button } from "@/components/ui/button";
import { useFinanceError } from "@/lib/hooks/useFinanceError";

export function DataError() {
  const result = useFinanceError();
  if (!result) return null;
  return (
    <div className="mx-auto max-w-md px-4 py-3">
      <p className="font-medium">Could not load your data.</p>
      <p className="text-sm text-muted-foreground">{result.message}</p>
      <Button onClick={result.retry} className="mt-2">
        Retry
      </Button>
    </div>
  );
}
