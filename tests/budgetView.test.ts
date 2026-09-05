/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for components/budget/BudgetView.tsx — regression guard that the 'No budget yet' empty state renders on fresh installs where no budget row exists.","IDD":[{"?":"Mocks ONLY the Dexie layer via vi.hoisted + vi.mock of @/lib/db/schema (budgets.get resolves null, budgets.toArray/categories.orderBy('name').toArray() resolve [], transactions.where().between().toArray() resolves []) so no IndexedDB is needed"},{"!!":"Mock must stub every table method the four useBudget hooks + useCategories touch (budgets.get/toArray, categories.orderBy, transactions.where) or the new hooks reject with unhandled errors that Vitest flags even when assertions pass"},{"?":"Mocks dexie-react-hooks useLiveQuery to resolve the callback through useState/useEffect — undefined until first tick mirrors real pending behavior"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"},{"?":"next-themes/BottomNav render without providers in happy-dom (useTheme/usePathname degrade gracefully)"}],"A":[{"!!":"components/budget/BudgetView.tsx","CRITICAL":"empty state depends on useBudget returning null for a missing row (three-state contract)"},{"?":"lib/hooks/useBudget.ts","hooks under test through the view — adding a query here requires a matching mock stub"}],"AB":[{"?":"tests/repository.test.ts","source of the vi.hoisted db-mock pattern"},{"?":"tests/categoryBudgetView.test.ts","stateful extension of this mock for breakdown coverage"},{"?":"@testing-library/react + jest-dom","render and matchers"}],"E":[{"!!":"npm test -- tests/budgetView.test.ts","must pass before any BudgetView/useBudget change merges — and with ZERO unhandled errors in output"},{"?":"If rendering infrastructure changes (Header/BottomNav), this suite may need provider mocks"}],"*":"Also asserts the 'Set monthly budget' CTA is present"} */
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    budgets: {
      get: vi.fn(async () => null),
      toArray: vi.fn(async () => [] as unknown[]),
    },
    categories: {
      orderBy: vi.fn(() => ({
        toArray: vi.fn(async () => [] as unknown[]),
      })),
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
  it("renders the empty state when no category budgets exist", async () => {
    render(createElement(BudgetView));
    expect(await screen.findByText("No budget yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add category breakdowns below to set your budget.")
    ).toBeInTheDocument();
  });
});
