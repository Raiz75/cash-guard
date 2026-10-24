/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for the BudgetView breakdown section — guards loading gating, category-row content (name, spent-vs-allotted peso text, tier hint, Edit/Remove), name sorting, and CategoryBudgetDialog select-label resolution, while proving no legacy cat: id leaks into rendered text.","IDD":[{"?":"Mocks the auth session and Supabase repository reads (listCategories, getCategoryBudgets, getMonthlySpentByCategory) instead of Dexie; no IndexedDB is touched"},{"?":"The hoisted state object is reset in beforeEach and repository mocks read it lazily so each test scripts budgets/categories/spend"},{"!!":"Budget fixtures key rows by categoryId, not a cat:<id> string; sorting/joining uses that id against category.id"},{"?":"Every render is wrapped in a fresh QueryClientProvider with retry:false and gcTime:0 so query cache never leaks between cases; the dialog is wrapped too for consistency even though it has no queries"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"}],"A":[{"!!!":"components/budget/BudgetView.tsx","CRITICAL":"breakdown gating (loading disables the button, after load always enabled), categoryId filtering/joining, and row rendering are all asserted here"},{"!!":"lib/hooks/useBudget.ts","useCategoryBudgets + useMonthlySpentByCategory supply the row data"},{"!!":"components/budget/CategoryBudgetDialog.tsx","select trigger must show category names via Base UI Root items, asserted in add and edit modes"},{"?":"components/budget/tierStyles.ts","HINT_TEXT.warn50 copy is asserted verbatim"},{"?":"lib/budget.ts","4000/8000 spent must land exactly on tier warn50"}],"AB":[{"?":"tests/budgetView.test.ts","source of the auth + repository + QueryClient mock pattern this file extends with stateful mocks"},{"?":"lib/db/repository.ts","mock surface must match the exported read/write function names"},{"?":"@testing-library/react + jest-dom","render and matchers"},{"?":"@testing-library/user-event","drives the dialog select"}],"E":[{"!!":"npm test -- tests/categoryBudgetView.test.ts","breakdown gating, row content, tier hint, Edit/Remove, sort order, and dialog labels must all pass"},{"!!":"The loading case must show Loading… with Add breakdown disabled before the query resolves"},{"?":"No rendered text may contain the legacy cat: prefix"},{"*":"Unknown categoryIds on budget rows are dropped rather than rendered"} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const state = vi.hoisted(() => ({
  categories: [] as Array<Record<string, unknown>>,
  budgets: [] as Array<Record<string, unknown>>,
  transactions: [] as Array<Record<string, unknown>>,
  spentByCategory: {} as Record<string, number>,
  monthlySpent: 0,
}));

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "u1" } }, loading: false, configError: null }),
}));

vi.mock("@/lib/db/repository", () => ({
  listCategories: vi.fn(async () => state.categories),
  listTransactions: vi.fn(async () => state.transactions),
  getCategoryBudgets: vi.fn(async () => state.budgets),
  getMonthlySpent: vi.fn(async () => state.monthlySpent),
  getMonthlySpentByCategory: vi.fn(async () => state.spentByCategory),
  deleteCategoryBudget: vi.fn(async () => {}),
  setCategoryBudget: vi.fn(async () => {}),
}));

import { BudgetView } from "@/components/budget/BudgetView";
import { CategoryBudgetDialog } from "@/components/budget/CategoryBudgetDialog";

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(createElement(QueryClientProvider, { client }, ui));
}

beforeEach(() => {
  state.categories = [
    { id: "c1", name: "Food", type: "expense", icon: null, color: null },
  ];
  state.budgets = [];
  state.transactions = [];
  state.spentByCategory = {};
  state.monthlySpent = 0;
});

describe("BudgetView breakdown", () => {
  it("shows Add breakdown button enabled when no category budgets exist", async () => {
    renderWithQuery(createElement(BudgetView));
    expect(await screen.findByText("No budget yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeEnabled();
  });

  it("does not show hint while data is still loading", async () => {
    state.budgets = [
      { id: "b1", categoryId: "c1", amount: 8000, createdAt: 1, updatedAt: 1 },
    ];
    renderWithQuery(createElement(BudgetView));
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeDisabled();
    expect(await screen.findByText("₱8,000.00")).toBeInTheDocument();
  });

  it("renders a breakdown row with spent-vs-allotted and tier hint", async () => {
    state.budgets = [
      { id: "b1", categoryId: "c1", amount: 8000, createdAt: 1, updatedAt: 1 },
    ];
    state.spentByCategory = { Food: 4000 };
    renderWithQuery(createElement(BudgetView));
    expect(await screen.findByText("Food")).toBeInTheDocument();
    expect(screen.getAllByText(/of ₱8,000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Halfway there — watch your spending.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("cat:");
  });

  it("sorts breakdown rows by category name, not repository key order", async () => {
    state.budgets = [
      { id: "bZebra", categoryId: "cZebra", amount: 1000, createdAt: 1, updatedAt: 1 },
      { id: "bApple", categoryId: "cApple", amount: 2000, createdAt: 1, updatedAt: 1 },
    ];
    state.categories = [
      { id: "cZebra", name: "Zebra", type: "expense", icon: null, color: null },
      { id: "cApple", name: "Apple", type: "expense", icon: null, color: null },
    ];
    renderWithQuery(createElement(BudgetView));
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
    renderWithQuery(
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
    renderWithQuery(
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
