# CSV Import Dedup & Export Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate CSV imports by carrying each transaction's `id` through the CSV export (with an export-date comment line), and dedup on import.

**Architecture:** The id is a UUID already stored on every `Transaction` (`lib/db/schema.ts`). The CSV export adds an `id` column plus a `# Exported:` comment line; the parser reads the optional `id` column and ignores comment lines; the validation schema lets `id` pass through; `importTransactions` skips rows whose id already exists and reuses incoming ids for new rows. Three files change: parser+validation, repository import, SettingsView export.

**Tech Stack:** Next.js 16 App Router, TypeScript, Dexie 4 (IndexedDB), Zod.

## Global Constraints

- Node ≥ 20.9 required (this machine has Node v24.14.0 — use it directly).
- No unit test runner is configured. Verification for every task is `npm run build` and `npm run lint` from the repo root — both must pass before committing.
- Work from repo root: `C:\Users\RAIZEN B. INGALLA\Documents\@cyber-space\personal-proj\cash-guard`
- Repository (`lib/db/repository.ts`) is the only module that touches IndexedDB — keep all Dexie calls there.
- Dexie: never call a write (`rw`) transaction inside a `useLiveQuery` callback. `importTransactions` stays a single `rw` transaction over `db.transactions` + `db.categories`.
- Follow existing file style: double quotes, semicolons, 2-space indent.
- Commit messages use conventional style (`feat: ...`, `fix: ...`).

---

### Task 1: Parser + validation support the `id` column

**Files:**
- Modify: `lib/csv.ts:1-7` (`CsvRow`), `lib/csv.ts:44-74` (`parseTransactionsCSV`)
- Modify: `lib/validations/transaction.ts:3-9` (`transactionSchema`)

**Interfaces:**
- Consumes: existing `parseTransactionsCSV` structure (position-independent `header.indexOf` column lookup)
- Produces: `CsvRow` gains `id?: string`; `parseTransactionsCSV(text)` still returns `{ rows: CsvRow[]; error: string | null }` but rows may carry `id`; `transactionSchema` accepts `id`

- [ ] **Step 1: Add optional `id` to `CsvRow`**

In `lib/csv.ts`, change the interface (lines 1-7):

```ts
export interface CsvRow {
  id?: string;
  date: string;
  type: string;
  amount: number;
  category: string;
  description?: string;
}
```

- [ ] **Step 2: Skip comment lines when collecting data lines**

In `lib/csv.ts`, replace the `nonEmpty` filter (line 45) so lines starting with `#` (the export-date comment) are ignored:

```ts
const nonEmpty = lines.filter((l) => {
  const t = l.trim();
  return t.length > 0 && !t.startsWith("#");
});
```

- [ ] **Step 3: Parse the optional `id` column**

In `lib/csv.ts` `parseTransactionsCSV`, after the existing column lookups (line 54), add the id index:

```ts
const idIdx = idx("id");
```

Then in the row loop, after `const row: CsvRow = { date, type, amount, category };` (line 69), capture the id if the column exists and is non-empty:

```ts
const id = get(idIdx);
if (id) row.id = id;
```

- [ ] **Step 4: Add optional `id` to the validation schema**

In `lib/validations/transaction.ts`, add `id` as the first field of `transactionSchema` (lines 3-9):

```ts
export const transactionSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  date: z.string().min(1, "Date is required"),
});
```

- [ ] **Step 5: Verify build and lint**

Run: `npm run build`
Run: `npm run lint`
Expected: both pass with no errors. (Old CSVs without an `id` column still parse: `idIdx === -1`, `get` returns `""`, no `row.id` set.)

- [ ] **Step 6: Commit**

```bash
git add lib/csv.ts lib/validations/transaction.ts
git commit -m "feat: parse optional id column and comment lines in CSV"
```

---

### Task 2: Dedup by id in `importTransactions`

**Files:**
- Modify: `lib/db/repository.ts:77-129` (`importTransactions`)

**Interfaces:**
- Consumes: `CsvRow` with optional `id` (Task 1), `transactionSchema` accepting `id` (Task 1), `Transaction` type and `newId()` from `./schema`
- Produces: unchanged signature `importTransactions(rows: CsvRow[]): Promise<{ imported: number; skipped: number; createdCategories: string[] }>` — `skipped` now also counts id-matched rows

- [ ] **Step 1: Add dedup logic to the import loop**

