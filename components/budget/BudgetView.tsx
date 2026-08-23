/* AI-CONTEXT-NOTE:{"R":"Budget screen (/budget) — shows remaining vs monthly limit with a tier-colored Progress bar, empty state, and the set/edit BudgetDialog.","IDD":[{"?":"Shared shell: Header + centered max-w-md column + pb-20 + fixed BottomNav"},{"?":"Bar color by tier: primary below 75%, amber-500 75-89%, destructive >=90 (spec-approved exception)"},{"!!":"Three-state loading: budget undefined = query pending (Loading…), null = no row ('No budget yet' empty state), Budget = summary — loading = budget === undefined || spent === undefined, so !budget after load is always the empty state"}],"A":[{"!!!":"app/budget/page.tsx","renders this view"},{"!!":"components/budget/BudgetDialog.tsx","opened for set/edit"},{"?":"tests/budgetView.test.ts","asserts the empty state renders when no budget row exists"}],"AB":[{"?":"lib/hooks/useBudget.ts","useBudget + useMonthlySpent; useBudget's null/undefined contract drives the branches here"},{"?":"lib/budget.ts","budgetTier drives color/hint"},{"?":"lib/format.ts","formatPeso"},{"?":"components/shared (Header, BottomNav)","shell"},{"?":"components/ui/progress.tsx","indicatorClassName prop"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/budgetView.test.ts","empty state must be reachable on fresh installs (no budget row)"},{"?":"Empty state before first budget; negative remaining renders via formatPeso"},{"*":"Over-budget shows destructive text and red bar"}]} */

"use client";

import { useState } from "react";
import { IconPigMoney } from "@tabler/icons-react";

import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BudgetDialog } from "@/components/budget/BudgetDialog";
import { useBudget, useMonthlySpent } from "@/lib/hooks/useBudget";
import { budgetTier, type BudgetTier } from "@/lib/budget";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";

const BAR_COLOR: Record<BudgetTier, string> = {
  ok: "bg-primary",
  warn50: "bg-primary",
  warn75: "bg-amber-500",
  warn90: "bg-destructive",
  over: "bg-destructive",
};

const HINT_COLOR: Record<BudgetTier, string> = {
  ok: "text-muted-foreground",
  warn50: "text-muted-foreground",
  warn75: "text-amber-600 dark:text-amber-400",
  warn90: "font-medium text-destructive",
  over: "font-medium text-destructive",
};

const HINT_TEXT: Record<BudgetTier, string> = {
  ok: "",
  warn50: "Halfway there — watch your spending.",
  warn75: "Getting close to your limit.",
  warn90: "Almost at your limit!",
  over: "You're over budget this month.",
};

export function BudgetView() {
  const budget = useBudget();
  const spent = useMonthlySpent();
  const [dialogOpen, setDialogOpen] = useState(false);

  const monthLabel = new Date().toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const loading = budget === undefined || spent === undefined;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-20">
      <Header title="Budget" subtitle={monthLabel} />

      <main className="flex-1 space-y-4 px-4 pt-4">
        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : !budget ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <IconPigMoney className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No budget yet</p>
                  <p className="text-sm text-muted-foreground">
                    Set a monthly spending limit to track what&apos;s left to spend.
                  </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  Set monthly budget
                </Button>
              </div>
            ) : (
              (() => {
                const limit = budget.amount;
                const { pct, tier } = budgetTier(spent!, limit);
                const remaining = limit - spent!;
                return (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-2xl font-semibold">
                        {formatPeso(remaining)}
                      </p>
                      <p className="text-xs text-muted-foreground">remaining</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPeso(spent!)} spent of {formatPeso(limit)}
                    </p>
                    <Progress
                      value={Math.min(pct, 100)}
                      indicatorClassName={BAR_COLOR[tier]}
                    />
                    <div className="flex items-center justify-between gap-2">
                      {HINT_TEXT[tier] ? (
                        <p className={cn("text-xs", HINT_COLOR[tier])}>
                          {HINT_TEXT[tier]}
                        </p>
                      ) : (
                        <span />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogOpen(true)}
                      >
                        Edit budget
                      </Button>
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={budget?.amount}
      />
    </div>
  );
}
