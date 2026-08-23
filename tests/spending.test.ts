/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/spending.ts — buildSpendingSlices descending sort with stored-color passthrough and --chart fallback token cycling, zero-total/empty-input guards, plus slicePercent share-of-total rounding with zero guard.","IDD":[{"?":"Pure module under test needs no mocks or DOM — functions imported directly"},{"?":"Fallback colors cycle var(--chart-1..5) by sorted index so the sixth uncategorized entry wraps back to chart-1"},{"?":"Category fixtures mirror lib/db/schema.ts Category (icon null allowed, color nullable)"}],"A":[{"!!!":"lib/spending.ts","CRITICAL":"SpendingSlice name/value/fill shape, sort order, and fill strings are asserted exactly — changes break this suite and DashboardView/SpendingDonut downstream"},{"?":"components/dashboard/DashboardView.tsx","consumes buildSpendingSlices/slicePercent rendered through SpendingDonut"}],"AB":[{"?":"lib/db/schema.ts","Category fixture type"},{"?":"vitest.config.mts","@/* alias must resolve for the import"}],"E":[{"!!!":"npm test -- tests/spending.test.ts","all four cases green"},{"!!":"Stored-color passthrough survives the descending sort (Food keeps #ff0000)"},{"!!":"Fallback token wraparound: index 5 resolves var(--chart-1), index 1 resolves var(--chart-2)"},{"?":"Zero-total entries and empty input return []"},{"*":"slicePercent: 25/100→25, 1/3→33 via Math.round, total 0→0"}]} */
import { describe, it, expect } from "vitest";
import { buildSpendingSlices, slicePercent } from "@/lib/spending";
import type { Category } from "@/lib/db/schema";

const cats: Category[] = [
  { id: "1", name: "Food", type: "expense", icon: null, color: "#ff0000" },
  { id: "2", name: "Transport", type: "expense", icon: null, color: null },
];

describe("buildSpendingSlices", () => {
  it("sorts high to low and passes stored colors through", () => {
    const slices = buildSpendingSlices([["Transport", 100], ["Food", 300]], cats);
    expect(slices.map((s) => s.name)).toEqual(["Food", "Transport"]);
    expect(slices[0].fill).toBe("#ff0000");
  });

  it("cycles chart tokens for missing colors", () => {
    const slices = buildSpendingSlices(
      [["Transport", 100], ["Other", 50], ["More", 25], ["Extra", 10], ["Yet", 5], ["Sixth", 1]],
      cats
    );
    expect(slices[1].fill).toBe("var(--chart-2)");
    expect(slices[5].fill).toBe("var(--chart-1)");
  });

  it("returns [] for zero totals and empty input", () => {
    expect(buildSpendingSlices([["Food", 0]], cats)).toEqual([]);
    expect(buildSpendingSlices([], cats)).toEqual([]);
  });
});

describe("slicePercent", () => {
  it("rounds share of total and guards zero", () => {
    expect(slicePercent(25, 100)).toBe(25);
    expect(slicePercent(1, 3)).toBe(33);
    expect(slicePercent(5, 0)).toBe(0);
  });
});
