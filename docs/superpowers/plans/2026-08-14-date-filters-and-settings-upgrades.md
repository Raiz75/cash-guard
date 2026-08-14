# Date Filters, Dashboard Cleanup & Settings Upgrades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rolling date-range filters to the dashboard breakdown and transactions page, remove the "This month" cards and income/expense/net breakdown, add CSV import to Settings, remove the JSON backup, and make categories editable/deletable with a safe reassign flow.

**Architecture:** All filtering is pure client-side over `useLiveQuery` data. A shared `DateRange` helper + `RangeFilter` segmented control is used by both pages. Settings changes go through the existing Dexie repository layer (`lib/db/repository.ts`); new UI lives in `components/settings/` reusing the existing Base UI Dialog/Select/Button components.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui (base-maia preset, Tabler icons), React Hook Form + Zod, Dexie 4 + dexie-react-hooks.

## Global Constraints

- Node ≥ 20.9 required. This machine has Node v24.14.0 — use it directly (`node --version` confirms).
- shadcn preset is **base-maia**; use **Tabler icons** (`@tabler/icons-react`), not lucide, for new UI.
- Base UI `Button` polymorphism is via the `render` prop; set `nativeButton={false}` when rendering a non-`<button>` (e.g. `<Link>`).
- Base UI `Select` `value`/`onValueChange` are `string | null` — coerce with `?? ""` / `?? null`.
- Semantic colors only: `--primary` (teal) for income/positive, `--destructive` for expense/negative. Never hardcode `green-600`/`red-600`.
- Forms: React Hook Form + Zod. Use `useWatch({ control: form.control, name: "..." })` for reading values during render (never `form.watch`). Do not `setState` directly inside `useEffect` (`react-hooks/set-state-in-effect` lint).
- Never call a Dexie `rw` (write) transaction inside a `useLiveQuery` callback — live queries are read-only and throw `ReadonlyError`.
- **No unit test runner is configured** (package.json has no test script). Verification for every task is `npm run build` and `npm run lint`, both of which must pass, plus the manual checks listed per task.
- Spec: `docs/superpowers/specs/2026-08-14-date-filters-and-settings-design.md`.

---
---

### Task 1: Date-range helper in `lib/format.ts`

**Files:**
- Modify: `lib/format.ts` (append after `monthRange`, around line 28)

**Interfaces:**
- Produces: `type DateRange = "all" | "today" | "7d" | "1m"`
- Produces: `rangeStartISO(range: DateRange): string | null` — inclusive start ISO date (`YYYY-MM-DD`) for `"today"` / `"7d"` / `"1m"`; `null` for `"all"`. `"7d"` = today minus 6 days; `"1m"` = today minus 29 days (rolling windows inclusive of today).

- [ ] **Step 1: Add the type and helper**

Append to `lib/format.ts`:

```ts
export type DateRange = "all" | "today" | "7d" | "1m";

export function rangeStartISO(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "today" ? 0 : range === "7d" ? 6 : 29;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return toISODate(start);
}
```

`toISODate` is already defined above in this file (uses local time — consistent with how `todayISO()` and transaction dates are stored).

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: production build succeeds (TypeScript compiles).

Run: `npm run lint`
Expected: no ESLint errors.

- [ ] **Step 3: Commit**

```bash
git add lib/format.ts
git commit -m "feat: add DateRange type and rangeStartISO helper"
```

---
---

### Task 2: Shared `RangeFilter` segmented control

**Files:**
- Create: `components/shared/RangeFilter.tsx`

**Interfaces:**
- Consumes: `DateRange`, `rangeStartISO` from Task 1 (only the type is needed here).
- Produces: `<RangeFilter value: DateRange onChange: (range: DateRange) => void />` — four-button segmented control, active option = `default` variant, inactive = `outline`.

- [ ] **Step 1: Create the component**

