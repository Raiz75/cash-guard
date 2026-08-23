/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for the BudgetView breakdown section — guards that Add breakdown stays disabled until an overall budget exists, that a category row renders its name, spent-vs-allotted peso text, tier hint copy, and Edit/Remove actions, that rows sort by category name and the budget-required hint never flashes while loading, plus CategoryBudgetDialog select-label resolution (names, never ids) in add/edit modes.","IDD":[{"?":"Mocks ONLY the Dexie layer via vi.hoisted + vi.mock of @/lib/db/schema (budgets.get/toArray, categories.orderBy().toArray(), transactions.where().between().toArray()) so no IndexedDB is needed"},{"?":"A hoisted `state` object reset in beforeEach lets each test script budgets/categories/transactions; mockDb closures read it lazily"},{"?":"Mocks dexie-react-hooks useLiveQuery to resolve through useState/useEffect — undefined until first tick mirrors real pending behavior; a rejected query just stays undefined like a real Dexie failure"},{"?":"categories mock must mirror useCategories' orderBy('name').toArray() call shape or rows silently render null (find miss), not crash"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"}],"A":[{"!!!":"components/budget/BudgetView.tsx","CRITICAL":"breakdown gating (!budget || loading disables the button), parseCategoryBudgetId filtering of budgets.toArray, and row rendering are all asserted here"},{"!!":"lib/hooks/useBudget.ts","useCategoryBudgets + useMonthlySpentByCategory supply the row data"},{"!!":"components/budget/CategoryBudgetDialog.tsx","select trigger must show category names via Base UI Root items, asserted in add and edit modes"},{"?":"components/budget/tierStyles.ts","HINT_TEXT.warn50 copy is asserted verbatim"},{"?":"lib/budget.ts","4000/8000 spent must land exactly on tier warn50"}],"AB":[{"?":"tests/budgetView.test.ts","source of the Dexie-mock pattern this file extends with stateful mocks"},{"?":"@testing-library/react + jest-dom","render and matchers"},{"?":"@testing-library/user-event","opens/picks the Base UI select under happy-dom"}],"E":[{"!!":"npm test -- tests/categoryBudgetView.test.ts","all BudgetView cases (gating, row content, name sort order, loading copy) must stay green"},{"!!":"Dialog select label: add-mode pick and edit-mode preset both display the category name, never the raw id c1"},{"!":"Loading case: 'Set a monthly budget first' absent while budget undefined; Add breakdown disabled until loaded"},{"!!":"npm run build","BudgetView type changes surface here first at runtime"},{"*":"Peso assertion may need /(\\.00)?/ widening if formatPeso decimals change — currently unanchored so it matches ₱8,000.00"}]} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => ({
  budgetRow: null as unknown,
  budgetList: [] as unknown[],
  transactions: [] as Array<Record<string, unknown>>,
  categories: [] as Array<Record<string, unknown>>,
}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    budgets: {
      get: vi.fn(async () => state.budgetRow),
      toArray: vi.fn(async () => state.budgetList),
    },
    categories: {
      orderBy: vi.fn(() => ({
        toArray: vi.fn(async () => [...state.categories]),
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
import { CategoryBudgetDialog } from "@/components/budget/CategoryBudgetDialog";

beforeEach(() => {
  state.budgetRow = null;
  state.budgetList = [];
  state.transactions = [];
  state.categories = [
    { id: "c1", name: "Food", type: "expense", icon: null, color: null },
  ];
});

describe("BudgetView breakdown", () => {
  it("disables Add breakdown until an overall budget exists", async () => {
    render(createElement(BudgetView));
    expect(await screen.findByText("No budget yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeDisabled();
    expect(screen.getByText("Set a monthly budget first")).toBeInTheDocument();
  });

  it("does not show the budget-required hint while data is still loading", async () => {
    state.budgetRow = { id: "overall", amount: 10000, createdAt: 1, updatedAt: 1 };
    render(createElement(BudgetView));
    expect(screen.queryByText("Set a monthly budget first")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeDisabled();
    expect(await screen.findByText("₱10,000.00")).toBeInTheDocument();
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

  it("sorts breakdown rows by category name, not Dexie key order", async () => {
    state.budgetRow = { id: "overall", amount: 10000, createdAt: 1, updatedAt: 1 };
    state.budgetList = [
      { id: "overall", amount: 10000, createdAt: 1, updatedAt: 1 },
      { id: "cat:cZebra", amount: 1000, createdAt: 1, updatedAt: 1 },
      { id: "cat:cApple", amount: 2000, createdAt: 1, updatedAt: 1 },
    ];
    state.categories = [
      { id: "cZebra", name: "Zebra", type: "expense", icon: null, color: null },
      { id: "cApple", name: "Apple", type: "expense", icon: null, color: null },
    ];
    render(createElement(BudgetView));
    await screen.findByText("Apple");
    const names = screen
      .getAllByText(/^(Apple|Zebra)$/)
      .map((el) => el.textContent);
    expect(names.indexOf("Apple")).toBeLessThan(names.indexOf("Zebra"));
  });
});

describe("CategoryBudgetDialog select label", () => {
  it("shows the picked category name, not its id, in add mode", async () => {
    const user = userEvent.setup();
    render(
      createElement(CategoryBudgetDialog, {
        open: true,
        onOpenChange: () => {},
        categories: [
          { id: "c1", name: "Food", type: "expense", icon: null, color: null },
        ],
        editing: null,
      })
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /Food/ }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Food");
    expect(screen.getByRole("combobox").textContent).not.toContain("c1");
  });

  it("renders the editing category name, not its id, in edit mode", async () => {
    render(
      createElement(CategoryBudgetDialog, {
        open: true,
        onOpenChange: () => {},
        categories: [],
        editing: { categoryId: "c1", name: "Food" },
      })
    );
    const trigger = await screen.findByRole("combobox");
    expect(trigger).toHaveTextContent("Food");
    expect(trigger.textContent).not.toContain("c1");
  });
});
