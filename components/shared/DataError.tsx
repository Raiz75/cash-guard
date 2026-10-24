/* AI-CONTEXT-NOTE:{"R":"Renders a Could not load your data surface with the normalized error message and a Retry button when any finance query is in error state; renders nothing otherwise.","IDD":[{"?":"Delegates detection to useFinanceError; Retry invalidates the query cache"}],"A":[{"!!":"components/auth/AuthGate.tsx","CRITICAL":"renders DataError in the authenticated shell"},{"?":"tests/dataError.test.ts","asserts message and retry refetch"}],"AB":[{"?":"lib/hooks/useFinanceError.ts","error scanning and retry"}],"E":[{"!!":"npm test -- tests/dataError.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"}]} */
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