In `lib/db/repository.ts`, inside the `importTransactions` transaction (lines 84-126), replace the whole body with:

```ts
  await db.transaction("rw", db.transactions, db.categories, async () => {
    const existingIds = new Set((await db.transactions.toArray()).map((t) => t.id));
    const batchIds = new Set<string>();
    const categories = await db.categories.toArray();
    const storedNames = new Map(
      categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c.name])
    );

    const toAdd: Transaction[] = [];
    for (const row of rows) {
      const parsed = transactionSchema.safeParse(row);
      if (!parsed.success) {
        skipped++;
        continue;
      }
      const { id, type, amount, category, description, date } = parsed.data;
      if (id && (existingIds.has(id) || batchIds.has(id))) {
        skipped++;
        continue;
      }
      const key = `${type}:${category.toLowerCase()}`;
      let storedName = storedNames.get(key);
      if (!storedName) {
        storedName = category.trim();
        storedNames.set(key, storedName);
        createdCategories.add(storedName);
        await db.categories.add({
          id: newId(),
          name: storedName,
          type,
          icon: null,
          color: null,
        });
      }
      const newIdVal = id || newId();
      if (id) batchIds.add(id);
      toAdd.push({
        id: newIdVal,
        type,
        amount,
        category: storedName,
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
```

Behavior:
- `existingIds` = ids already in the DB (loaded once, inside the transaction).
- `batchIds` = ids accepted earlier in this same file, so two rows sharing an id import only the first.
- `row.id` present and matched (existing or batch) → `skipped++`.
- `row.id` present and unmatched → insert with that same id (identity preserved) and record it in `batchIds`.
- `row.id` absent → insert with `newId()`.
- Everything else (category auto-create, return shape) unchanged.

- [ ] **Step 2: Verify build and lint**

Run: `npm run build`
Run: `npm run lint`
Expected: both pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db/repository.ts
git commit -m "feat: skip duplicate transactions on CSV import by id"
```

---

### Task 3: Export writes the comment line and `id` column

**Files:**
- Modify: `components/settings/SettingsView.tsx:88-98` (`handleExportCSV`)

**Interfaces:**
- Consumes: `exportData()` returning `{ transactions: Transaction[]; categories: Category[] }` (unchanged), `downloadFile` from `@/lib/format`, `Transaction.id`
- Produces: CSV text with a `# Exported:` first line and an `id` column; consumed by `parseTransactionsCSV` (Task 1) and dedup (Task 2)

- [ ] **Step 1: Rewrite `handleExportCSV`**

In `components/settings/SettingsView.tsx`, replace `handleExportCSV` (lines 88-98) with:

```ts
  const handleExportCSV = async () => {
    const { transactions } = await exportData();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const csv = [
      `# Exported: ${timestamp}`,
      ["id", "date", "type", "amount", "category", "description"].join(","),
      ...transactions.map((t) =>
        [t.id, t.date, t.type, t.amount, `"${t.category}"`, `"${t.description ?? ""}"`].join(",")
      ),
    ].join("\n");
    downloadFile("cash-guard-transactions.csv", csv, "text/csv;charset=utf-8");
    toast.success("CSV downloaded");
  };
```

The timestamp is local time in `YYYY-MM-DD HH:mm` form (e.g. `2026-08-14 15:30`).

- [ ] **Step 2: Verify build and lint**

Run: `npm run build`
Run: `npm run lint`
Expected: both pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/settings/SettingsView.tsx
git commit -m "feat: add export date comment and id column to CSV export"
```

---

## Self-Review Notes

- Spec item 1 (export format) → Task 3. Spec item 2 (parser) → Task 1. Spec item 3 (validation) → Task 1. Spec item 4 (import dedup) → Task 2. Spec item 5 (return/toast) → Task 2. No gaps.
- All code is inline above; no TBDs. Task 2's `newIdVal` naming avoids shadowing the imported `newId` function from `./schema`.
- Type consistency: `CsvRow.id` (Task 1) is destructured as `id` in Task 2's `parsed.data`; `parsed.data.id` is `string | undefined`, and `id && (...)` guards it before use, satisfying TypeScript. `Transaction.id` is `string`, so `id: newIdVal` is valid since `newIdVal` is always a non-empty string (`id` passed the `.min(1)` check or came from `newId()`).
- The comment-line filter in Task 1 runs before header detection (`nonEmpty[0]`), so a CSV that is only a comment + header still finds the header as `nonEmpty[0]` after the `#` line is filtered.