
import type { Category } from "@/lib/db/types";

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
