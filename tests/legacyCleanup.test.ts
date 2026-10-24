/* AI-CONTEXT-NOTE:{"R":"Tests lib/legacyCleanup.ts deleteLegacyDatabase resolves via indexedDB.deleteDatabase and tolerates missing indexedDB.","IDD":[{"?":"Stubs indexedDB.deleteDatabase with a request resolved on a microtask"},{"?":"Asserts the legacy DB name cash-guard is used"}],"A":[{"!!":"lib/legacyCleanup.ts","CRITICAL":"deleteLegacyDatabase contract"}],"AB":[{"?":"vitest happy-dom env","indexedDB availability"}],"E":[{"!!":"npm test -- tests/legacyCleanup.test.ts"}]} */
import { describe, it, expect, vi, afterEach } from "vitest";

import { deleteLegacyDatabase } from "@/lib/legacyCleanup";

describe("deleteLegacyDatabase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls indexedDB.deleteDatabase with cash-guard and resolves", async () => {
    const req: { onsuccess: (() => void) | null; onerror: (() => void) | null; onblocked: (() => void) | null } = {
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    const deleteDatabase = vi.fn(() => {
      queueMicrotask(() => {
        req.onsuccess?.();
      });
      return req;
    });
    vi.stubGlobal("indexedDB", { deleteDatabase });

    await expect(deleteLegacyDatabase()).resolves.toBeUndefined();
    expect(deleteDatabase).toHaveBeenCalledWith("cash-guard");
  });

  it("resolves without throwing when indexedDB is undefined", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(deleteLegacyDatabase()).resolves.toBeUndefined();
  });

  it("triggers deleteDatabase only once across repeated calls", async () => {
    const req: { onsuccess: (() => void) | null; onerror: (() => void) | null; onblocked: (() => void) | null } = {
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    const deleteDatabase = vi.fn(() => {
      queueMicrotask(() => {
        req.onsuccess?.();
      });
      return req;
    });
    vi.stubGlobal("indexedDB", { deleteDatabase });

    await deleteLegacyDatabase();
    await deleteLegacyDatabase();

    expect(deleteDatabase).toHaveBeenCalledTimes(1);
  });
});
