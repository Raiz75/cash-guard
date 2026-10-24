/* AI-CONTEXT-NOTE:{"R":"Tests components/shared/OfflineBanner.tsx online/offline toggling via window events.","IDD":[{"?":"Mutable navigator.onLine getter drives useSyncExternalStore snapshot"}],"A":[{"!!":"components/shared/OfflineBanner.tsx","CRITICAL":"banner copy and role"}],"AB":[{"?":"vitest happy-dom env","window events"}],"E":[{"!!":"npm test -- tests/offline.test.ts"}]} */
import { describe, it, expect, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, act } from "@testing-library/react";

import { OfflineBanner } from "@/components/shared/OfflineBanner";

describe("OfflineBanner", () => {
  let onLine = true;

  beforeEach(() => {
    onLine = true;
    Object.defineProperty(navigator, "onLine", {
      get: () => onLine,
      configurable: true,
    });
  });

  it("renders nothing while online", () => {
    render(createElement(OfflineBanner));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the offline banner after an offline event", () => {
    render(createElement(OfflineBanner));
    act(() => {
      onLine = false;
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're offline. Reconnect to continue."
    );
  });

  it("hides the banner after coming back online", () => {
    render(createElement(OfflineBanner));
    act(() => {
      onLine = false;
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      onLine = true;
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});