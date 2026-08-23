/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for the BudgetView breakdown section — guards that Add breakdown stays disabled until an overall budget exists and that a category row renders its name, spent-vs-allotted peso text, tier hint copy, and Edit/Remove actions.","IDD":[{"?":"Mocks ONLY the Dexie layer via vi.hoisted + vi.mock of @/lib/db/schema (budgets.get/toArray, categories.orderBy().toArray(), transactions.where().between().toArray()) so no IndexedDB is needed"},{"?":"A hoisted `state` object reset in beforeEach lets each test script budgets/categories/transactions; mockDb closures read it lazily"},{"?":"Mocks dexie-react-hooks useLiveQuery to resolve through useState/useEffect — undefined until first tick mirrors real pending behavior; a rejected query just stays undefined like a real Dexie failure"},{"?":"categories mock must mirror useCategories' orderBy('name').toArray() call shape or rows silently render null (find miss), not crash"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"}],"A":[{"!!!":"components/budget/BudgetView.tsx","CRITICAL":"breakdown gating (!budget || loading disables the button), parseCategoryBudgetId filtering of budgets.toArray, and row rendering are all asserted here"},{"!!":"lib/hooks/useBudget.ts","useCategoryBudgets + useMonthlySpentByCategory supply the row data"},{"?":"components/budget/tierStyles.ts","HINT_TEXT.warn50 copy is asserted verbatim"},{"?":"lib/budget.ts","4000/8000 spent must land exactly on tier warn50"}],"AB":[{"?":"tests/budgetView.test.ts","source of the Dexie-mock pattern this file extends with stateful mocks"},{"?":"@testing-library/react + jest-dom","render and matchers"}],"E":[{"!!":"npm test -- tests/categoryBudgetView.test.ts","both cases must pass before any breakdown change merges"},{"!!":"npm run build","BudgetView type changes surface here first at runtime"},{"*":"Peso assertion may need /(\\.00)?/ widening if formatPeso decimals change — currently unanchored so it matches ₱8,000.00"}]} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  budgetRow: null as unknown,
  budgetList: [] as unknown[],
  transactions: [] as Array<Record<string, unknown>>,
}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    budgets: {
      get: vi.fn(async () => state.budgetRow),
      toArray: vi.fn(async () => state.budgetList),
    },
    categories: {
      orderBy: vi.fn(() => ({
        toArray: vi.fn(async () => [
          { id: "c1", name: "Food", type: "expense", icon: null, color: null },
        ]),
      })),
    },
    transactions: {
      where: vi.fn(() => ({
        between: vi.fn(() => ({
          toArray: vi.fn(async () => state.transactions),
        })),
      })),
    },
  },
}));

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

beforeEach(() => {
  state.budgetRow = null;
  state.budgetList = [];
  state.transactions = [];
});

describe("BudgetView breakdown", () => {
  it("disables Add breakdown until an overall budget exists", async () => {
    render(createElement(BudgetView));
    expect(await screen.findByText("No budget yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeDisabled();
    expect(screen.getByText("Set a monthly budget first")).toBeInTheDocument();
  });

  it("renders a breakdown row with spent-vs-allotted and tier hint", async () => {
    state.budgetRow = { id: "overall", amount: 10000, createdAt: 1, updatedAt: 1 };
    state.budgetList = [
      { id: "overall", amount: 10000, createdAt: 1, updatedAt: 1 },
      { id: "cat:c1", amount: 8000, createdAt: 1, updatedAt: 1 },
    ];
    state.transactions = [
      { type: "expense", amount: 4000, category: "Food", date: new Date().toISOString().slice(0, 10) },
    ];
    render(createElement(BudgetView));
    expect(await screen.findByText("Food")).toBeInTheDocument();
    expect(screen.getByText(/of ₱8,000/)).toBeInTheDocument();
    expect(screen.getByText("Halfway there — watch your spending.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
