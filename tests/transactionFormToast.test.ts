/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for components/transactions/TransactionForm.tsx budget-toast wiring — regression guard that one expense save fires BOTH the overall-budget warning toast and the labeled category-breakdown warning toast, and that warning-lookup failures never turn a successful save into an error toast.","IDD":[{"?":"Mocks ONLY module boundaries — sonner toast, @/lib/db/repository (six fns as vi.fn), and @/lib/hooks/useTransactions (useCategories) — so no Dexie/IndexedDB is ever touched"},{"?":"Uses vi.hoisted for the mock registry so vi.mock factory hoisting can reference them"},{"?":"Stateful getMonthlySpent/getMonthlySpentByCategory phase counters simulate before(400/200)→after(700/500) spend around a single save, driving overall 40%→70% (warn50) and Food category 40%→100% (over)"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"},{"!!":"Submits via fireEvent.submit(<form>) NOT button click — happy-dom does not perform implicit form submission on submit-button clicks, so a click never reaches RHF handleSubmit"}],"A":[{"!!":"components/transactions/TransactionForm.tsx","CRITICAL":"onSubmit snapshot/recompute ordering and toast copy — any reorder breaks the Nth-called assertions"},{"?":"lib/budget.ts","crossedTier thresholds and budgetTierMessage label interpolation define the expected strings"},{"?":"lib/db/repository.ts","export names must match the mock surface"}],"AB":[{"?":"tests/repository.test.ts","source of the repo's mock pattern"},{"?":"@testing-library/react + jest-dom","render/waitFor and matchers"},{"?":"vitest.config.mts","happy-dom environment required for fireEvent"}],"E":[{"!!!":"npm test -- tests/transactionFormToast.test.ts","both suites must pass before any TransactionForm toast change merges"},{"!!":"Warning order matters: overall toast must be Nth-called 1, category toast Nth-called 2"},{"*":"Rejection case asserts zero error AND zero warning toasts while success still fires"}]} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  getBudget: vi.fn(),
  getMonthlySpent: vi.fn(),
  getCategoryBudgets: vi.fn(),
  getMonthlySpentByCategory: vi.fn(),
  addTransaction: vi.fn(async () => ({})),
  updateTransaction: vi.fn(async () => {}),
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

vi.mock("@/lib/hooks/useTransactions", () => ({
  useCategories: () => [
    { id: "c1", name: "Food", type: "expense", icon: null, color: null },
    { id: "c2", name: "Salary", type: "income", icon: null, color: null },
  ],
}));

vi.mock("@/lib/db/repository", () => ({
  addTransaction: mocks.addTransaction,
  updateTransaction: mocks.updateTransaction,
  getBudget: mocks.getBudget,
  getMonthlySpent: mocks.getMonthlySpent,
  getCategoryBudgets: mocks.getCategoryBudgets,
  getMonthlySpentByCategory: mocks.getMonthlySpentByCategory,
}));

import { TransactionForm } from "@/components/transactions/TransactionForm";

beforeEach(() => {
  Object.values(mocks.toast).forEach((fn) => fn.mockReset());
  [mocks.getBudget, mocks.getMonthlySpent, mocks.getCategoryBudgets, mocks.getMonthlySpentByCategory].forEach((fn) => fn.mockReset());
  mocks.addTransaction.mockClear();

  mocks.getBudget.mockResolvedValue({ id: "overall", amount: 1000, createdAt: 1, updatedAt: 1 });
  mocks.getCategoryBudgets.mockResolvedValue([
    { id: "cat:c1", amount: 500, createdAt: 1, updatedAt: 1 },
  ]);
  let overallPhase = 0;
  mocks.getMonthlySpent.mockImplementation(async () => (overallPhase++ === 0 ? 400 : 700));
  let catPhase = 0;
  mocks.getMonthlySpentByCategory.mockImplementation(async () =>
    catPhase++ === 0 ? { Food: 200 } : { Food: 500 }
  );
});

describe("TransactionForm budget toasts", () => {
  it("fires overall and category threshold warnings on one save", async () => {
    const { container } = render(createElement(TransactionForm));

    fireEvent.change(screen.getByLabelText("Amount (₱)"), { target: { value: "300" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith("Transaction added");
    });
    await waitFor(() => {
      expect(mocks.toast.warning).toHaveBeenNthCalledWith(
        1,
        "You've used 50% of your monthly budget"
      );
      expect(mocks.toast.warning).toHaveBeenNthCalledWith(
        2,
        "You've exceeded your Food budget"
      );
    });
    expect(mocks.addTransaction).toHaveBeenCalledTimes(1);
  });

  it("keeps saves successful when warning lookups reject", async () => {
    mocks.getBudget.mockRejectedValue(new Error("boom"));
    mocks.getCategoryBudgets.mockRejectedValue(new Error("boom"));

    const { container } = render(createElement(TransactionForm));
    fireEvent.change(screen.getByLabelText("Amount (₱)"), { target: { value: "10" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith("Transaction added");
    });
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(mocks.toast.warning).not.toHaveBeenCalled();
  });
});
