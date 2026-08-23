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
