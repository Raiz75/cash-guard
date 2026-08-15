/**
 * FILE NAME: RangeFilter.tsx
 *
 * ROLE: Four-button quick date-range selector (All time / Today / 7 days / 1 month).
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Pure controlled component: value + onChange, no internal state.
 * ? - Options are hardcoded to match the DateRange union in lib/format.
 *
 * AFFECTS:
 * ? - components/dashboard/DashboardView.tsx (spending breakdown range)
 * ? - components/transactions/TransactionFilters.tsx (filter range)
 *
 * AFFECTED BY:
 * ? - lib/format.ts (DateRange type)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify all four ranges map to the correct labels and values
 * * - Adding a range requires updating DateRange + rangeStartISO too
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
