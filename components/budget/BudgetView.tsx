/* AI-CONTEXT-NOTE:{"R":"Budget screen (/budget) — shows remaining vs monthly limit with a tier-colored Progress bar, empty state, and a Breakdown card listing per-category budgets (spent-vs-allotted rows with tier hints, Edit/Remove actions) plus the set/edit BudgetDialog and CategoryBudgetDialog.","IDD":[{"?":"Shared shell: Header + centered max-w-md column + pb-20 + fixed BottomNav"},{"!!":"Tier visual maps live in components/budget/tierStyles.ts (BAR_COLOR/HINT_COLOR/HINT_TEXT) — extracted so dashboard meter and category breakdowns reuse the exact same classes; do not reintroduce local copies"},{"!!":"Three-state loading: budget undefined = query pending (Loading…), null = no row ('No budget yet' empty state), Budget = summary — loading = budget === undefined || spent === undefined, so !budget after load is always the empty state; Breakdown hint renders only when budget === null (never while undefined/loading)"},{"!!":"Add breakdown stays disabled until an overall budget exists (!budget || loading); breakdown rows join ids via parseCategoryBudgetId then sort by category name (localeCompare) before rendering; unknown ids are dropped"},{"?":"Two independent dialog states: dialogOpen drives BudgetDialog only (pre-existing Set/Edit budget flows); catDialogOpen drives CategoryBudgetDialog only (Add/Edit breakdown) — never share one open flag across two controlled dialogs or both mount open; editing distinguishes Add (Select free) from Edit (Select locked); dialog gets only unallocated expense categories since edit mode displays via watchCategory"}],"A":[{"!!!":"app/budget/page.tsx","renders this view"},{"!!":"components/budget/BudgetDialog.tsx","opened for set/edit overall budget"},{"!!":"components/budget/CategoryBudgetDialog.tsx","opened for add/edit breakdown"},{"?":"tests/budgetView.test.ts","asserts the empty state renders when no budget row exists"},{"?":"tests/categoryBudgetView.test.ts","asserts breakdown gating, row content, tier hint, Edit/Remove"}],"AB":[{"!!!":"components/budget/tierStyles.ts","supplies BAR_COLOR/HINT_COLOR/HINT_TEXT keyed by BudgetTier — class/copy changes here change what this screen renders"},{"?":"lib/hooks/useBudget.ts","all four hooks; useBudget's null/undefined contract drives the branches here"},{"?":"lib/hooks/useTransactions.ts","useCategories supplies names/icons for rows and unallocated options"},{"?":"lib/db/schema.ts","parseCategoryBudgetId + Category type"},{"?":"lib/db/repository.ts","deleteCategoryBudget for Remove"},{"?":"lib/budget.ts","budgetTier drives color/hint per row"},{"?":"lib/format.ts","formatPeso"},{"?":"components/shared (Header, BottomNav)","shell"},{"?":"components/ui/progress.tsx","indicatorClassName prop"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/budgetView.test.ts","empty state must be reachable on fresh installs (no budget row)"},{"!!":"npm test -- tests/categoryBudgetView.test.ts","breakdown gating + row rendering must stay green"},{"?":"Empty state before first budget ('Set a monthly budget first' only when budget===null, never while loading); rows sorted by category name; negative remaining renders via formatPeso"},{"*":"Over-budget shows destructive text and red bar; spent-by-category keys are category NAMES"}]} */

"use client";

import { useState } from "react";
import { IconPigMoney } from "@tabler/icons-react";

import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategoryBudgetDialog } from "@/components/budget/CategoryBudgetDialog";
import {
  useMonthlySpent,
  useCategoryBudgets,
  useMonthlySpentByCategory,
} from "@/lib/hooks/useBudget";
import { useCategories } from "@/lib/hooks/useTransactions";
import { parseCategoryBudgetId, type Category } from "@/lib/db/schema";
import { deleteCategoryBudget } from "@/lib/db/repository";
import { budgetTier } from "@/lib/budget";
import { BAR_COLOR, HINT_COLOR, HINT_TEXT } from "@/components/budget/tierStyles";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BudgetView() {
  const catBudgets = useCategoryBudgets();
  const spent = useMonthlySpent();
  const spentByCat = useMonthlySpentByCategory() ?? {};
  const allCategories = useCategories() ?? [];
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ categoryId: string; name: string } | null>(null);

  const monthLabel = new Date().toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const budgetAmount = catBudgets
    ? catBudgets.reduce((sum, b) => sum + b.amount, 0)
    : undefined;
  const budget = budgetAmount !== undefined && budgetAmount > 0
    ? { amount: budgetAmount }
    : null;
  const resolvedCatBudgets = catBudgets ?? [];

  const loading = budgetAmount === undefined || spent === undefined;

  const unallocated = allCategories.filter(
    (c) => c.type === "expense" && !resolvedCatBudgets.some((b) => parseCategoryBudgetId(b.id) === c.id)
  );

  const breakdownRows = resolvedCatBudgets
    .flatMap((b) => {
      const cat = allCategories.find((c) => c.id === parseCategoryBudgetId(b.id));
      return cat ? [{ b, cat }] : [];
    })
    .sort((a, z) => a.cat.name.localeCompare(z.cat.name));

  const remove = async (cat: Category) => {
    try {
      await deleteCategoryBudget(cat.id);
      toast.success(`${cat.name} budget removed`);
    } catch {
      toast.error("Could not remove the category budget");
    }
  };

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
                    Add category breakdowns below to set your budget.
                  </p>
                </div>
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
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Breakdown</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setEditing(null);
                setCatDialogOpen(true);
              }}
            >
              Add breakdown
            </Button>
          </CardHeader>
          <CardContent>
            {budget === null ? (
              <p className="text-xs text-muted-foreground">Add a category breakdown to get started.</p>
            ) : resolvedCatBudgets.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Add category budgets, e.g. Food ₱3,000.
              </p>
            ) : (
              <div className="space-y-3">
                {breakdownRows.map(({ b, cat }) => {
                  const spent = spentByCat[cat.name] ?? 0;
                  const { pct, tier } = budgetTier(spent, b.amount);
                  return (
                    <div key={b.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium">
                          <CategoryIcon name={cat.icon} className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums">
                          {formatPeso(spent)} of {formatPeso(b.amount)}
                        </span>
                      </div>
                      <Progress value={Math.min(pct, 100)} indicatorClassName={BAR_COLOR[tier]} />
                      <div className="flex items-center justify-between gap-2">
                        {HINT_TEXT[tier] ? (
                          <p className={cn("text-xs", HINT_COLOR[tier])}>{HINT_TEXT[tier]}</p>
                        ) : (
                          <span />
                        )}
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing({ categoryId: cat.id, name: cat.name });
                              setCatDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => remove(cat)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      <CategoryBudgetDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        categories={unallocated}
        editing={editing}
      />
    </div>
  );
}
