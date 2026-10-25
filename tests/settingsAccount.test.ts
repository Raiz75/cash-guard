/* AI-CONTEXT-NOTE:{"R":"Vitest DOM test for components/settings/SettingsView.tsx — account card email + sign-out, and id-based delete count.","IDD":[{"?":"Mocks auth, supabase client, hooks, and repository at module boundaries; no IndexedDB touched"},{"?":"Wraps render in a fresh QueryClientProvider with retry:false"},{"?":"Uses React.createElement instead of JSX so the file stays .ts"}],"A":[{"!!":"components/settings/SettingsView.tsx","CRITICAL":"account card and id-based openDelete"}],"AB":[{"?":"@testing-library/react + jest-dom","render/waitFor/matchers"},{"?":"@tanstack/react-query","QueryClientProvider"}],"E":[{"!!":"npm test -- tests/settingsAccount.test.ts"},{"?":"Account card shows the signed-in email"},{"?":"Sign out calls getSupabase().auth.signOut"},{"?":"Delete button for Food calls transactionCountForCategory with 'c1'"}]} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => {
  const signOut = vi.fn(async () => ({}));
  const transactionCountForCategory = vi.fn(async () => 0);
  return {
    signOut,
    transactionCountForCategory,
    addCategory: vi.fn(async () => ({})),
    exportData: vi.fn(async () => ({ transactions: [], categories: [] })),
    importTransactions: vi.fn(async () => ({ imported: 0, skipped: 0, createdCategories: [] })),
  };
});

vi.mock("@/lib/hooks/useTransactions", () => ({
  useCategories: () => [
    { id: "c1", name: "Food", type: "expense", icon: null, color: null },
  ],
}));

vi.mock("@/lib/hooks/useServiceWorkerUpdate", () => ({
  useServiceWorkerUpdate: () => ({
    status: "idle",
    checkForUpdates: vi.fn(),
    applyUpdate: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { email: "a@b.com", id: "u1" } }, loading: false, configError: null }),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ auth: { signOut: mocks.signOut } }),
}));

vi.mock("@/lib/db/repository", () => ({
  addCategory: mocks.addCategory,
  exportData: mocks.exportData,
  importTransactions: mocks.importTransactions,
  transactionCountForCategory: mocks.transactionCountForCategory,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { SettingsView } from "@/components/settings/SettingsView";

function renderWithQuery(ui: ReturnType<typeof createElement>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(createElement(QueryClientProvider, { client }, ui));
}

beforeEach(() => {
  mocks.signOut.mockClear();
  mocks.transactionCountForCategory.mockClear();
  mocks.addCategory.mockClear();
  mocks.exportData.mockClear();
  mocks.importTransactions.mockClear();
});

describe("SettingsView account", () => {
  it("shows the signed-in email in the account card", async () => {
    renderWithQuery(createElement(SettingsView));
    expect(await screen.findByText("a@b.com")).toBeInTheDocument();
  });

  it("calls signOut when the Sign out button is clicked", async () => {
    renderWithQuery(createElement(SettingsView));
    fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalled();
    });
  });

  it("calls transactionCountForCategory with the category id when deleting", async () => {
    renderWithQuery(createElement(SettingsView));
    fireEvent.click(screen.getByRole("button", { name: "Delete Food" }));
    await waitFor(() => {
      expect(mocks.transactionCountForCategory).toHaveBeenCalledWith("c1");
    });
  });
});