`components/shared/RangeFilter.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: production build succeeds.

Run: `npm run lint`
Expected: no ESLint errors.

- [ ] **Step 3: Commit**

```bash
git add components/shared/RangeFilter.tsx
git commit -m "feat: add shared RangeFilter segmented control"
```

---
---

### Task 3: Dashboard — remove This-month cards, add range filter to Spending by category

**Files:**
- Modify: `components/dashboard/DashboardView.tsx`

**Interfaces:**
- Consumes: `RangeFilter` (Task 2), `DateRange`, `rangeStartISO` (Task 1).
- Produces: no exports; changed dashboard UI.

- [ ] **Step 1: Update imports**

In `components/dashboard/DashboardView.tsx`:
- Change `import { useEffect } from "react";` → `import { useEffect, useState } from "react";`
- Change `import { formatPeso, monthRange } from "@/lib/format";` → `import { formatPeso, rangeStartISO, type DateRange } from "@/lib/format";`
- Remove `CardDescription` from the `@/components/ui/card` import (it becomes unused).
- Add `import { RangeFilter } from "@/components/shared/RangeFilter";`

- [ ] **Step 2: Add range state and filter the breakdown**

In one contiguous edit, replace the block from `const totalExpense` through the end of the old `expenseByCategory` loop (current lines 34–50) with:

```tsx
  const totalExpense = all.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const [range, setRange] = useState<DateRange>("all");
  const rangeStart = rangeStartISO(range);

  const expenseByCategory = new Map<string, number>();
  for (const t of all) {
    if (t.type === "expense" && (rangeStart === null || t.date >= rangeStart)) {
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) ?? 0) + t.amount);
    }
  }
```

`totalIncome` (line 33) stays as-is above. This removes the `monthRange()`/`periodIncome`/`periodExpense` block and the old unfiltered `expenseByCategory` loop in one edit.

- [ ] **Step 3: Delete the This-month cards**

Delete the entire `grid grid-cols-2` block (current lines 78–91) containing the "This month income" and "This month expenses" cards.

- [ ] **Step 4: Put the RangeFilter in the Spending by category header**

Replace the `CardHeader` of the "Spending by category" card (current lines 99–102):

```tsx
            <CardHeader>
              <CardTitle className="text-sm">Spending by category</CardTitle>
              <RangeFilter value={range} onChange={setRange} />
            </CardHeader>
```

`CardHeader` is a CSS grid; the `RangeFilter` div renders as its own row below the title. The breakdown rendering below it is unchanged.

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: production build succeeds (no unused-import errors from removed `monthRange`/`CardDescription`).

Run: `npm run lint`
Expected: no ESLint errors.

Manual check: `npm run dev` → dashboard shows no "This month" cards; Spending by category changes with each range option and shows an empty card when the range has no expenses.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/DashboardView.tsx
git commit -m "feat: add range filter to dashboard breakdown, remove this-month cards"
```

---
---

### Task 4: Transactions — remove income/expense/net breakdown, add range filter

**Files:**
- Modify: `components/transactions/TransactionFilters.tsx`
- Modify: `components/transactions/TransactionsView.tsx`

**Interfaces:**
- Consumes: `RangeFilter` (Task 2), `DateRange`, `rangeStartISO` (Task 1).
- Produces: `Filters` interface gains `range: DateRange`; `applyFilters(transactions, filters)` also filters by date range.

- [ ] **Step 1: Extend `Filters` in TransactionFilters.tsx**

In `components/transactions/TransactionFilters.tsx`:
- Add imports:

```tsx
import { rangeStartISO, type DateRange } from "@/lib/format";
import { RangeFilter } from "@/components/shared/RangeFilter";
```

- Add `range: DateRange;` to the `Filters` interface.
- Add the `RangeFilter` as the first child of the outer `div` (before the search box):

```tsx
    <div className="space-y-2">
      <RangeFilter
        value={filters.range}
        onChange={(range) => onChange({ ...filters, range })}
      />
```

- Update `applyFilters` to filter by range. Replace the whole function with:

```ts
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
```

- [ ] **Step 2: Update TransactionsView.tsx**

In `components/transactions/TransactionsView.tsx`:
- Change the initial `filters` state to include `range: "all"` (default):

