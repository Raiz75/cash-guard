/* AI-CONTEXT-NOTE:{"R":"Tests components/shared/DataError.tsx + lib/hooks/useFinanceError.ts rendering and retry.","IDD":[{"?":"Wraps in a fresh QueryClient with retry:false"}],"A":[{"!!":"components/shared/DataError.tsx","CRITICAL":"error surface and retry"},{"!!":"lib/hooks/useFinanceError.ts","CRITICAL":"error scanning"}],"AB":[{"?":"@tanstack/react-query","QueryClientProvider"}],"E":[{"!!":"npm test -- tests/dataError.test.ts"}]} */
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { financeKeys } from "@/lib/query/client";
import { DataError } from "@/components/shared/DataError";

describe("DataError", () => {
  it("shows the error message and refetches on Retry", async () => {
    const queryFn = vi.fn(async () => {
      throw new Error("boom");
    });

    function Comp() {
      useQuery({ queryKey: financeKeys.transactions, queryFn });
      return createElement(DataError);
    }

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(Comp)
      )
    );

    await waitFor(() => {
      expect(screen.getByText("Could not load your data.")).toBeInTheDocument();
    });
    expect(screen.getByText("boom")).toBeInTheDocument();

    const before = queryFn.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(queryFn.mock.calls.length).toBeGreaterThan(before);
    });
  });
});
