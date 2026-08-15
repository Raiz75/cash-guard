# Export Filename, Transaction Icons, Collapsible Filters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make three small UI changes: dated CSV export filename, icon-based edit/delete on transaction rows, and a collapsible filter panel on the Transactions page.

**Architecture:** All three changes are client-component edits in the existing cash-guard app. No data model, hook, or filter-logic changes. Task 1 is a one-line filename change in `SettingsView.tsx`. Task 2 restyles transaction row actions to match category rows. Task 3 wraps existing filter controls in a `useState`-driven show/hide panel.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Base UI (`components/ui/button.tsx`), Tabler icons (`@tabler/icons-react`), lucide-react (already used for `Search`).

## Global Constraints

- Node ≥ 20.9 required; this machine's system Node is 18 — use `~/.local/node/bin` (user-local Node 22) for all npm commands.
- Use Tabler icons (`@tabler/icons-react`) for new UI icons, not lucide.
- Use semantic color tokens only (`--primary`, `--destructive`); never hardcode `green-600`/`red-600`.
- Base UI `Button` polymorphism is via the `render` prop; if rendering a non-`<button>` element, set `nativeButton={false}`. Not used here — all buttons stay real `<button>`s.
- No comments in code unless asked.
- Verification: `npm run build` and `npm run lint` must both pass after each task.
- Commit after each task; this repo is on `main` with conventional commit messages (e.g. `feat:`, `fix:`, `docs:`).

---

### Task 1: Dated CSV export filename

**Files:**
- Modify: `components/settings/SettingsView.tsx:17` (import line) and `:102` (filename argument)

**Interfaces:**
- Consumes: `todayISO()` from `@/lib/format` (already exported — `lib/format.ts:18`).
- Produces: downloaded file named `cash-guard-transactions-YYYY-MM-DD.csv`.

- [ ] **Step 1: Update the import from `@/lib/format`**

In `components/settings/SettingsView.tsx:17`, change:

```ts
import { downloadFile } from "@/lib/format";
```

to:

```ts
import { downloadFile, todayISO } from "@/lib/format";
```

- [ ] **Step 2: Use the date in the download filename**

In `components/settings/SettingsView.tsx:102`, change:

```ts
downloadFile("cash-guard-transactions.csv", csv, "text/csv;charset=utf-8");
```

to:

```ts
downloadFile(`cash-guard-transactions-${todayISO()}.csv`, csv, "text/csv;charset=utf-8");
```

- [ ] **Step 3: Run lint and build**

Run: `& "$HOME\.local\node\bin\npm.cmd" run lint`
Expected: exits clean, no errors. The unused-import lint (`downloadFile` is still used) and type check pass.

