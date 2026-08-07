"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCategories } from "@/lib/hooks/useTransactions";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import type { Transaction, TransactionType } from "@/lib/db/schema";

export interface Filters {
  type: "all" | TransactionType;
  category: string;
  search: string;
}

export function TransactionFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const categories = useCategories() ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search transactions..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
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
  );
}

export function applyFilters(
  transactions: Transaction[],
  filters: Filters
): Transaction[] {
  const q = filters.search.toLowerCase().trim();
  return transactions.filter((tx) => {
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.category !== "all" && tx.category !== filters.category) return false;
    if (q) {
      const haystack = `${tx.description ?? ""} ${tx.category}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}