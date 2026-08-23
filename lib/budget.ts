/* AI-CONTEXT-NOTE:{"R":"Pure monthly-budget tier math — budgetTier maps spend vs limit to ok/warn50/warn75/warn90/over, crossedTier finds the highest newly-reached threshold, BUDGET_TIER_MESSAGES holds toast copy, budgetTierMessage renders generic or category-labeled warning copy.","IDD":[{"?":"Pure functions with no Dexie/React imports so Vitest covers boundary behavior without DOM or DB"},{"?":"Thresholds are inclusive lower bounds: 50/75/90/100 reached exactly counts as crossing"},{"?":"limit<=0 guards division by zero and reports ok"},{"?":"budgetTierMessage interpolates a category label but falls back to BUDGET_TIER_MESSAGES monthly copy when label is blank"}],"A":[{"!!!":"components/budget/BudgetView.tsx","bar color + hint text come from budgetTier"},{"!!":"components/budget/tierStyles.ts","keys BAR_COLOR/HINT_COLOR/HINT_TEXT off BudgetTier"},{"!!":"components/transactions/TransactionForm.tsx","overspend toast uses crossedTier + BUDGET_TIER_MESSAGES"},{"?":"Tasks 4-6 dashboard meter/category breakdowns","consume budgetTierMessage for per-category toasts"}],"AB":[{"?":"None — standalone pure module"}],"E":[{"!!!":"npm test -- tests/budget.test.ts","boundary cases exactly at 50/75/90/100 must pass; budgetTierMessage needs generic and label-interpolated cases green"},{"*":"Floating-point: 900/1000*100 may exceed 90 slightly — tiers tolerate it"},{"*":"Empty-string label must fall back to monthly copy"}]} */

export type BudgetTier = "ok" | "warn50" | "warn75" | "warn90" | "over";

export type WarningTier = Exclude<BudgetTier, "ok">;

export const BUDGET_THRESHOLDS = [
  { threshold: 50, tier: "warn50" },
  { threshold: 75, tier: "warn75" },
  { threshold: 90, tier: "warn90" },
  { threshold: 100, tier: "over" },
] as const satisfies ReadonlyArray<{ threshold: number; tier: WarningTier }>;

export const BUDGET_TIER_MESSAGES: Record<WarningTier, string> = {
  warn50: "You've used 50% of your monthly budget",
  warn75: "You've used 75% of your monthly budget",
  warn90: "You've used 90% of your monthly budget",
  over: "You've exceeded your monthly budget",
};

export function budgetTier(spent: number, limit: number): { pct: number; tier: BudgetTier } {
  if (limit <= 0) return { pct: 0, tier: "ok" };
  const pct = (spent / limit) * 100;
  let tier: BudgetTier = "ok";
  for (const { threshold, tier: next } of BUDGET_THRESHOLDS) {
    if (pct >= threshold) tier = next;
  }
  return { pct, tier };
}

export function crossedTier(beforePct: number, afterPct: number): WarningTier | null {
  for (let i = BUDGET_THRESHOLDS.length - 1; i >= 0; i--) {
    const { threshold, tier } = BUDGET_THRESHOLDS[i];
    if (beforePct < threshold && afterPct >= threshold) return tier;
  }
  return null;
}

export function budgetTierMessage(tier: WarningTier, label?: string): string {
  if (!label) return BUDGET_TIER_MESSAGES[tier];
  return tier === "over"
    ? `You've exceeded your ${label} budget`
    : `You've used ${BUDGET_THRESHOLDS.find((t) => t.tier === tier)!.threshold}% of your ${label} budget`;
}
