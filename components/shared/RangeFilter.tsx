/* AI-CONTEXT-NOTE:{"R":"Four-button quick date-range selector with calendar popover for bydate (single calendar, opens on button click) and daterange (two side-by-side calendars for from/to dates).","IDD":[{"?":"Controlled component: value (DateFilter) + onChange, no internal state for filter itself"},{"?":"Auto-sets date/startDate+endDate when switching to bydate/daterange if not already set"},{"?":"bydate: calendar opens immediately when the By date button is clicked, user picks a date, popover closes"},{"?":"daterange: two side-by-side calendars, one for from date and one for to date, no auto-close"},{"?":"Popover from @base-ui/react/popover (shadcn base-maia wrapper)"}],"A":[{"?":"components/dashboard/DashboardView.tsx","spending breakdown range"},{"?":"components/transactions/TransactionFilters.tsx","filter range"}],"AB":[{"?":"lib/format.ts","DateFilter type"},{"?":"components/ui/calendar.tsx","Calendar component"},{"?":"components/ui/popover.tsx","Popover component"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify bydate opens calendar on button click"},{"?":"Verify daterange shows two side-by-side calendars"},{"?":"Verify auto-set date when switching modes"},{"*":"Date display text: single shows 'Sep 6, 2026', range shows 'Sep 6 – Sep 12, 2026'"}]} */

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
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const today = todayISO();

  const handleRangeChange = (range: DateFilter["range"]) => {
    if (range === "bydate") {
      if (!value.date) {
        onChange({ range, date: today });
      } else {
        onChange({ range, date: value.date });
      }
      setFromOpen(true);
      return;
    }
    if (range === "daterange") {
      if (!value.startDate) {
        onChange({ range, startDate: today, endDate: today });
      } else {
        onChange({ range, startDate: value.startDate, endDate: value.endDate });
      }
      return;
    }
    onChange({ range });
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
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
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
                    setFromOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      {value.range === "daterange" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <Popover open={fromOpen} onOpenChange={setFromOpen}>
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
                {value.startDate ? formatDisplayDate(value.startDate) : today}
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  selected={value.startDate ? toLocalDate(value.startDate) : undefined}
                  onSelect={(day) => {
                    if (day) {
                      const start = toISODate(day);
                      const end = value.endDate ?? start;
                      onChange({
                        range: "daterange",
                        startDate: start,
                        endDate: start > end ? start : end,
                      });
                      setFromOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">To</p>
            <Popover open={toOpen} onOpenChange={setToOpen}>
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
                {value.endDate ? formatDisplayDate(value.endDate) : today}
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  selected={value.endDate ? toLocalDate(value.endDate) : undefined}
                  onSelect={(day) => {
                    if (day) {
                      const end = toISODate(day);
                      const start = value.startDate ?? end;
                      onChange({
                        range: "daterange",
                        startDate: start > end ? end : start,
                        endDate: end,
                      });
                      setToOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
}