```tsx
  const [filters, setFilters] = useState<Filters>({
    type: "all",
    category: "all",
    search: "",
    range: "all",
  });
```

- Delete the `totals` computation (current lines 46–54).
- Delete the breakdown `Card` (current lines 86–92) that shows `totals.income` / `totals.expense` / `totals.net`.

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: production build succeeds.

Run: `npm run lint`
Expected: no ESLint errors.

Manual check: transactions page has no breakdown card; the range filter works together with type/category/search filters; "All time" is the default.

- [ ] **Step 4: Commit**

```bash
git add components/transactions/TransactionFilters.tsx components/transactions/TransactionsView.tsx
git commit -m "feat: add date range filter to transactions, remove income/expense/net breakdown"
```

---
---

### Task 5: CSV parser + repository import & category helpers

**Files:**
- Create: `lib/csv.ts`
- Modify: `lib/db/repository.ts`

**Interfaces:**
- Consumes: `transactionSchema` (`@/lib/validations/transaction`), `db`, `newId`, `Transaction` types (`@/lib/db/schema`).
- Produces:
  - `parseTransactionsCSV(text: string): { rows: CsvRow[]; error: string | null }` where `CsvRow = { date: string; type: string; amount: number; category: string; description?: string }`.
  - `importTransactions(rows: CsvRow[]): Promise<{ imported: number; skipped: number; createdCategories: string[] }>`.
  - `transactionCountForCategory(name: string): Promise<number>`.
  - `reassignCategory(fromName: string, toName: string): Promise<void>`.
  - `updateCategory(id: string, input: CategoryInput): Promise<void>` — extended to migrate transactions on rename and reject type change while in use.

- [ ] **Step 1: Create the CSV parser**

`lib/csv.ts`:

```ts
export interface CsvRow {
  date: string;
  type: string;
  amount: number;
  category: string;
  description?: string;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

export function parseTransactionsCSV(text: string): {
  rows: CsvRow[];
  error: string | null;
} {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return { rows: [], error: "CSV is empty" };

  const header = parseCSVLine(nonEmpty[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const dateIdx = idx("date");
  const typeIdx = idx("type");
  const amountIdx = idx("amount");
  const categoryIdx = idx("category");
  const descIdx = idx("description");

  if (dateIdx === -1 || typeIdx === -1 || amountIdx === -1 || categoryIdx === -1) {
    return { rows: [], error: "CSV must have date, type, amount, category columns" };
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const cols = parseCSVLine(nonEmpty[i]);
    const get = (n: number) => (n === -1 ? "" : (cols[n] ?? "").trim());
    const date = get(dateIdx);
    const type = get(typeIdx);
    const category = get(categoryIdx);
    const amount = Number(get(amountIdx));
    if (!date || !type || !category || Number.isNaN(amount)) continue;
    const row: CsvRow = { date, type, amount, category };
    const description = get(descIdx);
    if (description) row.description = description;
    rows.push(row);
  }
  return { rows, error: null };
}
```

This matches the app's export format (`date,type,amount,category,description`) and handles quoted fields (export wraps `category` and `description` in quotes).

- [ ] **Step 2: Add `importTransactions` to the repository**

In `lib/db/repository.ts`:
- Add `transactionSchema` to the existing validation import:

```ts
import {
  transactionSchema,
  type TransactionInput,
  type CategoryInput,
} from "@/lib/validations/transaction";
```

- Add `import type { CsvRow } from "@/lib/csv";`
- Append:

