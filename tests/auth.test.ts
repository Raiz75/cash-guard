/* AI-CONTEXT-NOTE:{"R":"Tests lib/auth/AuthProvider.tsx, components/auth/AuthGate.tsx, components/auth/AuthScreen.tsx.","IDD":[{"?":"Mocks @/lib/supabase/client and @/lib/legacyCleanup"},{"?":"Captures onAuthStateChange callback to simulate SIGNED_OUT"}],"A":[{"!!":"lib/auth/AuthProvider.tsx","CRITICAL":"auth context"},{"!!":"components/auth/AuthGate.tsx","CRITICAL":"gate"},{"!!":"components/auth/AuthScreen.tsx","CRITICAL":"auth form"}],"AB":[{"?":"@tanstack/react-query","QueryClientProvider"}],"E":[{"!!":"npm test -- tests/auth.test.ts"}]} */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => {
  const supabase = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  };
  return {
    getSupabase: vi.fn(() => supabase),
    deleteLegacyDatabase: vi.fn(async () => {}),
    supabase,
    authCallback: null as ((event: string, session: unknown) => void) | null,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: mocks.getSupabase,
}));

vi.mock("@/lib/legacyCleanup", () => ({
  deleteLegacyDatabase: mocks.deleteLegacyDatabase,
}));

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { AuthScreen } from "@/components/auth/AuthScreen";

function wrap(children: ReactNode, qc?: QueryClient) {
  const client = qc ?? new QueryClient();
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuthProvider, null, children)
    )
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authCallback = null;
  mocks.getSupabase.mockImplementation(() => mocks.supabase);
  mocks.supabase.auth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
    mocks.authCallback = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
});

describe("AuthProvider/AuthGate", () => {
  it("renders the auth screen when getSession resolves null", async () => {
    mocks.supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    wrap(createElement(AuthGate, null, createElement("div", null, "Dashboard content")));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Sign in" })).toBeInTheDocument();
    });
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
    expect(mocks.deleteLegacyDatabase).toHaveBeenCalledTimes(1);
  });

  it("renders children when getSession resolves a session", async () => {
    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });

    wrap(createElement(AuthGate, null, createElement("div", null, "Dashboard content")));

    await waitFor(() => {
      expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    });
  });

  it("shows Loading before resolution", () => {
    mocks.supabase.auth.getSession.mockReturnValue(new Promise(() => {}));

    wrap(createElement(AuthGate, null, createElement("div", null, "Dashboard content")));

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders the config message when getSupabase throws", async () => {
    mocks.getSupabase.mockImplementation(() => {
      throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    });

    wrap(createElement(AuthGate, null, createElement("div", null, "Dashboard content")));

    await waitFor(() => {
      expect(
        screen.getByText(/Supabase is not configured/)
      ).toBeInTheDocument();
    });
  });

  it("clears the query cache and returns to auth screen on SIGNED_OUT", async () => {
    const qc = new QueryClient();
    const clearSpy = vi.spyOn(qc, "clear");

    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });

    wrap(
      createElement(AuthGate, null, createElement("div", null, "Dashboard content")),
      qc
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    });

    act(() => {
      mocks.authCallback?.("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Sign in" })).toBeInTheDocument();
    });
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("AuthScreen", () => {
  it("shows an alert on sign-in error", async () => {
    mocks.supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const qc = new QueryClient();
    render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(AuthScreen)
      )
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid login credentials"
      );
    });
  });

  it("shows an alert on sign-up error", async () => {
    mocks.supabase.auth.signUp.mockResolvedValue({
      error: { message: "Sign up failed" },
    });

    const qc = new QueryClient();
    render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(AuthScreen)
      )
    );

    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Sign up failed");
    });
  });

  it("shows the check-email notice on sign-up without a session", async () => {
    mocks.supabase.auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const qc = new QueryClient();
    render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(AuthScreen)
      )
    );

    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Check your email to confirm your account")
      ).toBeInTheDocument();
    });
  });
});

describe("AuthProvider StrictMode safety", () => {
  it("does not subscribe or set state when unmounted before getSession resolves", async () => {
    let resolveSession: ((value: unknown) => void) | undefined;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });
    mocks.supabase.auth.getSession.mockReturnValue(sessionPromise);
    mocks.supabase.auth.onAuthStateChange.mockClear();

    const { unmount } = wrap(
      createElement(AuthGate, null, createElement("div", null, "Dashboard content"))
    );

    unmount();
    resolveSession?.({ data: { session: { user: { id: "u1" } } } });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.supabase.auth.onAuthStateChange).not.toHaveBeenCalled();
  });

  it("clears the cache when switching from one non-null user to another", async () => {
    const qc = new QueryClient();
    const clearSpy = vi.spyOn(qc, "clear");

    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });

    wrap(
      createElement(AuthGate, null, createElement("div", null, "Dashboard content")),
      qc
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    });

    qc.setQueryData(["transactions"], [{ id: "t1" }]);

    act(() => {
      mocks.authCallback?.("SIGNED_IN", { user: { id: "u2" } });
    });

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalled();
    });
    expect(qc.getQueryData(["transactions"])).toBeUndefined();
  });

  it("does not clear the cache when the auth callback fires after unmount", async () => {
    const qc = new QueryClient();
    const clearSpy = vi.spyOn(qc, "clear");

    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });

    const { unmount } = wrap(
      createElement(AuthGate, null, createElement("div", null, "Dashboard content")),
      qc
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    });

    const callback = mocks.authCallback;
    unmount();

    act(() => {
      callback?.("SIGNED_IN", { user: { id: "u2" } });
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(clearSpy).not.toHaveBeenCalled();
  });
});
