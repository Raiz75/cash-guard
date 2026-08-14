# Date Filters, Dashboard Cleanup, and Settings Upgrades — Design

Date: 2026-08-14
Status: Approved
Project: Cash Guard (mobile-first local-first finance PWA)

## Summary

Tighten the dashboard and transactions pages around a shared rolling-date-range filter,
remove clutter (This-month cards, income/expense/net breakdown, JSON backup), and make
Settings capable of editing/deleting categories and importing old CSV data.

All changes stay within the existing local-first architecture (Dexie/IndexedDB, no server).

## Goals

1. Dashboard "Spending by category" filters by today / last 7 days / last 30 days / all time.
2. Remove "This month income" and "This month expenses" cards from the dashboard.
3. Remove the income/expense/net breakdown card from the transactions page.
4. Transactions page filters by today / last 7 days / last 30 days / all time (all time default).
5. Settings imports a CSV matching the export format.
6. Settings removes the JSON backup button.
7. Settings categories become editable and deletable, with a safe delete flow.

## Scope decisions (from clarifying questions)

- Date ranges are **rolling windows** back from today (7 and 30 days), not calendar-based.
- "All time" remains available and is the **default** on both the dashboard and transactions page.
- Deleting an in-use category is **blocked**; the user must reassign its transactions to an
  existing category of the same type first.
- CSV import uses the **same column format as export**: `date,type,amount,category,description`.
- Imported rows referencing a **missing category auto-create** a plain category (generic
  icon/color, same shape as `addCategory` today).

## Architecture

### 1. Shared date-range module

- `lib/format.ts`:
  - `type DateRange = "all" | "today" | "7d" | "1m"`
  - `rangeStartISO(range: DateRange): string | null` — returns the inclusive start ISO date
    (`YYYY-MM-DD`) for `"today"` / `"7d"` / `"1m"`, `null` for `"all"`.
    - `today` → `todayISO()`
    - `7d` → today minus 6 days
    - `1m` → today minus 29 days
- `components/shared/RangeFilter.tsx`:
  - Controlled segmented control: `{ value: DateRange; onChange: (r: DateRange) => void }`.
  - Options in order: All time (default) / Today / 7 days / 1 month.
  - Built with existing `Button` components (active = `default` variant, inactive = `outline`),
    matching the add-category type toggle pattern in `SettingsView`.

### 2. Home page (`components/dashboard/DashboardView.tsx`)

- Remove the "This month income" / "This month expenses" card grid (lines 78–91) and the
  `periodIncome` / `periodExpense` computation (lines 37–43) and the `monthRange` import if unused.
- Keep the Total Balance card as-is (shows all-time balance + all-time income/expenses).
- Add `RangeFilter` to the "Spending by category" card header, replacing the static
  `CardDescription` "All time" with the live control.
- `expenseByCategory` recomputes from range-filtered expenses only; the card renders nothing
  when the selected range has no expenses (existing `breakdown.length > 0` guard stays).

### 3. Transactions page (`components/transactions/TransactionsView.tsx` + `TransactionFilters.tsx`)

- Remove the income/expense/net breakdown `Card` (lines 86–92) and the `totals` computation
  (lines 46–54). Header subtitle already shows `${filtered.length} shown`.
- Extend `Filters` with `range: DateRange` (default `"all"`).
- Add `RangeFilter` to `TransactionFilters` (full-width row above the type/category selects).
- `applyFilters` additionally excludes transactions with `tx.date < rangeStartISO(range)` when
  range is not `"all"`.
- Type/category/search filtering behavior is unchanged.

### 4. Settings — CSV import (`components/settings/SettingsView.tsx`, `lib/db/repository.ts`)

- Add an "Import CSV" button (outline) plus a hidden `<input type="file" accept=".csv">`.
- Parse CSV with a small in-app parser that handles quoted fields (comma inside quotes) and a
  header row. Map rows to `{ date, type, amount, category, description }`.
- Validate each row with the existing `transactionSchema` (amount coerced; `type`/`date` required).
- New repository function `importTransactions(rows: TransactionInput[]): Promise<{ imported: number; skipped: number; createdCategories: string[] }>`:
  - For each row, if its category doesn't exist for that type, create it (plain name/type,
    `icon: null`, `color: null`).
  - Bulk-insert all valid transactions.
  - Runs inside a single Dexie `rw` transaction (`db.transactions` + `db.categories`), mirroring
    `seedIfEmpty`'s transaction usage. Never call writes inside a `useLiveQuery` callback.
- UI reports a toast: `Imported N · skipped M`.

### 5. Settings — categories edit/delete + JSON removal (`SettingsView.tsx`, `repository.ts`)

- Remove the "Export JSON backup" button and `handleExportJSON` (lines 52–60, 146–148).
- Add per-category **Edit** and **Delete** buttons in the categories grid.
- **Edit** (`components/settings/CategoryEditDialog.tsx`, new): Dialog with name input + type
  toggle, pre-filled from the category. Uses the existing `categorySchema` for validation.
  - On submit call `updateCategory(id, input)`, extended to:
    - When the name changes, update the category row **and** every transaction whose `category`
      equals the old name in the same `rw` transaction. Prevents silent orphaned transactions.
    - Changing type is allowed **only when no transactions use that category**; otherwise the
      type toggle is disabled with a hint.
- **Delete** (`components/settings/DeleteCategoryDialog.tsx`, new):
  - New `transactionCountForCategory(name: string): Promise<number>`.
  - If count is 0 → confirm dialog ("Delete category X?") → `deleteCategory(id)`.
  - If count > 0 → block and show a reassign dialog: pick a target category of the **same type**
    (excluding itself) from a `Select`, then confirm. On confirm, new `reassignCategory(
    fromName: string, toName: string)` updates those transactions, then `deleteCategory(id)`.
  - Confirm button disabled until a target is selected.
- Follow the Base UI conventions from AGENTS.md: Select `value`/`onValueChange` are
  `string | null` — coerce with `?? ""`; render non-button elements via `render` prop with
  `nativeButton={false}`; use Tabler icons, not lucide, for new UI.

## Data flow

- Date-range filters are pure client-side filtering of the already-loaded `useLiveQuery` data;
  no schema or storage changes.
- Category edits/deletes and CSV import are one-off `rw` operations through the repository layer;
  `useLiveQuery` re-renders the UI reactively afterward.

## Error handling

- CSV rows failing validation are skipped and counted; a bad row never aborts the whole import.
- A CSV with a missing/unreadable header reports an error toast and imports nothing.
- Reassign dialog cannot confirm without a chosen target; same-type targets only.
- Renaming a category migrates transactions in the same `rw` transaction, so a failure rolls
  back both the rename and the migration.

## Out of scope

- Multi-currency, budgets, recurring transactions, cloud sync (existing "Future ideas").
- Editing category icon or color in the UI.
- Deleting a category and cascading its transactions (explicitly rejected by user).
- Import from formats other than the app's export format.

## Verification

- `npm run build` — must pass TypeScript + production build.
- `npm run lint` — must be clean.
- Manual checks:
  1. Dashboard breakdown changes with each range option; "This month" cards gone.
  2. Transactions page has no breakdown card; range filter works with type/category/search.
  3. Export CSV → import it back → totals and counts match; missing categories auto-created.
  4. Rename a category → its transactions follow the new name.
  5. Delete an unused category works directly; deleting an in-use category requires reassigning.
