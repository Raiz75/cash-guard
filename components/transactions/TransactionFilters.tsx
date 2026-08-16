/* AI-CONTEXT-NOTE:{"R":"Search input + collapsible filter panel (range, type, category). Exports the Filters interface and the pure applyFilters() predicate used by TransactionsView.","IDD":[{"?":"Search stays visible; the IconFilter button toggles the panel. Button is 'default' when the panel is open OR any filter differs from its default"},{"?":"applyFilters is exported and kept pure so filtering is testable and memoizable"},{"?":"Category options render via CategoryIcon; type uses 'all' | TransactionType"}],"A":[{"!!!":"components/transactions/TransactionsView.tsx","CRITICAL":"consumes Filters and applyFilters — renaming fields or changing semantics breaks filtering"}],"AB":[{"?":"lib/hooks/useTransactions.ts","useCategories"},{"?":"lib/format.ts","rangeStartISO, DateRange"},{"?":"components/shared/RangeFilter.tsx and CategoryIcon.tsx","range select or category icon changes"},{"?":"lib/db/schema.ts","Transaction, TransactionType"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify search, range, type, and category filtering combine correctly"},{"*":"Base UI Select value/onValueChange are string | null — keep the 'all' guards"}]} */

"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { IconFilter } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCategories } from "@/lib/hooks/useTransactions";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { RangeFilter } from "@/components/shared/RangeFilter";
import { rangeStartISO, type DateRange } from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/db/schema";

export interface Filters {
  type: "all" | TransactionType;
  category: string;
  search: string;
  range: DateRange;
}

export function TransactionFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const categories = useCategories() ?? [];
  const [showFilters, setShowFilters] = useState(false);

  const filtersActive =
    filters.type !== "all" ||
    filters.category !== "all" ||
    filters.range !== "all";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <Button
          type="button"
          variant={showFilters || filtersActive ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters((s) => !s)}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
        >
          <IconFilter className="h-4 w-4" />
        </Button>
      </div>
      {showFilters ? (
        <div className="space-y-2">
          <RangeFilter
            value={filters.range}
            onChange={(range) => onChange({ ...filters, range })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filters.type}
              onValueChange={(v) => onChange({ ...filters, type: v as Filters["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.category ?? "all"}
              onValueChange={(v) => onChange({ ...filters, category: v ?? "all" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function applyFilters(
  transactions: Transaction[],
  filters: Filters
): Transaction[] {
  const q = filters.search.toLowerCase().trim();
  const rangeStart = filters.range === "all" ? null : rangeStartISO(filters.range);
  return transactions.filter((tx) => {
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.category !== "all" && tx.category !== filters.category) return false;
    if (rangeStart && tx.date < rangeStart) return false;
    if (q) {
      const haystack = `${tx.description ?? ""} ${tx.category}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}