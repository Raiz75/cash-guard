"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useTransactions, useRecentTransactions } from "@/lib/hooks/useTransactions";
import { useCategories } from "@/lib/hooks/useTransactions";
import { formatPeso, monthRange } from "@/lib/format";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

  const { start, end } = monthRange();
  const periodIncome = all
    .filter((t) => t.type === "income" && t.date >= start && t.date <= end)
    .reduce((s, t) => s + t.amount, 0);
  const periodExpense = all
    .filter((t) => t.type === "expense" && t.date >= start && t.date <= end)
    .reduce((s, t) => s + t.amount, 0);

  const expenseByCategory = new Map<string, number>();
  for (const t of all) {
    if (t.type === "expense") {
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) ?? 0) + t.amount);
    }
  }
  const breakdown = [...expenseByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxExpense = breakdown.length ? breakdown[0][1] : 0;

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

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">This month income</p>
              <p className="text-base font-bold text-primary">{formatPeso(periodIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">This month expenses</p>
              <p className="text-base font-bold text-destructive">{formatPeso(periodExpense)}</p>
            </CardContent>
          </Card>
        </div>

        <Button render={<Link href="/transactions?add=1" />} nativeButton={false} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Add transaction
        </Button>

        {breakdown.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Spending by category</CardTitle>
              <CardDescription>All time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {breakdown.map(([name, amount]) => {
                const cat = categories.find((c) => c.name === name);
                const pct = maxExpense ? Math.round((amount / maxExpense) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <CategoryIcon name={cat?.icon ?? null} className="h-3.5 w-3.5 text-muted-foreground" />
                        {name}
                      </span>
                      <span>{formatPeso(amount)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat?.color ?? "var(--primary)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

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