/* AI-CONTEXT-NOTE:{"R":"Four-button quick date-range selector (All time/Today/7 days/1 month).","IDD":[{"?":"Pure controlled component: value+onChange, no internal state"},{"?":"Options hardcoded to match the DateRange union in lib/format"}],"A":[{"?":"components/dashboard/DashboardView.tsx","spending breakdown range"},{"?":"components/transactions/TransactionFilters.tsx","filter range"}],"AB":[{"?":"lib/format.ts","DateRange type"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify all four ranges map to the correct labels and values"},{"*":"Adding a range requires updating DateRange+rangeStartISO too"}]} */

"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/format";

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "1m", label: "1 month" },
];

export function RangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="xs"
          variant={value === opt.value ? "default" : "outline"}
          className={cn(value !== opt.value && "text-muted-foreground")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