Run: `& "$HOME\.local\node\bin\npm.cmd" run build`
Expected: production build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/settings/SettingsView.tsx
git commit -m "feat: include export date in CSV filename"
```

---

### Task 2: Icon edit/delete buttons on transaction rows

**Files:**
- Modify: `components/transactions/TransactionList.tsx:4` (imports) and `:36-51` (action area)

**Interfaces:**
- Consumes: `onEdit: (tx: Transaction) => void` and `onDelete: (tx: Transaction) => void` props on `TransactionItem` — unchanged signatures, wired up in `TransactionsView.tsx:79-83`.
- Produces: the same `onEdit`/`onDelete` callbacks, now triggered by icon buttons.
- `Button` with `variant="ghost"` and `size="icon-xs"` exists in `components/ui/button.tsx` (line 17, 29).

- [ ] **Step 1: Swap the badge buttons for icon buttons**

Replace the imports block at `components/transactions/TransactionList.tsx:3-5`:

```ts
import { cn } from "@/lib/utils";
import { formatPeso, formatDisplayDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/lib/db/schema";
```

with:

```ts
import { cn } from "@/lib/utils";
import { formatPeso, formatDisplayDate } from "@/lib/format";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/lib/db/schema";
```

Then replace the action area in `TransactionItem` (`components/transactions/TransactionList.tsx:36-51`):

```tsx
      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-sm font-semibold ${income ? "text-primary" : "text-destructive"}`}>
          {income ? "+" : "-"}
          {formatPeso(tx.amount)}
        </span>
        <Badge
          variant="outline"
          className="cursor-pointer text-xs"
          onClick={() => onEdit(tx)}
        >
          Edit
        </Badge>
        <Badge variant="destructive" className="cursor-pointer text-xs" onClick={() => onDelete(tx)}>
          Del
        </Badge>
      </div>
```

with:

```tsx
      <div className="flex shrink-0 items-center gap-1">
        <span className={`text-sm font-semibold ${income ? "text-primary" : "text-destructive"}`}>
          {income ? "+" : "-"}
          {formatPeso(tx.amount)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(tx)}
          aria-label={`Edit ${tx.description || tx.category}`}
        >
          <IconPencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(tx)}
          aria-label={`Delete ${tx.description || tx.category}`}
        >
          <IconTrash className="h-3.5 w-3.5" />
        </Button>
      </div>
```

- [ ] **Step 2: Run lint and build**

Run: `& "$HOME\.local\node\bin\npm.cmd" run lint`
Expected: clean — confirms `Badge` import is fully removed (otherwise `@typescript-eslint/no-unused-vars` fires).

Run: `& "$HOME\.local\node\bin\npm.cmd" run build`
Expected: production build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/transactions/TransactionList.tsx
git commit -m "feat: use icon buttons for editing and deleting transactions"
```

---

### Task 3: Collapsible filters behind a filter icon

**Files:**
- Modify: `components/transactions/TransactionFilters.tsx` (whole component body, `:1-85`)

**Interfaces:**
- Consumes: `Filters` interface and `applyFilters` — unchanged, already consumed by `TransactionsView.tsx` (`Filters` import line 15, `applyFilters` line 43).
- Produces: same `TransactionFilters` props API `{ filters: Filters; onChange: (filters: Filters) => void }`.
- `Button` variants `default` / `outline` and `size="icon"` exist in `components/ui/button.tsx` (line 11-12, 28).
- `IconFilter` is a valid `@tabler/icons-react` export (same package already used for `IconPencil`/`IconTrash` in Task 2).

- [ ] **Step 1: Rewrite `TransactionFilters` to add the toggle panel**

Replace the entire content of `components/transactions/TransactionFilters.tsx` between the `"use client";` directive and the `applyFilters` export with the following (imports + component). Keep the existing `Filters` interface and `applyFilters` function exactly as they are.

```tsx
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
```

Notes for the implementer:
- The `applyFilters` function below the component stays byte-for-byte identical.
- The `Filters` interface stays byte-for-byte identical.
- The type/category/range controls are exactly the controls that existed before, only moved inside the `{showFilters ? (...) : null}` block so the panel is collapsed by default.

- [ ] **Step 2: Run lint and build**

Run: `& "$HOME\.local\node\bin\npm.cmd" run lint`
Expected: clean (confirms no unused imports remain — `useState` and `IconFilter` are used, nothing else added).

Run: `& "$HOME\.local\node\bin\npm.cmd" run build`
Expected: production build succeeds.

- [ ] **Step 3: Manual sanity check**

Run: `& "$HOME\.local\node\bin\npm.cmd" run dev`
In the browser on `/transactions`:
1. Search field shows with a filter icon button to its right; filter panel is collapsed by default.
2. Clicking the icon toggles the RangeFilter row and the type/category selects; the icon is `default` (filled) while open.
3. Pick e.g. type=Income, then collapse the panel — the icon stays `default` (active) because a non-default filter is set.
4. The header "N shown" count updates as filters are applied.
5. Reset filters to all / All time and collapse — icon returns to `outline`.
Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add components/transactions/TransactionFilters.tsx
git commit -m "feat: collapse transaction filters behind a toggle icon"
```
