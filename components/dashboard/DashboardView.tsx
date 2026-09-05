/* AI-CONTEXT-NOTE:{"R":"Dashboard page with total balance, add-transaction shortcut, monthly budget meter plus spending donut with all-category legend under a range filter, and recent transactions.","IDD":[{"?":"Registers the service worker (public/sw.js) in production only"},{"?":"Budget indicator renders only once budget is non-null AND monthlySpent resolved (undefined means still loading); it always reports month-to-date spend even when the range filter reslices the chart"},{"?":"Slices come from buildSpendingSlices (descending sort, stored category color or cycling --chart fallback); legend lists ALL categories sorted desc, each row leading with a color dot matching its slice fill; card header has no Total row because the donut center shows the total — no top-5 cap"},{"?":"Add-transaction button is a Link to /transactions?add=1 via Base UI Button render prop with nativeButton=false"}],"A":[{"?":"app/page.tsx","rendered here"},{"!!!":"public/sw.js","CRITICAL":"this file registers the service worker"}],"AB":[{"?":"lib/hooks/useTransactions.ts","useTransactions, useRecentTransactions, useCategories"},{"?":"lib/hooks/useBudget.ts","useBudget, useMonthlySpent feed the budget meter"},{"?":"lib/budget.ts","budgetTier drives Progress tier coloring"},{"?":"components/budget/tierStyles.ts","BAR_COLOR keys off BudgetTier"},{"?":"lib/spending.ts","buildSpendingSlices/slicePercent shape the donut data and legend percentages"},{"?":"components/dashboard/SpendingDonut.tsx","renders slices with centered total"},{"?":"components/ui/progress.tsx","indicatorClassName support required for BAR_COLOR"},{"?":"lib/format.ts","formatPeso, rangeStartISO, DateRange"},{"?":"components/shared/","Header, BottomNav, CategoryIcon, RangeFilter"},{"?":"lib/db/schema.ts","Transaction/Category types"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/spending.test.ts","slice builder contract consumed here"},{"?":"Verify SW registers only in production; indicator hidden while budget/monthlySpent load; legend shows all categories sorted descending with correct percents"},{"*":"Recent-transactions list must handle an empty DB (Add your first transaction)"}]} */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useTransactions, useRecentTransactions } from "@/lib/hooks/useTransactions";
import { useCategories } from "@/lib/hooks/useTransactions";
import { formatPeso, rangeStartISO, type DateRange } from "@/lib/format";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { RangeFilter } from "@/components/shared/RangeFilter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCategoryBudgets, useMonthlySpent } from "@/lib/hooks/useBudget";
import { budgetTier } from "@/lib/budget";
import { BAR_COLOR } from "@/components/budget/tierStyles";
import { SpendingDonut } from "@/components/dashboard/SpendingDonut";
import { buildSpendingSlices, slicePercent } from "@/lib/spending";
import { Progress } from "@/components/ui/progress";

export function DashboardView() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const all = useTransactions() ?? [];
  const recent = useRecentTransactions(5) ?? [];
  const categories = useCategories() ?? [];

  const totalIncome = all.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = all.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const [range, setRange] = useState<DateRange>("all");
  const rangeStart = rangeStartISO(range);

  const expenseByCategory = new Map<string, number>();
  for (const t of all) {
    if (t.type === "expense" && (rangeStart === null || t.date >= rangeStart)) {
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) ?? 0) + t.amount);
    }
  }
  const totalSpent = [...expenseByCategory.values()].reduce((s, amount) => s + amount, 0);
  const catBudgets = useCategoryBudgets();
  const monthlySpent = useMonthlySpent();
  const budgetAmount = catBudgets
    ? catBudgets.reduce((sum, b) => sum + b.amount, 0)
    : undefined;
  const budget = budgetAmount !== undefined && budgetAmount > 0
    ? { amount: budgetAmount }
    : null;
  const slices = buildSpendingSlices([...expenseByCategory.entries()], categories);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-20">
      <Header title="Cash Guard" subtitle={new Date().toLocaleDateString("en-PH", { dateStyle: "long" })} />

      <main className="flex-1 space-y-4 px-4 pt-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="mt-1 text-3xl font-bold">{formatPeso(balance)}</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-semibold text-primary">{formatPeso(totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-semibold text-destructive">{formatPeso(totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button render={<Link href="/transactions?add=1" />} nativeButton={false} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Add transaction
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Spending by category</CardTitle>
            <RangeFilter value={range} onChange={setRange} />
          </CardHeader>
          <CardContent>
            {budget && monthlySpent !== undefined ? (
              (() => {
                const { pct, tier } = budgetTier(monthlySpent, budget.amount);
                return (
                  <div className="mb-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Monthly budget</span>
                      <span className="tabular-nums">
                        {formatPeso(monthlySpent)} of {formatPeso(budget.amount)} · {Math.round(pct)}% used
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} indicatorClassName={BAR_COLOR[tier]} />
                  </div>
                );
              })()
            ) : null}
            {slices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No expenses in this period.</p>
            ) : (
              <>
                <SpendingDonut slices={slices} total={totalSpent} />
                <div className="mt-4 space-y-2">
                  {slices.map((slice) => {
                    const cat = categories.find((c) => c.name === slice.name);
                    return (
                      <div key={slice.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex min-w-0 items-center gap-1 font-medium">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: slice.fill }}
                          />
                          <CategoryIcon name={cat?.icon ?? null} className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{slice.name}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatPeso(slice.value)} · {slicePercent(slice.value, totalSpent)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Recent transactions</CardTitle>
            <Button render={<Link href="/transactions" />} nativeButton={false} variant="ghost" size="sm" className="gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Add your first transaction to get started.
              </p>
            ) : (
              <div className="divide-y">
                {recent.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tx.description || tx.category}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        tx.type === "income" ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatPeso(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-2" />
      </main>

      <BottomNav />
    </div>
  );
}