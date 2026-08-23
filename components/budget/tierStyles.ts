/* AI-CONTEXT-NOTE:{"R":"Shared budget-tier visual maps (BAR_COLOR bar fill, HINT_COLOR hint classes, HINT_TEXT hint copy) keyed by BudgetTier, extracted from BudgetView for reuse across dashboard meter and category breakdowns.","IDD":[{"?":"Single source of truth for tier styling — extracted verbatim from BudgetView so its DOM test stays green with zero behavior change"},{"?":"Class strings are Tailwind literals (amber is a spec-approved exception outside semantic tokens)"},{"?":"Plain constants, no React — importable from server-free pure modules"}],"A":[{"!!":"components/budget/BudgetView.tsx","imports all three maps instead of local copies"},{"!":"Tasks 4-6 (dashboard donut/meter, category breakdowns)","consume these exact exports"}],"AB":[{"!!!":"lib/budget.ts","BudgetTier union keys these Records — adding/removing a tier breaks this file's typing"},{"?":"Tailwind theme tokens (bg-primary/bg-destructive/text-muted-foreground)","renames would silently drop styles"}],"E":[{"!!":"npm test -- tests/budgetView.test.ts","BudgetView renders identically via the shared maps"},{"*":"npm test -- tests/budget.test.ts","tier keys stay in sync with lib/budget.ts"},{"*":"Verify class strings byte-match the original BudgetView copies when refactoring"}]} */

import type { BudgetTier } from "@/lib/budget";

export const BAR_COLOR: Record<BudgetTier, string> = {
  ok: "bg-primary",
  warn50: "bg-primary",
  warn75: "bg-amber-500",
  warn90: "bg-destructive",
  over: "bg-destructive",
};

export const HINT_COLOR: Record<BudgetTier, string> = {
  ok: "text-muted-foreground",
  warn50: "text-muted-foreground",
  warn75: "text-amber-600 dark:text-amber-400",
  warn90: "font-medium text-destructive",
  over: "font-medium text-destructive",
};

export const HINT_TEXT: Record<BudgetTier, string> = {
  ok: "",
  warn50: "Halfway there — watch your spending.",
  warn75: "Getting close to your limit.",
  warn90: "Almost at your limit!",
  over: "You're over budget this month.",
};