```ts
export async function importTransactions(
  rows: CsvRow[]
): Promise<{ imported: number; skipped: number; createdCategories: string[] }> {
  const createdCategories = new Set<string>();
  let imported = 0;
  let skipped = 0;

  await db.transaction("rw", db.transactions, db.categories, async () => {
    const categories = await db.categories.toArray();
    const existing = new Set(categories.map((c) => `${c.type}:${c.name.toLowerCase()}`));

    const toAdd: Transaction[] = [];
    for (const row of rows) {
      const parsed = transactionSchema.safeParse(row);
      if (!parsed.success) {
        skipped++;
        continue;
      }
      const { type, amount, category, description, date } = parsed.data;
      const key = `${type}:${category.toLowerCase()}`;
      if (!existing.has(key)) {
        existing.add(key);
        createdCategories.add(category.trim());
        await db.categories.add({
          id: newId(),
          name: category.trim(),
          type,
          icon: null,
          color: null,
        });
      }
      toAdd.push({
        id: newId(),
        type,
        amount,
        category: category.trim(),
        description: description?.trim() || null,
        date,
        createdAt: Date.now(),
      });
    }
    if (toAdd.length > 0) {
      await db.transactions.bulkAdd(toAdd);
      imported = toAdd.length;
    }
  });

  return { imported, skipped, createdCategories: [...createdCategories] };
}
```

- [ ] **Step 3: Add category helpers and extend `updateCategory`**

In `lib/db/repository.ts`:

```ts
export async function transactionCountForCategory(name: string): Promise<number> {
  return db.transactions.where("category").equals(name).count();
}

export async function reassignCategory(fromName: string, toName: string): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    await db.transactions.where("category").equals(fromName).modify({ category: toName });
  });
}
```

Replace the existing `updateCategory` (current lines 44–46) with:

```ts
export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const current = await db.categories.get(id);
  if (!current) throw new Error("Category not found");
  const name = input.name.trim();
  const typeChanged = input.type !== current.type;

  await db.transaction("rw", db.transactions, db.categories, async () => {
    if (typeChanged) {
      const count = await db.transactions.where("category").equals(current.name).count();
      if (count > 0) throw new Error("Cannot change type while the category is in use");
    }
    if (name !== current.name) {
      await db.transactions.where("category").equals(current.name).modify({ category: name });
    }
    await db.categories.update(id, { name, type: input.type });
  });
}
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: production build succeeds (types line up: `safeParse` narrows to a `TransactionInput` compatible with the `Transaction` fields).

Run: `npm run lint`
Expected: no ESLint errors.

Manual check (import round-trip depends on Task 6 UI, but logic is exercised there):
- `reassignCategory("A", "B")` moves all transactions tagged "A" to "B".
- `updateCategory` renames a category and migrates its transactions; changing type while in use throws.

- [ ] **Step 5: Commit**

```bash
git add lib/csv.ts lib/db/repository.ts
git commit -m "feat: add CSV parser, transaction import, and category reassign helpers"
```

---
---

### Task 6: Settings — CSV import button, remove JSON backup

**Files:**
- Modify: `components/settings/SettingsView.tsx`

**Interfaces:**
- Consumes: `parseTransactionsCSV` (Task 5), `importTransactions` (Task 5).
- Produces: Import CSV button + hidden file input in the Data card; JSON backup button removed.

- [ ] **Step 1: Update imports and add the file handler**

In `components/settings/SettingsView.tsx`:
- Change `import { useState } from "react";` → `import { useRef, useState } from "react";`
- Add `import { IconUpload } from "@tabler/icons-react";` (keep the lucide `Download` and `Plus` imports — they're existing UI).
- Add `import { parseTransactionsCSV } from "@/lib/csv";`
- Change `import { addCategory } from "@/lib/db/repository";` and `import { exportData } from "@/lib/db/repository";` to a single import adding `importTransactions`:

```ts
import {
  addCategory,
  exportData,
  importTransactions,
} from "@/lib/db/repository";
```

- Add inside the component (after `const form = useForm...`):

```tsx
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = async (file: File) => {
    try {
      const text = await file.text();
      const { rows, error } = parseTransactionsCSV(text);
      if (error) {
        toast.error(error);
        return;
      }
      const result = await importTransactions(rows);
      toast.success(`Imported ${result.imported} · skipped ${result.skipped}`);
    } catch {
      toast.error("Could not import CSV");
    }
  };
