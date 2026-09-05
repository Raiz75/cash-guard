/* AI-CONTEXT-NOTE:{"R":"Vitest unit tests for lib/budget.ts pure tier math (budgetTier/crossedTier/BUDGET_TIER_MESSAGES/budgetTierMessage) and both lib/validations/budget.ts schemas (budgetSchema, categoryBudgetSchema).","IDD":[{"?":"Pure modules tested directly with no DOM or Dexie mocks"},{"?":"Boundary cases sit exactly on 50/75/90/100 thresholds since tiers use inclusive lower bounds"},{"!!":"categoryBudgetSchema must reject blank category plus non-positive/NaN/blank-string amounts so the dialog shows friendly copy instead of saving junk"},{"?":"budgetSchema rejection cases assert the exact 'Budget must be greater than 0' message"}],"A":[{"!!!":"lib/budget.ts","CRITICAL":"threshold semantics changes break these boundary cases"},{"!!":"lib/validations/budget.ts","schema message/rejection changes break these cases"},{"?":"components/budget/tierStyles.ts","tier keys exercised here keep its Record keys honest"}],"AB":[{"?":"vitest","runner only — no DOM/db infra required"}],"E":[{"!!":"npm test -- tests/budget.test.ts","must pass before any budget math or schema change merges"},{"*":"it.each rows cover 0/-1 and blank-string/NaN rejections data-driven"}]} */
import { describe, it, expect } from "vitest";
import { budgetTier, crossedTier, budgetTierMessage, BUDGET_TIER_MESSAGES } from "@/lib/budget";
import { categoryBudgetSchema } from "@/lib/validations/budget";

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

describe("budgetTierMessage", () => {
  it("uses generic monthly copy without a label", () => {
    expect(budgetTierMessage("warn50")).toBe("You've used 50% of your monthly budget");
    expect(budgetTierMessage("warn90")).toBe("You've used 90% of your monthly budget");
    expect(budgetTierMessage("over")).toBe("You've exceeded your monthly budget");
  });

  it("interpolates the category label", () => {
    expect(budgetTierMessage("warn50", "Food")).toBe("You've used 50% of your Food budget");
    expect(budgetTierMessage("warn75", "Transport")).toBe("You've used 75% of your Transport budget");
    expect(budgetTierMessage("over", "Food")).toBe("You've exceeded your Food budget");
  });
});

describe("categoryBudgetSchema", () => {
  it("accepts a category pick with a positive amount", () => {
    expect(
      categoryBudgetSchema.safeParse({ categoryId: "c1", amount: 1500 }).success
    ).toBe(true);
    expect(categoryBudgetSchema.safeParse({ categoryId: "c1", amount: "1500" }).success).toBe(true);
  });

  it("rejects blank category and non-positive amounts", () => {
    expect(categoryBudgetSchema.safeParse({ categoryId: "", amount: 0 }).success).toBe(false);
    expect(categoryBudgetSchema.safeParse({ categoryId: "c1", amount: NaN }).success).toBe(false);
    expect(categoryBudgetSchema.safeParse({ categoryId: "c1", amount: "" }).success).toBe(false);
  });
});
