/* AI-CONTEXT-NOTE:{"R":"Donut rendering of spending slices via ChartContainer + Recharts PieChart with the peso total centered in the hole.","IDD":[{"?":"Fills precomputed per data row (SpendingSlice.fill) so rendering needs no per-slice config lookup"},{"?":"aspect-square + max-h keeps ResponsiveContainer measurable so the Pie receives real pixel dimensions"},{"?":"Center total is a pointer-events-none absolute overlay so it never blocks chart interaction"}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer — changing the props contract breaks the dashboard Spending by Category card"}],"AB":[{"!!!":"components/ui/chart.tsx","ChartContainer/ChartConfig exports come from the shadcn CLI-generated file — do not hand-edit; regeneration must keep these names"},{"?":"recharts v3","Pie/PieChart API (dataKey/nameKey, percentage radii, stroke on slices)"},{"?":"app/globals.css","var(--background) stroke and --chart fallback tokens must resolve"}],"E":[{"!!":"npm run build && npm run lint","types line up with ChartConfig satisfies clause"},{"?":"Single-slice ring renders a full circle without degenerate arcs"},{"*":"Overlay text stays centered over the donut hole at max-w-[240px]"}]} */
"use client";

import { Pie, PieChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatPeso } from "@/lib/format";
import type { SpendingSlice } from "@/lib/spending";

interface Props {
  slices: SpendingSlice[];
  total: number;
}

export function SpendingDonut({ slices, total }: Props) {
  const config = Object.fromEntries(
    slices.map((s) => [s.name, { label: s.name, color: s.fill }])
  ) satisfies ChartConfig;

  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <ChartContainer config={config} className="aspect-square max-h-[240px] w-full">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            strokeWidth={2}
            stroke="var(--background)"
          />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="text-sm font-semibold">{formatPeso(total)}</p>
      </div>
    </div>
  );
}
