/* AI-CONTEXT-NOTE:{"R":"Pure slice builder for the dashboard spending donut — sorts expense-by-category entries descending and emits SpendingSlice rows with precomputed fills (stored category color or cycling --chart-1..5 fallback token), plus slicePercent share-of-total rounding.","IDD":[{"?":"Pure module with no React/Dexie imports so Vitest covers it without DOM or DB"},{"?":"Fills precomputed per data row (name/value/fill) so Recharts Pie renders without per-slice config lookups"},{"?":"Fallback colors cycle var(--chart-1..5) by sorted index so adjacent uncategorized slices differ"},{"?":"total<=0 returns [] so the caller renders its empty state instead of degenerate arcs"}],"A":[{"!!!":"components/dashboard/SpendingDonut.tsx","CRITICAL":"consumes SpendingSlice[] as Pie data — changing the shape breaks donut rendering"},{"!!":"components/dashboard/DashboardView.tsx","calls buildSpendingSlices([...expenseByCategory.entries()]) and slicePercent for legend percentages"},{"?":"tests/spending.test.ts","asserts exact sort order and fill strings"}],"AB":[{"?":"lib/db/schema.ts","Category.name/.color drive color pass-through"},{"?":"app/globals.css","--chart-1..5 tokens must exist for fallback fills to resolve"}],"E":[{"!!!":"npm test -- tests/spending.test.ts","sort order, stored-color passthrough, token cycling at index 5, zero-total and empty-input guards"},{"!!":"npm run build","types line up with recharts Pie dataKey/nameKey"},{"*":"slicePercent guards total<=0; Math.round(1/3*100)=33"}]} */
import type { Category } from "@/lib/db/schema";

export interface SpendingSlice {
  name: string;
  value: number;
  fill: string;
}

const FALLBACK_TOKENS = 5;

export function buildSpendingSlices(
  entries: Array<[string, number]>,
  categories: Category[]
): SpendingSlice[] {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return [];
  return sorted.map(([name, value], i) => {
    const cat = categories.find((c) => c.name === name);
    return {
      name,
      value,
      fill: cat?.color ?? `var(--chart-${(i % FALLBACK_TOKENS) + 1})`,
    };
  });
}

export function slicePercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
