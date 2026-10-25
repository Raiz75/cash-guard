/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for components/budget/BudgetView.tsx — guards the 'No budget yet' empty state on fresh installs and the derived total budget card when category budgets exist.","IDD":[{"?":"Mocks the auth session and the Supabase repository reads (listCategories, getCategoryBudgets, getMonthlySpentByCategory) instead of Dexie; no IndexedDB is touched"},{"!!":"Every render is wrapped in a fresh QueryClientProvider with retry:false and gcTime:0 so cached query data never leaks between cases"},{"?":"The hoisted state object is reset in beforeEach and repository mocks read it lazily so each test scripts its own fixtures"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"},{"?":"Budget fixtures carry categoryId (no cat: prefix) because Budget is keyed by category id in the Supabase model"}],"A":[{"!!":"components/budget/BudgetView.tsx","CRITICAL":"empty state depends on useTotalBudget returning undefined (loading) or 0 (no budgets); derived total must render in the top card"}],"AB":[{"?":"lib/hooks/useBudget.ts","hooks under test through the view — adding a query here requires a matching repository mock"},{"?":"lib/db/repository.ts","mock surface must match the exported read function names"},{"?":"tests/categoryBudgetView.test.ts","stateful breakdown extension of this pattern"}],"E":[{"!!":"npm test -- tests/budgetView.test.ts","must pass before any BudgetView/useBudget change merges — and with ZERO unhandled errors in output"},{"?":"Empty state requires budgets resolving [] and a resolved total of 0"},{"?":"Derived total requires the ₱8,000.00 remaining text and an enabled Add breakdown button"}],"*":"Also asserts no rendered text leaks the legacy cat: prefix"} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const state = vi.hoisted(() => ({
  categories: [] as Array<Record<string, unknown>>,
  budgets: [] as Array<Record<string, unknown>>,
  spentByCategory: {} as Record<string, number>,
}));

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "u1" } }, loading: false, configError: null }),
}));

vi.mock("@/lib/db/repository", () => ({
  listCategories: vi.fn(async () => state.categories),
  getCategoryBudgets: vi.fn(async () => state.budgets),
  getMonthlySpentByCategory: vi.fn(async () => state.spentByCategory),
  deleteCategoryBudget: vi.fn(async () => {}),
  setCategoryBudget: vi.fn(async () => {}),
}));

import { BudgetView } from "@/components/budget/BudgetView";

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(createElement(QueryClientProvider, { client }, ui));
}

beforeEach(() => {
  state.categories = [];
  state.budgets = [];
  state.spentByCategory = {};
});

describe("BudgetView", () => {
  it("renders the empty state when no category budgets exist", async () => {
    renderWithQuery(createElement(BudgetView));
    expect(await screen.findByText("No budget yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add category breakdowns below to set your budget.")
    ).toBeInTheDocument();
  });

  it("shows derived total budget in top card when category budgets exist", async () => {
    state.budgets = [
      { id: "b1", categoryId: "c1", amount: 8000, createdAt: 1, updatedAt: 1 },
    ];
    state.categories = [
      { id: "c1", name: "Food", type: "expense", icon: null, color: null },
    ];
    renderWithQuery(createElement(BudgetView));
    expect(await screen.findByText("₱8,000.00")).toBeInTheDocument();
    expect(screen.getByText("remaining")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add breakdown" })).toBeEnabled();
    expect(document.body.textContent).not.toContain("cat:");
  });
});
