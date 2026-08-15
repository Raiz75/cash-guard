/**
 * FILE NAME: DashboardView.tsx
 *
 * ROLE: Dashboard page — total balance, add-transaction shortcut, spending-by-category
 * breakdown with range filter, and recent transactions.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Registers the service worker (public/sw.js) in production only.
 * ? - Spending breakdown is computed client-side from useTransactions and filtered by
 *     rangeStartISO; bar colors use the category color or --primary fallback.
 * ? - Add-transaction button is a Link to "/transactions?add=1" via the Base UI
 *     Button render prop with nativeButton={false}.
 *
 * AFFECTS:
 * ? - app/page.tsx (rendered here)
 * ! - public/sw.js (CRITICAL: this file registers the service worker)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useTransactions.ts (useTransactions, useRecentTransactions, useCategories)
 * ? - lib/format.ts (formatPeso, rangeStartISO, DateRange)
 * ? - components/shared/ (Header, BottomNav, CategoryIcon, RangeFilter)
 * ? - lib/db/schema.ts (Transaction / Category types)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify SW registers only in production; breakdown math and bar widths correct
 * * - Recent-transactions list must handle an empty DB ("Add your first transaction")
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE,
 *   decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */

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
  const breakdown = [...expenseByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxExpense = breakdown.length ? breakdown[0][1] : 0;
  const totalSpent = [...expenseByCategory.values()].reduce((s, amount) => s + amount, 0);

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
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatPeso(totalSpent)}</span>
            </div>
          </CardHeader>
          <CardContent>
            {breakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No expenses in this period.</p>
            ) : (
              <div className="space-y-2.5">
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
              </div>
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