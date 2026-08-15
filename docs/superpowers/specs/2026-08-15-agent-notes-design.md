# Agent notes headers on all hand-written source files

Date: 2026-08-15

## Purpose

Add the "agent notes" header template to every hand-written source file in the Cash Guard PWA, and record the template + a "new files must carry this header" rule in `AGENTS.md` so future files get the notes too. The headers document each file's role, key developer decisions, what it affects, what affects it, and what to verify on edit — so any agent (or human) can safely edit a file.

## Requirements

### 1. Files that get the header

All hand-written source files. **Excluded:** `components/ui/*` (shadcn boilerplate), config files (`next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, `components.json`, `postcss.config.mjs`, `next-env.d.ts`), `docs/`, `README.md`, `AGENTS.md`, `CLAUDE.md`.

| Area | Files |
|---|---|
| `app/` | `layout.tsx`, `page.tsx`, `globals.css`, `transactions/page.tsx`, `settings/page.tsx` |
| `components/shared/` | `Header.tsx`, `BottomNav.tsx`, `CategoryIcon.tsx`, `RangeFilter.tsx` |
| `components/dashboard/` | `DashboardView.tsx` |
| `components/transactions/` | `TransactionsView.tsx`, `TransactionList.tsx`, `TransactionForm.tsx`, `TransactionFilters.tsx`, `TransactionDialog.tsx`, `DeleteTransactionDialog.tsx` |
| `components/settings/` | `SettingsView.tsx`, `DeleteCategoryDialog.tsx`, `CategoryEditDialog.tsx` |
| `components/` | `theme-provider.tsx` |
| `lib/` | `db/schema.ts`, `db/repository.ts`, `hooks/useTransactions.ts`, `hooks/useHydrated.ts`, `validations/transaction.ts`, `format.ts`, `utils.ts`, `csv.ts` |
| `public/` | `sw.js` |

That is 29 files.

### 2. Canonical header template

Every file above gets this block at the very top, above all imports and code. The "Green" line (truncated in the user's original message) is completed as shown.

```ts
/**
 * FILE NAME: <file name with extension>
 *
 * ROLE: <one sentence describing what this file does>
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - <key architectural decision 1>
 * ? - <key architectural decision 2>
 * ? - <why a certain approach was chosen>
 * ? - <trade-offs made>
 *
 * AFFECTS:
 * ! - <critical file that depends on this> (CRITICAL: <what breaks>)
 * ? - <secondary file> (<how it's affected>)
 * ? - <tertiary file> (<how it's affected>)
 * ? - <additional file> (<how it's affected>)
 *
 * AFFECTED BY:
 * ? - <config/ENV file> (<what changes impact this>)
 * ? - <another file/dependency> (<what changes impact this>)
 *
 * ON FILE EDIT:
 * ! - <critical test that MUST run>
 * ? - <what files/configs need updating>
 * ? - <what behavior to verify>
 * * - <what edge cases to double-check>
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */
```

For CSS (`app/globals.css`) the same block works unchanged (`/* */` comments). For `sw.js` (JS) it also works unchanged.

### 3. Per-file analysis rules

- Read each file's imports and trace its consumers across the app before writing the header, so `AFFECTS` / `AFFECTED BY` reflect actual usage.
- Since the project has no test suite, the `ON FILE EDIT` critical (`!`) line is `npm run build` (TypeScript + production build) and `npm run lint` is the lint gate.
- Omit rows that don't apply rather than leaving the `? -` placeholders (e.g. leaf utility files may have no `AFFECTS`, `globals.css` may have no `AFFECTED BY`). No empty template rows survive.
- Keep decisions factual and specific to this codebase (local-first Dexie data, live queries, Base UI `render` prop, semantic color tokens, etc.) per existing conventions in `AGENTS.md`.

### 4. AGENTS.md update

- Add an "Agent notes" section to `AGENTS.md` containing the canonical template and the rule:

> **Every new file created in this project must include the agent-notes header at the top.** Fill in ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT with real per-file analysis. Omit sections that don't apply. Verify `npm run build` and `npm run lint` still pass.

- `CLAUDE.md` imports `AGENTS.md`, so it is automatically covered.

## Non-goals

- No headers on `components/ui/*` boilerplate, config files, docs, or README.
- No lint rule or script that enforces headers (approach C was considered and declined).
- No content changes to any source file other than adding the header block.
- No behavior changes.

## Verification

- `npm run build` passes (TypeScript + production build).
- `npm run lint` is clean.
- Spot-check: open several files with differing dependency profiles (e.g. `lib/db/schema.ts`, `components/transactions/TransactionForm.tsx`, `app/globals.css`) and confirm headers are accurate, complete, and above all imports.
