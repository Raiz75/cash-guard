/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for components/transactions/TransactionForm.tsx budget-toast wiring — regression guard that one expense save fires the category-breakdown warning toast, and that warning-lookup failures never turn a successful save into an error toast.","IDD":[{"?":"Mocks ONLY module boundaries — sonner toast, @/lib/db/repository (four fns as vi.fn), and @/lib/hooks/useTransactions (useCategories) — so no Dexie/IndexedDB is ever touched"},{"?":"Uses vi.hoisted for the mock registry so vi.mock factory hoisting can reference them"},{"?":"Stateful getMonthlySpentByCategory phase counters simulate before(200)→after(500) spend around a single save, driving Food category 40%→100% (over)"},{"?":"Uses React.createElement instead of JSX so the file stays .ts per repo test naming"},{"!!":"Submits via fireEvent.submit(<form>) NOT button click — happy-dom does not perform implicit form submission on submit-button clicks, so a click never reaches RHF handleSubmit"}],"A":[{"!!":"components/transactions/TransactionForm.tsx","CRITICAL":"onSubmit snapshot/recompute ordering and toast copy — any reorder breaks the Nth-called assertions"},{"?":"lib/budget.ts","crossedTier thresholds and budgetTierMessage label interpolation define the expected strings"},{"?":"lib/db/repository.ts","export names must match the mock surface"}],"AB":[{"?":"tests/repository.test.ts","source of the repo's mock pattern"},{"?":"@testing-library/react + jest-dom","render/waitFor and matchers"},{"?":"vitest.config.mts","happy-dom environment required for fireEvent"}],"E":[{"!!!":"npm test -- tests/transactionFormToast.test.ts","the suite must pass before any TransactionForm toast change merges"},{"!!":"Warning assertion: category toast must fire with the correct message"},{"*":"Rejection case asserts zero error AND zero warning toasts while success still fires"}]} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
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
  getCategoryBudgets: mocks.getCategoryBudgets,
  getMonthlySpentByCategory: mocks.getMonthlySpentByCategory,
}));

import { TransactionForm } from "@/components/transactions/TransactionForm";

beforeEach(() => {
  Object.values(mocks.toast).forEach((fn) => fn.mockReset());
  [mocks.getCategoryBudgets, mocks.getMonthlySpentByCategory].forEach((fn) => fn.mockReset());
  mocks.addTransaction.mockClear();

  mocks.getCategoryBudgets.mockResolvedValue([
    { id: "cat:c1", amount: 500, createdAt: 1, updatedAt: 1 },
  ]);
  let catPhase = 0;
  mocks.getMonthlySpentByCategory.mockImplementation(async () =>
    catPhase++ === 0 ? { Food: 200 } : { Food: 500 }
  );
});

describe("TransactionForm budget toasts", () => {
  it("fires category threshold warning on save", async () => {
    const { container } = render(createElement(TransactionForm));

    fireEvent.change(screen.getByLabelText("Amount (₱)"), { target: { value: "300" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mocks.toast.success).toHaveBeenCalledWith("Transaction added");
    });
    await waitFor(() => {
      expect(mocks.toast.warning).toHaveBeenCalledWith(
        "You've exceeded your Food budget"
      );
    });
    expect(mocks.addTransaction).toHaveBeenCalledTimes(1);
  });

  it("keeps saves successful when warning lookups reject", async () => {
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
