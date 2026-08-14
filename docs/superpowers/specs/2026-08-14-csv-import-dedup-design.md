# Design — CSV import dedup via transaction id + export date

## Context

Importing the same CSV export on the same device currently duplicates every transaction: `importTransactions` (`lib/db/repository.ts`) always assigns a fresh `newId()` to each row, and there is no dedup against existing transactions. This design prevents **future** duplicates by carrying each transaction's `id` through the CSV export, and records the export date. It does **not** clean up already-duplicated rows (user chose future-only).

## Requirements

### 1. Export format (`components/settings/SettingsView.tsx` — `handleExportCSV`)

- First line of the CSV is a comment: `# Exported: <timestamp>` (e.g. `# Exported: 2026-08-14 15:30`).
- Header becomes: `id,date,type,amount,category,description` — `id` is the first column.
- The `id` is the transaction's existing uuid (`Transaction.id`), quoted like the other string cells if needed.

### 2. Parser (`lib/csv.ts`)

- `CsvRow` gains an optional `id: string` field.
- When collecting non-empty lines, skip lines that start with `#` (the export-date comment). Blank lines are already skipped.
- Parse the optional `id` column position-independently (same `header.indexOf("id")` pattern as the other columns).
- Old CSVs without an `id` column still parse — those rows simply have no `id`.

### 3. Validation (`lib/validations/transaction.ts`)

- `transactionSchema` gains `id: z.string().min(1).optional()` so the id passes through `safeParse` untouched.

### 4. Import dedup (`lib/db/repository.ts` — `importTransactions`)

- Load existing transaction ids once into a `Set<string>`.
- Keep a second set for ids added within this batch (so two rows in the same file sharing an id import only the first).
- Per row, after `transactionSchema.safeParse` passes:
  - If `row.id` is present **and** in the existing-id set (or the batch set) → skip, `skipped++`.
  - If `row.id` is present but not in either set → insert the transaction **with that same id** (preserving identity so future imports of the same file dedup correctly on any device), and add it to the batch set.
  - If `row.id` is absent (old export, hand-made CSV) → insert with `newId()`.
- Category auto-creation behavior is unchanged.
- Everything stays inside the single `rw` transaction over `db.transactions` + `db.categories`.

### 5. Return value & toast

- `importTransactions` return type unchanged: `{ imported, skipped, createdCategories }`.
- `skipped` now also counts id-matched rows; the existing toast "Imported {n} · skipped {m}" continues to read correctly.

## Out of scope

- No cleanup/dedup of already-existing duplicate transactions (future-only).
- `createdAt` is not carried in the CSV; imported rows keep `createdAt: Date.now()`.
- Skip-on-match (existing row with the same id wins); no update-on-import.

## Verification

No test runner is configured in this project. Verify with:

```bash
npm run build
npm run lint
```

Both must pass.
