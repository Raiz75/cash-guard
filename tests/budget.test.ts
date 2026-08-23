import { describe, it, expect } from "vitest";
import { budgetTier, crossedTier, BUDGET_TIER_MESSAGES } from "@/lib/budget";
import { budgetSchema } from "@/lib/validations/budget";

describe("budgetTier", () => {
  it("returns ok below 50%", () => {
    expect(budgetTier(0, 1000)).toEqual({ pct: 0, tier: "ok" });
    expect(budgetTier(100, 1000)).toEqual({ pct: 10, tier: "ok" });
    expect(budgetTier(499.99, 1000).tier).toBe("ok");
  });

  it("returns warn50 at exactly 50% up to just under 75%", () => {
    expect(budgetTier(500, 1000).tier).toBe("warn50");
    expect(budgetTier(600, 1000).tier).toBe("warn50");
    expect(budgetTier(749.99, 1000).tier).toBe("warn50");
  });

  it("returns warn75 at exactly 75% up to just under 90%", () => {
    expect(budgetTier(750, 1000).tier).toBe("warn75");
    expect(budgetTier(899.99, 1000).tier).toBe("warn75");
  });

  it("returns warn90 at exactly 90% up to just under 100%", () => {
    expect(budgetTier(900, 1000).tier).toBe("warn90");
    expect(budgetTier(999.99, 1000).tier).toBe("warn90");
  });

  it("returns over at exactly 100% and beyond", () => {
    expect(budgetTier(1000, 1000).tier).toBe("over");
    expect(budgetTier(1500, 1000)).toEqual({ pct: 150, tier: "over" });
  });

  it("guards against zero or negative limits", () => {
    expect(budgetTier(100, 0)).toEqual({ pct: 0, tier: "ok" });
    expect(budgetTier(100, -5)).toEqual({ pct: 0, tier: "ok" });
  });
});

describe("crossedTier", () => {
  it("returns the newly crossed tier", () => {
    expect(crossedTier(40, 55)).toBe("warn50");
    expect(crossedTier(60, 80)).toBe("warn75");
    expect(crossedTier(80, 95)).toBe("warn90");
    expect(crossedTier(95, 120)).toBe("over");
  });

  it("treats landing exactly on a threshold as crossing it", () => {
    expect(crossedTier(49.9, 50)).toBe("warn50");
    expect(crossedTier(74.9, 75)).toBe("warn75");
    expect(crossedTier(89.9, 90)).toBe("warn90");
    expect(crossedTier(99.9, 100)).toBe("over");
  });

  it("returns null when nothing new is crossed", () => {
    expect(crossedTier(10, 20)).toBeNull();
    expect(crossedTier(50, 60)).toBeNull();
    expect(crossedTier(20, 20)).toBeNull();
  });

  it("returns null when spend decreases", () => {
    expect(crossedTier(80, 40)).toBeNull();
  });

  it("returns the highest tier on a multi-tier jump", () => {
    expect(crossedTier(30, 96)).toBe("warn90");
    expect(crossedTier(10, 200)).toBe("over");
  });
});

describe("BUDGET_TIER_MESSAGES", () => {
  it("has a message for every warning tier", () => {
    expect(BUDGET_TIER_MESSAGES.warn50).toContain("50%");
    expect(BUDGET_TIER_MESSAGES.warn75).toContain("75%");
    expect(BUDGET_TIER_MESSAGES.warn90).toContain("90%");
    expect(BUDGET_TIER_MESSAGES.over).toContain("exceeded");
  });
});

describe("budgetSchema", () => {
  it("accepts a positive amount", () => {
    expect(budgetSchema.safeParse({ amount: 20000 }).success).toBe(true);
  });

  it("coerces numeric strings", () => {
    const parsed = budgetSchema.safeParse({ amount: "1500" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.amount).toBe(1500);
  });

  it.each([0, -1])("rejects non-positive amount %s", (amount) => {
    expect(budgetSchema.safeParse({ amount }).success).toBe(false);
  });

  it.each(["", Number.NaN])(
    "rejects blank/NaN amount %s with the friendly message",
    (amount) => {
      const parsed = budgetSchema.safeParse({ amount });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe(
          "Budget must be greater than 0"
        );
      }
    }
  );
});