```

- [ ] **Step 2: Remove the JSON backup button and handler**

Delete `handleExportJSON` (current lines 52–60) and the "Export JSON backup" `Button` (current lines 146–148). Also remove `exportData` usage only if `handleExportCSV` stops using it — it does not; `handleExportCSV` still calls `exportData()`, so keep that import.

- [ ] **Step 3: Add the Import CSV button + hidden file input**

In the Data card, after the Export CSV button, add:

```tsx
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload className="mr-1 h-4 w-4" /> Import CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportCSV(file);
                e.target.value = "";
              }}
            />
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: production build succeeds.

Run: `npm run lint`
Expected: no ESLint errors.

Manual check: Settings → Data shows Export CSV + Import CSV, no JSON backup. Export a CSV, then import it back → toast shows the count; totals match; categories referenced in the CSV that were missing are auto-created.

- [ ] **Step 5: Commit**

```bash
git add components/settings/SettingsView.tsx
git commit -m "feat: add CSV import to settings, remove JSON backup"
```

---
---

### Task 7: Settings — editable & deletable categories

**Files:**
- Create: `components/settings/CategoryEditDialog.tsx`
- Create: `components/settings/DeleteCategoryDialog.tsx`
- Modify: `components/settings/SettingsView.tsx`

**Interfaces:**
- Consumes: `updateCategory`, `transactionCountForCategory`, `reassignCategory`, `deleteCategory` (Task 5); `categorySchema`/`CategoryInput` (`@/lib/validations/transaction`); `Category` (`@/lib/db/schema`).
- Produces: edit + delete buttons per category in Settings, with the reassign flow.

- [ ] **Step 1: Create `CategoryEditDialog.tsx`**

`components/settings/CategoryEditDialog.tsx`:

