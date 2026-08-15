# Export filename, transaction icons, and collapsible filters

Date: 2026-08-15

## Purpose

Three small UI changes in the Cash Guard PWA:

1. Add the export date to the CSV filename in Settings.
2. Replace the `Edit` / `Del` badges on transaction rows with icon buttons, matching the category rows.
3. Hide the type / category / date-range filters behind a filter toggle button beside the search field on the Transactions page.

## Requirements

### 1. Export filename includes the date

- File: `components/settings/SettingsView.tsx` (line 102).
- Change the downloaded filename from the hardcoded `cash-guard-transactions.csv` to `` `cash-guard-transactions-${todayISO()}.csv` `` (e.g. `cash-guard-transactions-2026-08-15.csv`).
- `todayISO()` is already exported from `lib/format` and imported in the file.
- The CSV body is unchanged; the `# Exported: <timestamp>` comment line stays as-is.

### 2. Transaction row edit/delete icons

- File: `components/transactions/TransactionList.tsx`.
- Replace the `Edit` `<Badge variant="outline">` and `Del` `<Badge variant="destructive">` elements with two ghost `size="icon-xs"` `<Button>`s using `IconPencil` (neutral) and `IconTrash` (`text-destructive hover:text-destructive`) from `@tabler/icons-react`.
- Provide `aria-label` for both buttons, mirroring the category rows in `SettingsView.tsx`.
- Remove the now-unused `Badge` import; add the Tabler icon import.

### 3. Collapsible transaction filters

- File: `components/transactions/TransactionFilters.tsx`.
- The search input remains always visible. Wrap it and a filter icon button in a flex row: the input grows to fill, the icon button sits beside it (fixed).
- The filter button uses `IconFilter` from `@tabler/icons-react`. It is `variant="default"` while the filter panel is open OR any of type / category / range differ from their defaults; otherwise `variant="outline"`.
- Clicking the button toggles a local `useState<boolean>` (`showFilters`).
- When `showFilters` is true, render the existing `RangeFilter` and the type/category select grid below the search field, exactly as they appear today (same order: range, then the 2-column select grid). When false, render nothing.
- `Filters` shape, `applyFilters`, the header "X shown" count, and dialog state are unchanged.

## Non-goals

- No custom from/to date picker — quick ranges (All time / Today / 7 days / 1 month) are kept.
- No URL-parameter persistence for the filter panel state.
- No changes to the CSV export body, import, or data model.
- No refactoring beyond the three files listed above.

## Verification

- `npm run build` passes (TypeScript + production build).
- `npm run lint` is clean.
