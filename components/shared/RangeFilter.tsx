/* AI-CONTEXT-NOTE:{"R":"Four-button quick date-range selector with optional calendar popover for bydate/daterange modes.","IDD":[{"?":"Controlled component: value (DateFilter) + onChange, no internal state for filter itself"},{"?":"Auto-sets date/startDate+endDate when switching to bydate/daterange if not already set"},{"?":"Calendar uses react-day-picker modes: single for bydate, range for daterange"},{"?":"Popover from @base-ui/react/popover (shadcn base-maia wrapper)"}],"A":[{"?":"components/dashboard/DashboardView.tsx","spending breakdown range"},{"?":"components/transactions/TransactionFilters.tsx","filter range"}],"AB":[{"?":"lib/format.ts","DateFilter type"},{"?":"components/ui/calendar.tsx","Calendar component"},{"?":"components/ui/popover.tsx","Popover component"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify bydate shows single calendar and daterange shows range calendar"},{"?":"Verify auto-set date when switching modes"},{"*":"Date display text: single shows 'Sep 6, 2026', range shows 'Sep 6 – Sep 12, 2026'"}]} */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  toISODate,
  todayISO,
  formatDisplayDate,
  type DateFilter,
} from "@/lib/format";

const OPTIONS: { value: DateFilter["range"]; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "bydate", label: "By date" },
  { value: "daterange", label: "Date range" },
];

function toLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function RangeFilter({
  value,
  onChange,
}: {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = todayISO();

  const handleRangeChange = (range: DateFilter["range"]) => {
    if (range === "bydate" && !value.date) {
      onChange({ range, date: today });
      return;
    }
    if (range === "daterange" && !value.startDate) {
      onChange({ range, startDate: today, endDate: today });
      return;
    }
    onChange({ range, date: value.date, startDate: value.startDate, endDate: value.endDate });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1">
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="xs"
            variant={value.range === opt.value ? "default" : "outline"}
            className={cn(value.range !== opt.value && "text-muted-foreground")}
            onClick={() => handleRangeChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {value.range === "bydate" && (
        <div className="flex items-center">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left font-normal"
                />
              }
            >
              {value.date ? formatDisplayDate(value.date) : today}
            </PopoverTrigger>
            <PopoverContent align="start">
              <Calendar
                mode="single"
                selected={value.date ? toLocalDate(value.date) : undefined}
                onSelect={(day) => {
                  if (day) {
                    onChange({ range: "bydate", date: toISODate(day) });
                    setCalendarOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      {value.range === "daterange" && (
        <div className="flex items-center">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left font-normal"
                />
              }
            >
              {value.startDate && value.endDate
                ? `${formatDisplayDate(value.startDate)} – ${formatDisplayDate(value.endDate)}`
                : today}
            </PopoverTrigger>
            <PopoverContent align="start">
              <Calendar
                mode="range"
                selected={{
                  from: value.startDate ? toLocalDate(value.startDate) : undefined,
                  to: value.endDate ? toLocalDate(value.endDate) : undefined,
                }}
                onSelect={(range) => {
                  onChange({
                    range: "daterange",
                    startDate: range?.from ? toISODate(range.from) : undefined,
                    endDate: range?.to ? toISODate(range.to) : undefined,
                  });
                  if (range?.from && range?.to) {
                    setCalendarOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