```tsx
"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { categorySchema, type CategoryInput } from "@/lib/validations/transaction";
import { updateCategory } from "@/lib/db/repository";
import type { Category } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CategoryEditDialog({
  category,
  inUse,
  open,
  onOpenChange,
}: {
  category: Category;
  inUse: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category.name, type: category.type },
  });

  const watchType = useWatch({ control: form.control, name: "type" }) ?? "expense";

  const onSubmit = async (data: CategoryInput) => {
    try {
      await updateCategory(category.id, data);
      toast.success("Category updated");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            Renaming moves existing transactions to the new name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={watchType === "income" ? "default" : "outline"}
              disabled={inUse > 0}
              onClick={() => form.setValue("type", "income")}
            >
              Income
            </Button>
            <Button
              type="button"
              variant={watchType === "expense" ? "default" : "outline"}
              disabled={inUse > 0}
              className={watchType === "expense" ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={() => form.setValue("type", "expense")}
            >
              Expense
            </Button>
          </div>
          {inUse > 0 ? (
            <p className="text-xs text-muted-foreground">
              Used by {inUse} transaction(s) — type can't be changed.
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Category name</Label>
            <Input id="edit-name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Note: `type` is set via `form.setValue` (matching the `TransactionForm` pattern — no hidden input needed); `DialogFooter` sits inside the `<form>` so the submit button works.

- [ ] **Step 2: Create `DeleteCategoryDialog.tsx`**

`components/settings/DeleteCategoryDialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteCategory, reassignCategory } from "@/lib/db/repository";
import type { Category } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function DeleteCategoryDialog({
  category,
  count,
  candidates,
  open,
  onOpenChange,
}: {
  category: Category;
  count: number;
  candidates: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [target, setTarget] = useState("");
  const needTarget = count > 0;

  const handleDelete = async () => {
    try {
      if (needTarget) {
        if (!target) return;
        await reassignCategory(category.name, target);
      }
      await deleteCategory(category.id);
      toast.success("Category deleted");
      onOpenChange(false);
    } catch {
      toast.error("Could not delete category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete category?</DialogTitle>
          <DialogDescription>
            {needTarget
              ? `${count} transaction(s) use this category. Move them to another category first.`
              : "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        {needTarget ? (
          <div className="space-y-1.5">
            <Label htmlFor="reassign">Move transactions to</Label>
            <Select value={target || null} onValueChange={(v) => setTarget(v ?? "")}>
              <SelectTrigger id="reassign" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={needTarget && !target}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Base UI Select `value`/`onValueChange` are `string | null` — coerced with `|| null` / `?? ""` as required.

- [ ] **Step 3: Wire dialogs into SettingsView**

In `components/settings/SettingsView.tsx`:
- Update the repository import to add `transactionCountForCategory` (the edit/delete dialogs own `updateCategory`/`deleteCategory`/`reassignCategory` themselves):

```ts
import {
  addCategory,
  exportData,
  importTransactions,
  transactionCountForCategory,
} from "@/lib/db/repository";
```

- Add imports for the dialogs and icons:

```tsx
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { CategoryEditDialog } from "@/components/settings/CategoryEditDialog";
import { DeleteCategoryDialog } from "@/components/settings/DeleteCategoryDialog";
import type { Category } from "@/lib/db/schema";
```

- Add state and handlers inside the component (after the `form` setup):

```tsx
  const [editing, setEditing] = useState<{ category: Category; inUse: number } | null>(null);
  const [deleting, setDeleting] = useState<{
    category: Category;
    count: number;
    candidates: Category[];
  } | null>(null);

  const openEdit = async (c: Category) => {
    const inUse = await transactionCountForCategory(c.name);
    setEditing({ category: c, inUse });
  };

  const openDelete = async (c: Category) => {
    const count = await transactionCountForCategory(c.name);
    setDeleting({
      category: c,
      count,
      candidates: categories.filter((x) => x.type === c.type && x.id !== c.id),
    });
  };
```

- Add Edit/Delete buttons to each category card. Replace the entire `{categories.map(...)}` block in the Categories card (current lines 118–134) with:

```tsx
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-1 rounded-lg border px-3 py-2 text-sm"
              >
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                  <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <Badge
                    variant={c.type === "income" ? "default" : "destructive"}
                    className="ml-1 text-xs"
                  >
                    {c.type === "income" ? "In" : "Ex"}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void openEdit(c)}
                    aria-label={`Edit ${c.name}`}
                  >
                    <IconPencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void openDelete(c)}
                    aria-label={`Delete ${c.name}`}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </div>
            ))}
```

The `Badge` (showing "In"/"Ex") is kept. `Badge` remains imported from `@/components/ui/badge`.

- Render the dialogs at the end of the component, just before `</main>`'s parent closing (e.g. after `<BottomNav />`):

```tsx
      {editing ? (
        <CategoryEditDialog
          key={editing.category.id}
          category={editing.category}
          inUse={editing.inUse}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteCategoryDialog
          key={deleting.category.id}
          category={deleting.category}
          count={deleting.count}
          candidates={deleting.candidates}
          open
          onOpenChange={(o) => {
            if (!o) setDeleting(null);
          }}
        />
      ) : null}
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: production build succeeds.

Run: `npm run lint`
Expected: no ESLint errors. (`SettingsView` imports only `addCategory`, `exportData`, `importTransactions`, `transactionCountForCategory`; `updateCategory`/`deleteCategory`/`reassignCategory` are used inside the dialog components, which import them directly.)

Manual check:
- Edit a category → rename it → its transactions show the new name; type toggle disabled when the category is in use.
- Delete an unused category → direct confirm works.
- Delete an in-use category → must pick a target of the same type first; Delete disabled until chosen; transactions move to the target; category removed.
- Seeded default categories still appear correctly after edits (seeding dedupes by `type + name`, case-insensitive).

- [ ] **Step 5: Commit**

```bash
git add components/settings/SettingsView.tsx components/settings/CategoryEditDialog.tsx components/settings/DeleteCategoryDialog.tsx
git commit -m "feat: make categories editable and deletable with reassign flow"
```

---
---

## Final verification

- [ ] Run `npm run build` and `npm run lint` from the repo root and confirm both pass.
- [ ] Re-read `docs/superpowers/specs/2026-08-14-date-filters-and-settings-design.md` and confirm every requirement has a corresponding task (all covered: Tasks 1–2 → range filters, Task 3 → dashboard, Task 4 → transactions, Tasks 5–6 → CSV import + JSON removal, Task 7 → category edit/delete).
