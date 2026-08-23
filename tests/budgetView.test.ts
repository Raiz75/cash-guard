/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for components/budget/BudgetView.tsx — regression guard that the 'No budget yet' empty state renders on fresh installs where no budget row exists.","IDD":[{"?":"Mocks ONLY the Dexie layer via vi.hoisted + vi.mock of @/lib/db/schema (budgets.get resolves null, transactions.where().between().toArray() resolves []) so no IndexedDB is needed"},{"?":"Mocks dexie-react-hooks useLiveQuery to resolve the callback through useState/useEffect — undefined until first tick mirrors real pending behavior"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"},{"?":"next-themes/BottomNav render without providers in happy-dom (useTheme/usePathname degrade gracefully)"}],"A":[{"!!":"components/budget/BudgetView.tsx","CRITICAL":"empty state depends on useBudget returning null for a missing row (three-state contract)"},{"?":"lib/hooks/useBudget.ts","hook under test through the view"}],"AB":[{"?":"tests/repository.test.ts","source of the vi.hoisted db-mock pattern"},{"?":"@testing-library/react + jest-dom","render and matchers"}],"E":[{"!!":"npm test -- tests/budgetView.test.ts","must pass before any BudgetView/useBudget change merges"},{"?":"If rendering infrastructure changes (Header/BottomNav), this suite may need provider mocks"}],"*":"Also asserts the 'Set monthly budget' CTA is present"} */
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    budgets: {
      get: vi.fn(async () => null),
    },
    transactions: {
      where: vi.fn(() => ({
        between: vi.fn(() => ({
          toArray: vi.fn(async () => [] as unknown[]),
        })),
      })),
    },
  };
  return { mockDb };
});

vi.mock("@/lib/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/schema")>();
  return { ...actual, db: mockDb };
});

vi.mock("dexie-react-hooks", async () => {
  const { useState, useEffect } = await import("react");
  return {
    useLiveQuery: (fn: () => Promise<unknown>) => {
      const [value, setValue] = useState<unknown>(undefined);
      useEffect(() => {
        let alive = true;
        fn().then((result) => {
          if (alive) setValue(result);
        });
        return () => {
          alive = false;
        };
      });
      return value;
    },
  };
});

import { BudgetView } from "@/components/budget/BudgetView";

describe("BudgetView", () => {
  it("renders the empty state when no budget row exists", async () => {
    render(createElement(BudgetView));
    expect(await screen.findByText("No budget yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set monthly budget" })
    ).toBeInTheDocument();
  });
});
