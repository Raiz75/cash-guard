/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/hooks/useTransactions.ts and lib/hooks/useBudget.ts — TanStack Query hooks exercised against mocked auth session and repository reads with a real QueryClient.","IDD":[{"?":"Mocks @/lib/auth/AuthProvider with a mutable session and every repository read with vi.fn; does not mock TanStack Query so real query behavior is exercised"},{"?":"Fresh QueryClient per renderHook with retry: false and gcTime: 0 to avoid cross-test cache leakage"},{"?":"Uses React.createElement and renderHook per repo conventions"},{"?":"Session-null case asserts repository functions are never called and hooks stay undefined"}],"A":[{"!!!":"lib/hooks/useTransactions.ts","CRITICAL":"useCategories, useTransactions, useRecentTransactions"},{"!!!":"lib/hooks/useBudget.ts","CRITICAL":"useTotalBudget, useMonthlySpent, useCategoryBudgets, useMonthlySpentByCategory"}],"AB":[{"?":"@tanstack/react-query","QueryClientProvider"},{"?":"@/lib/auth/AuthProvider","useAuth mock"},{"?":"@/lib/db/repository","read mocks"}],"E":[{"!!":"npm test -- tests/hooks.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"}]} */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authState = vi.hoisted(() => ({
  session: { user: { id: "u1" } } as { user: { id: string } } | null,
}));

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ session: authState.session, loading: false, configError: null }),
}));

const repoMocks = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listTransactions: vi.fn(),
  getCategoryBudgets: vi.fn(),
  getMonthlySpent: vi.fn(),
  getMonthlySpentByCategory: vi.fn(),
}));

vi.mock("@/lib/db/repository", () => repoMocks);

import {
  useCategories,
  useTransactions,
  useRecentTransactions,
} from "@/lib/hooks/useTransactions";
import {
  useTotalBudget,
  useMonthlySpent,
  useCategoryBudgets,
  useMonthlySpentByCategory,
} from "@/lib/hooks/useBudget";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  authState.session = { user: { id: "u1" } };
  Object.values(repoMocks).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset());
});

afterEach(() => {
  authState.session = { user: { id: "u1" } };
});

describe("useCategories", () => {
  it("returns all categories, and filters by type when given", async () => {
    repoMocks.listCategories.mockResolvedValue([
      { id: "1", name: "Food", type: "expense", icon: null, color: null },
      { id: "2", name: "Salary", type: "income", icon: null, color: null },
    ]);

    const { result: all } = renderHook(() => useCategories(), { wrapper: makeWrapper() });
    await waitFor(() => expect(all.current).toHaveLength(2));

    const { result: filtered } = renderHook(() => useCategories("expense"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(filtered.current).toHaveLength(1));
    expect(filtered.current?.[0].name).toBe("Food");
  });
});

describe("useTransactions", () => {
  it("returns the repository order", async () => {
    repoMocks.listTransactions.mockResolvedValue([
      { id: "a", createdAt: 1 },
      { id: "b", createdAt: 2 },
    ]);

    const { result } = renderHook(() => useTransactions(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current?.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("useRecentTransactions", () => {
  it("sorts by createdAt descending and slices to limit", async () => {
    repoMocks.listTransactions.mockResolvedValue([
      { id: "a", createdAt: 1 },
      { id: "b", createdAt: 3 },
      { id: "c", createdAt: 2 },
    ]);

    const { result } = renderHook(() => useRecentTransactions(2), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current?.map((t) => t.id)).toEqual(["b", "c"]);
  });
});

describe("useTotalBudget", () => {
  it("is undefined while pending and sums budgets when loaded", async () => {
    let resolve!: (value: unknown) => void;
    repoMocks.getCategoryBudgets.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    const { result } = renderHook(() => useTotalBudget(), { wrapper: makeWrapper() });
    expect(result.current).toBeUndefined();

    resolve([
      { id: "1", categoryId: "c1", amount: 100, createdAt: 1, updatedAt: 1 },
      { id: "2", categoryId: "c2", amount: 200, createdAt: 1, updatedAt: 1 },
    ]);
    await waitFor(() => expect(result.current).toBe(300));
  });

  it("returns 0 when loaded but empty", async () => {
    repoMocks.getCategoryBudgets.mockResolvedValue([]);
    const { result } = renderHook(() => useTotalBudget(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current).toBe(0));
  });
});

describe("useMonthlySpent", () => {
  it("returns the repository value", async () => {
    repoMocks.getMonthlySpent.mockResolvedValue(42);
    const { result } = renderHook(() => useMonthlySpent(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current).toBe(42));
  });
});

describe("useMonthlySpentByCategory", () => {
  it("returns the repository value", async () => {
    repoMocks.getMonthlySpentByCategory.mockResolvedValue({ Food: 42 });
    const { result } = renderHook(() => useMonthlySpentByCategory(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current).toEqual({ Food: 42 }));
  });
});

describe("useCategoryBudgets", () => {
  it("returns the repository value", async () => {
    repoMocks.getCategoryBudgets.mockResolvedValue([
      { id: "1", categoryId: "c1", amount: 100, createdAt: 1, updatedAt: 1 },
    ]);
    const { result } = renderHook(() => useCategoryBudgets(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current).toHaveLength(1));
  });
});

describe("session gating", () => {
  it("does not call repository functions and stays undefined when session is null", () => {
    authState.session = null;
    repoMocks.listCategories.mockResolvedValue([]);
    repoMocks.listTransactions.mockResolvedValue([]);
    repoMocks.getCategoryBudgets.mockResolvedValue([]);

    const { result: c } = renderHook(() => useCategories(), { wrapper: makeWrapper() });
    const { result: t } = renderHook(() => useTransactions(), { wrapper: makeWrapper() });
    const { result: b } = renderHook(() => useTotalBudget(), { wrapper: makeWrapper() });

    expect(c.current).toBeUndefined();
    expect(t.current).toBeUndefined();
    expect(b.current).toBeUndefined();
    expect(repoMocks.listCategories).not.toHaveBeenCalled();
    expect(repoMocks.listTransactions).not.toHaveBeenCalled();
    expect(repoMocks.getCategoryBudgets).not.toHaveBeenCalled();
  });
});