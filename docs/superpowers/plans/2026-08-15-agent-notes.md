# Agent Notes Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the agent-notes header (ROLE / decisions / AFFECTS / AFFECTED BY / ON FILE EDIT / AI INSTRUCTIONS) to all 29 hand-written source files, and record the template + "keep headers current" rules in `AGENTS.md`.

**Architecture:** Pure documentation change — prepend a `/* ... */` block comment to the top of each source file, above all imports/statements. No runtime code changes. Each header is written from the file's actual imports and consumers (analyzed and embedded below), so no per-file investigation is required at execution time.

**Tech Stack:** TypeScript / TSX / CSS (`/* */` comments work in all three), Markdown for `AGENTS.md`.

## Global Constraints

- Only add the header block. Do **not** change any import, type, value, or logic in the 29 files.
- Do **not** touch `components/ui/*`, config files, `docs/`, `README.md`, `CLAUDE.md`.
- Headers must sit at the very top of the file (line 1), with one blank line between the closing `*/` and the first existing line (imports or `"use client"`).
- After ALL tasks: `npm run build` must pass and `npm run lint` must be clean. If the build complains about Node version (system Node is 18), prepend the user-local Node 22 to PATH: `$env:PATH = "$env:USERPROFILE\.local\node\bin;$env:PATH"`.
- Commit after every task. Repo convention: `feat:` / `docs:` prefix, lowercase.

---

### Task 1: Add the agent-notes rule and template to AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: the canonical header template (verbatim, below).
- Produces: the convention that Tasks 2–7 and all future work must follow.

- [ ] **Step 1: Read the current AGENTS.md to locate the insertion point**

Run: `Get-Content AGENTS.md`
The file has sections: `## What this is`, `## How data works`, `## Conventions & gotchas`, `## Verification`, then the `<!-- BEGIN:nextjs-agent-rules -->` block. Insert the new section between the end of `## Verification` and the `<!-- BEGIN:nextjs-agent-rules -->` comment (i.e. after the line `Always run both after changes and confirm output before claiming success.` and before the blank line preceding `<!-- BEGIN:nextjs-agent-rules -->`).

- [ ] **Step 2: Insert the "Agent notes" section**

Add exactly this section (the header inside is the canonical template for all files):

```markdown
## Agent notes (required on every hand-written source file)

Every hand-written source file (app routes, `components/` outside `components/ui/`, `lib/`, `public/sw.js`) MUST begin with the agent-notes header below. **Excluded:** `components/ui/*` boilerplate, config files, docs, README. Every new file created in this project must include this header at the top, filled in with real per-file analysis — omit sections that don't apply, never leave the `? -` placeholders.

**Keep headers current:** whenever a file is edited, update its header (ROLE, decisions, AFFECTS, AFFECTED BY, ON FILE EDIT) so the notes always match the code. Never leave a stale header behind.

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
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE,
 *   decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */
```

Leave the `<!-- BEGIN:nextjs-agent-rules -->` block untouched (next dev re-adds it).

- [ ] **Step 3: Verify**

Run: `Get-Content AGENTS.md`
Expected: the new `## Agent notes` section appears, `## Verification` and the nextjs-agent-rules block are unchanged, and no other section was altered.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: require agent notes headers on every hand-written source file"
```

---

### Task 2: Headers on the lib/ core (8 files)

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/repository.ts`
- Modify: `lib/hooks/useTransactions.ts`
- Modify: `lib/hooks/useHydrated.ts`
- Modify: `lib/validations/transaction.ts`
- Modify: `lib/format.ts`
- Modify: `lib/utils.ts`
- Modify: `lib/csv.ts`

**Interfaces:**
- Consumes: canonical template from AGENTS.md (Task 1).
- Produces: headers on every data-layer file; later view-component tasks reference these files as AFFECTED BY / AFFECTS entries.

- [ ] **Step 1: Prepend the header to `lib/db/schema.ts`**

Insert at the top (line 1), before `import Dexie, { type Table } from "dexie";`, followed by one blank line:

```ts
/**
 * FILE NAME: schema.ts
 *
 * ROLE: Defines the Dexie database (tables, indexes, version) and the canonical
 * Transaction / Category / TransactionType types plus the newId() helper.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Local-first: all app data lives in IndexedDB via Dexie; this is the single
 *     source of truth for the schema every other module depends on.
 * ? - Transactions and categories are separate tables; category name (not id) is
 *     the join key used by transactions, so renaming must cascade (see repository.ts).
 * ? - Category.icon stores a Tabler icon name string (nullable); colors are stored
 *     as CSS color strings, resolved at render time.
 * ? - IDs are UUIDs generated by newId(); createdAt is a Date.now() epoch number.
 *
 * AFFECTS:
 * ! - lib/db/repository.ts (CRITICAL: table definitions, types, and newId are its
 *     foundation — changing a column or index breaks every write operation)
 * ! - lib/hooks/useTransactions.ts (CRITICAL: queries `db.transactions` / `db.categories`
 *     and exposes the Transaction / Category types to the UI)
 * ? - lib/csv.ts (the CsvRow shape must stay parseable into Transaction)
 * ? - lib/validations/transaction.ts (its inferred input types must match these records)
 * ? - Every view/component that imports the Transaction / Category types
 *
 * AFFECTED BY:
 * ? - Dexie and uuid package versions (upgrades can change index/type behavior)
 *
 * ON FILE EDIT:
 * ! - npm run build (type errors surface anywhere the types are used)
 * ! - npm run lint
 * ? - Bump/verify Dexie version(...) when adding columns, or old installs lose data
 * ? - Verify index fields match the queries in useTransactions.ts
 * * - Adding a required field breaks CSV import, forms, and repository writes — check all
 */
```

- [ ] **Step 2: Prepend the header to `lib/db/repository.ts`**

Insert at the top, before `import { db, newId, type Transaction, type Category } from "./schema";`:

```ts
/**
 * FILE NAME: repository.ts
 *
 * ROLE: The only module that writes to IndexedDB — CRUD for transactions and
 * categories, plus CSV import (with dedupe), export, and category reassignment.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - All writes go through here so live queries in useTransactions.ts never
 *     perform rw transactions (a write inside a useLiveQuery callback throws ReadonlyError).
 * ? - updateCategory / importTransactions use one rw transaction so rename-cascade and
 *     batch import are atomic.
 * ? - Transactions reference categories by name, so rename cascades via
 *     db.transactions.where("category").equals(old).modify(...).
 * ? - Changing a category's type while it has transactions is rejected explicitly.
 *
 * AFFECTS:
 * ! - components/transactions/TransactionForm.tsx (CRITICAL: addTransaction / updateTransaction)
 * ! - components/settings/SettingsView.tsx (CRITICAL: addCategory, exportData, importTransactions,
 *     transactionCountForCategory)
 * ? - components/settings/DeleteCategoryDialog.tsx (deleteCategory, reassignCategory)
 * ? - components/settings/CategoryEditDialog.tsx (updateCategory)
 * ? - components/transactions/DeleteTransactionDialog.tsx (deleteTransaction)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (db, newId, types — any schema change ripples here)
 * ? - lib/validations/transaction.ts (transactionSchema validates imported rows; inputs typed)
 * ? - lib/csv.ts (CsvRow is the import source)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Re-verify import dedupe (existingIds vs batchIds), rename cascade, and type-lock logic
 * * - Never call a rw transaction from inside a useLiveQuery callback
 * * - Empty CSV / all-skipped imports must return imported=0 without partial writes
 */
```

- [ ] **Step 3: Prepend the header to `lib/hooks/useTransactions.ts`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: useTransactions.ts
 *
 * ROLE: Live-query React hooks (useCategories, useTransactions, useRecentTransactions)
 * that keep every screen reactive to IndexedDB changes.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Built on dexie-react-hooks' useLiveQuery so the UI updates automatically on write.
 * ? - Read-only by design: never perform a write inside a live query callback.
 * ? - Hooks return `Category[] | Transaction[] | undefined` — callers must coerce with `?? []`.
 * ? - useRecentTransactions orders by createdAt (insertion time), others by date.
 *
 * AFFECTS:
 * ! - components/dashboard/DashboardView.tsx (CRITICAL: consumes all three hooks)
 * ! - components/transactions/TransactionsView.tsx (CRITICAL: useTransactions)
 * ? - components/transactions/TransactionForm.tsx (useCategories)
 * ? - components/transactions/TransactionFilters.tsx (useCategories)
 * ? - components/settings/SettingsView.tsx (useCategories)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (db instance and the Transaction / Category types)
 * ? - dexie-react-hooks version
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify query index fields still match schema.ts indexes
 * * - A write introduced here inside useLiveQuery throws ReadonlyError at runtime
 */
```

- [ ] **Step 4: Prepend the header to `lib/hooks/useHydrated.ts`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: useHydrated.ts
 *
 * ROLE: Hydration gate that returns false during SSR and true after mount, so
 * theme-dependent renders never mismatch server and client markup.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Implemented with useSyncExternalStore: subscribe is a no-op, client snapshot is
 *     true, server snapshot is false — no setState inside useEffect (lint would reject it).
 *
 * AFFECTS:
 * ! - components/shared/Header.tsx (CRITICAL: gates the theme-toggle render)
 *
 * AFFECTED BY:
 * ? - react version (useSyncExternalStore API)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify SSR output renders the neutral placeholder (not sun/moon)
 * * - Do not convert to setState-in-effect — react-hooks/set-state-in-effect rejects it
 */
```

- [ ] **Step 5: Prepend the header to `lib/validations/transaction.ts`**

Insert at the top, before `import { z } from "zod";`:

```ts
/**
 * FILE NAME: transaction.ts
 *
 * ROLE: Zod schemas (transactionSchema, categorySchema) and their inferred input
 * types used by every form and by CSV import validation.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - transactionSchema coerces amount to a positive number and allows an optional id,
 *     so the same schema validates both forms and imported CSV rows.
 * ? - TransactionInput / CategoryInput are inferred (z.infer) so validation and types
 *     can never drift apart.
 *
 * AFFECTS:
 * ! - components/transactions/TransactionForm.tsx (CRITICAL: resolver + TransactionInput)
 * ! - lib/db/repository.ts (CRITICAL: safeParse gates every imported row)
 * ? - components/settings/SettingsView.tsx (categorySchema + CategoryInput)
 * ? - components/settings/CategoryEditDialog.tsx (categorySchema)
 *
 * AFFECTED BY:
 * ? - zod version
 * ? - lib/db/schema.ts (field shapes should mirror these)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Changing a field must be reflected in forms, repository writes, and import parsing
 * * - description max length (200) and amount positivity are user-facing messages — keep them
 */
```

- [ ] **Step 6: Prepend the header to `lib/format.ts`**

Insert at the top, before `const phpFormatter = new Intl.NumberFormat("en-PH", {`:

```ts
/**
 * FILE NAME: format.ts
 *
 * ROLE: Pure formatting/date helpers — PHP currency formatting, ISO date helpers,
 * quick date-range math, and a browser downloadFile() utility.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Currency uses Intl.NumberFormat with en-PH / PHP and fixed 2 decimals.
 * ? - All dates are ISO strings (YYYY-MM-DD) so lexicographic comparison works for ranges.
 * ? - rangeStartISO maps DateRange ("all" | "today" | "7d" | "1m") to a start date; "all" → null.
 *
 * AFFECTS:
 * ? - components/transactions/TransactionList.tsx (formatPeso, formatDisplayDate)
 * ? - components/dashboard/DashboardView.tsx (formatPeso, rangeStartISO, DateRange)
 * ? - components/settings/SettingsView.tsx (downloadFile, todayISO)
 * ? - components/transactions/TransactionForm.tsx (todayISO)
 * ? - components/transactions/TransactionFilters.tsx (rangeStartISO, DateRange)
 * ? - components/shared/RangeFilter.tsx (DateRange type)
 *
 * AFFECTED BY:
 * ? - Browser Intl support / locale data for en-PH
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify PHP peso format (₱, 2 decimals) and en-PH display dates
 * * - toISODate must produce zero-padded values or date-range comparisons break
 */
```

- [ ] **Step 7: Prepend the header to `lib/utils.ts`**

Insert at the top, before `import { clsx, type ClassValue } from "clsx"`:

```ts
/**
 * FILE NAME: utils.ts
 *
 * ROLE: cn() — the clsx + tailwind-merge class combiner used across the app.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - tailwind-merge resolves conflicting Tailwind utilities so later classes win.
 *
 * AFFECTS:
 * ? - app/layout.tsx (root <html> className)
 * ? - components/shared/RangeFilter.tsx, components/transactions/TransactionList.tsx
 * ? - Every component that conditionally composes utility classes
 *
 * AFFECTED BY:
 * ? - clsx and tailwind-merge versions
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify class conflicts still resolve last-wins
 */
```

- [ ] **Step 8: Prepend the header to `lib/csv.ts`**

Insert at the top, before `export interface CsvRow {`:

```ts
/**
 * FILE NAME: csv.ts
 *
 * ROLE: Parses an uploaded CSV of transactions into CsvRow[] (with quoted-field
 * handling, BOM stripping, and header-column mapping) for the import flow.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Hand-rolled parser (no dependency): handles quoted fields with "" escapes,
 *     skips blank lines and # comment lines, strips a leading BOM.
 * ? - Unknown/missing rows are skipped by importTransactions; missing required columns
 *     return an error string instead.
 *
 * AFFECTS:
 * ! - components/settings/SettingsView.tsx (CRITICAL: CSV import calls parseTransactionsCSV)
 * ? - lib/db/repository.ts (consumes CsvRow via importTransactions)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (row shape must map to Transaction)
 * ? - lib/validations/transaction.ts (rows are validated after parsing)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify quoted commas, "" escapes, BOM, and CRLF are handled
 * * - Header names are lowercased/trimmed — a renamed column silently stops importing
 */
```

- [ ] **Step 9: Verify no code changed and headers are at top**

Run:
```bash
git diff --stat
rg -l "FILE NAME:" lib
```
Expected: only `lib/` files changed; each of the 8 `lib/**` files reports a `FILE NAME:` line; `git diff` shows only added comment lines.

- [ ] **Step 10: Commit**

```bash
git add lib
git commit -m "docs: add agent notes headers to lib core modules"
```

---

### Task 3: Headers on app routes, globals.css, and theme-provider (6 files)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/transactions/page.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/globals.css`
- Modify: `components/theme-provider.tsx`

- [ ] **Step 1: Prepend the header to `app/layout.tsx`**

Insert at the top, before `import type { Metadata, Viewport } from "next";`:

```ts
/**
 * FILE NAME: layout.tsx
 *
 * ROLE: Root layout — loads fonts, sets metadata/viewport/manifest, and wraps every
 * route in the ThemeProvider and Toaster.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Fonts (Roboto/Inter/Geist) are loaded via next/font and exposed as CSS variables
 *     consumed by globals.css.
 * ? - suppressHydrationWarning is required on <html> because next-themes swaps classes.
 * ? - app is client-driven (force-dynamic pages); this layout is the server shell.
 *
 * AFFECTS:
 * ! - Every route: app/page.tsx, app/transactions/page.tsx, app/settings/page.tsx
 *     (CRITICAL: removing ThemeProvider or Toaster breaks theming/toasts app-wide)
 * ? - app/globals.css (font variables --font-sans / --font-geist-mono / --font-heading)
 *
 * AFFECTED BY:
 * ? - components/theme-provider.tsx (theme behavior)
 * ? - components/ui/sonner.tsx (Toaster)
 * ? - lib/utils.ts (cn for the <html> className)
 * ? - next.config.ts / tsconfig.json (next/font resolution, path alias)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify manifest, appleWebApp, and viewport (themeColor) still set
 * ? - Verify no hydration mismatch warnings (suppressHydrationWarning stays)
 */
```

- [ ] **Step 2: Prepend the header to `app/page.tsx`**

Insert at the top, before `import type { Metadata } from "next";`:

```ts
/**
 * FILE NAME: page.tsx
 *
 * ROLE: Dashboard route ("/") — renders DashboardView with page metadata.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - force-dynamic because all content is client-side data from IndexedDB.
 * ? - Renders DashboardView as the single component; ?add=1 linking is handled inside
 *     DashboardView via Link, not here.
 *
 * AFFECTS:
 * ? - components/dashboard/DashboardView.tsx (rendered here)
 *
 * AFFECTED BY:
 * ? - components/dashboard/DashboardView.tsx (any prop/behavior change is reflected here)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Keep force-dynamic and the page metadata title
 */
```

- [ ] **Step 3: Prepend the header to `app/transactions/page.tsx`**

Insert at the top, before `import type { Metadata } from "next";`:

```ts
/**
 * FILE NAME: page.tsx (app/transactions)
 *
 * ROLE: Transactions route ("/transactions") — renders TransactionsView with metadata.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - force-dynamic client view; the ?add=1 query param is consumed by TransactionsView.
 *
 * AFFECTS:
 * ? - components/transactions/TransactionsView.tsx (rendered here)
 *
 * AFFECTED BY:
 * ? - components/transactions/TransactionsView.tsx
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Keep force-dynamic and the metadata title
 */
```

- [ ] **Step 4: Prepend the header to `app/settings/page.tsx`**

Insert at the top, before `import type { Metadata } from "next";`:

```ts
/**
 * FILE NAME: page.tsx (app/settings)
 *
 * ROLE: Settings route ("/settings") — renders SettingsView with metadata.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - force-dynamic client view; data (categories) is loaded reactively in SettingsView.
 *
 * AFFECTS:
 * ? - components/settings/SettingsView.tsx (rendered here)
 *
 * AFFECTED BY:
 * ? - components/settings/SettingsView.tsx
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Keep force-dynamic and the metadata title
 */
```

- [ ] **Step 5: Prepend the header to `app/globals.css`**

Insert at the very top, before `@import "tailwindcss";`:

```css
/**
 * FILE NAME: globals.css
 *
 * ROLE: Global styles — Tailwind v4 entry, the maia theme token mapping (@theme inline),
 * light/dark CSS variables, and base-layer element styles.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Tailwind v4 style config: @theme inline maps semantic utility names to CSS vars.
 * ? - --primary is teal (income/positive) and --destructive is red (expense/negative);
 *     semantic tokens only — no hardcoded green/red utilities.
 * ? - Dark mode via the `.dark` class (set by next-themes attribute="class").
 *
 * AFFECTS:
 * ! - Every component using semantic tokens (--primary, --destructive, --muted, etc.)
 *     (CRITICAL: changing a token re-themes the whole app)
 * ? - components/theme-provider.tsx + app/layout.tsx (the .dark class + font variables)
 *
 * AFFECTED BY:
 * ? - components.json (shadcn "base-maia" preset this file was generated from)
 * ? - Tailwind CSS / tw-animate-css versions
 * ? - Font variables defined in app/layout.tsx
 *
 * ON FILE EDIT:
 * ! - npm run build (Tailwind compiles this)
 * ! - npm run lint
 * ? - Verify light AND dark contrast; income=teal primary, expense=destructive
 * * - Keep the header above the @import lines (CSS comments before @import are valid)
 */
```

If `npm run build` later fails with a CSS parse error at the top of globals.css, move the header block to AFTER the three `@import` lines instead (comment placement below imports is also valid) and re-run the build.
```

- [ ] **Step 6: Prepend the header to `components/theme-provider.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: theme-provider.tsx
 *
 * ROLE: Thin wrapper around next-themes ThemeProvider configuring class-based dark mode
 * with system default, used by the root layout.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - attribute="class" matches globals.css `.dark` selector; enableSystem follows the OS.
 * ? - Kept as a separate module so layout.tsx stays declarative and theme config is centralized.
 *
 * AFFECTS:
 * ! - app/layout.tsx (CRITICAL: wraps the whole app — breaking it breaks theming)
 *
 * AFFECTED BY:
 * ? - next-themes version
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify class toggling + system preference still work, no hydration mismatch
 */
```

- [ ] **Step 7: Verify and commit**

Run:
```bash
rg -l "FILE NAME:" app components/theme-provider.tsx
git diff --stat
```
Expected: all 6 files report a `FILE NAME:` line; diff adds comments only.

```bash
git add app components/theme-provider.tsx
git commit -m "docs: add agent notes headers to app shell and theme provider"
```

---

### Task 4: Headers on shared + dashboard components (5 files)

**Files:**
- Modify: `components/shared/Header.tsx`
- Modify: `components/shared/BottomNav.tsx`
- Modify: `components/shared/CategoryIcon.tsx`
- Modify: `components/shared/RangeFilter.tsx`
- Modify: `components/dashboard/DashboardView.tsx`

- [ ] **Step 1: Prepend the header to `components/shared/Header.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: Header.tsx
 *
 * ROLE: Sticky top bar with title/subtitle and a hydrated theme toggle (dark/light).
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Uses useHydrated() to gate the icon render — avoids hydration mismatch for the
 *     resolvedTheme-dependent toggle.
 * ? - lucide Moon/Sun icons; semantic tokens (bg-background/80 backdrop-blur) per theme.
 *
 * AFFECTS:
 * ! - components/dashboard/DashboardView.tsx, components/transactions/TransactionsView.tsx,
 *     components/settings/SettingsView.tsx (CRITICAL: all three pages render Header)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useHydrated.ts (hydration gating)
 * ? - next-themes (resolvedTheme/setTheme)
 * ? - components/ui/button.tsx (variant="ghost" size="icon")
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify no hydration mismatch and the toggle flips correctly
 * * - title/subtitle props must stay optional-safe for SettingsView (subtitle omitted)
 */
```

- [ ] **Step 2: Prepend the header to `components/shared/BottomNav.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: BottomNav.tsx
 *
 * ROLE: Fixed bottom navigation (Home / Transactions / Settings) with active-state
 * highlighting based on the current pathname.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Fixed positioning means page shells add pb-20 so content clears the nav.
 * ? - lucide icons; active link uses text-primary, inactive uses text-muted-foreground.
 *
 * AFFECTS:
 * ! - Every page shell (DashboardView, TransactionsView, SettingsView)
 *     (CRITICAL: all three render BottomNav and rely on its fixed height)
 *
 * AFFECTED BY:
 * ? - app route paths (/, /transactions, /settings) — adding a route changes this
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify active highlighting and that pb-20 shells still clear the nav
 */
```

- [ ] **Step 3: Prepend the header to `components/shared/CategoryIcon.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: CategoryIcon.tsx
 *
 * ROLE: Resolves a stored category icon-name string to a Tabler icon component,
 * falling back to IconTag for unknown names.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - The map is the ONLY place icon names are turned into components; unknown names
 *     silently fall back to IconTag so old data never crashes.
 * ? - Tabler icons (@tabler/icons-react), per the base-maia preset convention.
 *
 * AFFECTS:
 * ? - components/dashboard/DashboardView.tsx (spending breakdown icons)
 * ? - components/transactions/TransactionForm.tsx (category select icons)
 * ? - components/transactions/TransactionFilters.tsx (category select icons)
 * ? - components/settings/SettingsView.tsx (category row icons)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (Category.icon is the input name string)
 * ? - @tabler/icons-react version
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify every known icon name still maps and unknown names fall back gracefully
 * * - Adding a new category icon requires a new map entry here
 */
```

- [ ] **Step 4: Prepend the header to `components/shared/RangeFilter.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: RangeFilter.tsx
 *
 * ROLE: Four-button quick date-range selector (All time / Today / 7 days / 1 month).
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Pure controlled component: value + onChange, no internal state.
 * ? - Options are hardcoded to match the DateRange union in lib/format.
 *
 * AFFECTS:
 * ? - components/dashboard/DashboardView.tsx (spending breakdown range)
 * ? - components/transactions/TransactionFilters.tsx (filter range)
 *
 * AFFECTED BY:
 * ? - lib/format.ts (DateRange type)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify all four ranges map to the correct labels and values
 * * - Adding a range requires updating DateRange + rangeStartISO too
 */
```

- [ ] **Step 5: Prepend the header to `components/dashboard/DashboardView.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: DashboardView.tsx
 *
 * ROLE: Dashboard page — total balance, add-transaction shortcut, spending-by-category
 * breakdown with range filter, and recent transactions.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Registers the service worker (public/sw.js) in production only.
 * ? - Spending breakdown is computed client-side from useTransactions and filtered by
 *     rangeStartISO; bar colors use the category color or --primary fallback.
 * ? - Add-transaction button is a Link to "/transactions?add=1" via the Base UI
 *     Button render prop with nativeButton={false}.
 *
 * AFFECTS:
 * ? - app/page.tsx (rendered here)
 * ! - public/sw.js (CRITICAL: this file registers the service worker)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useTransactions.ts (useTransactions, useRecentTransactions, useCategories)
 * ? - lib/format.ts (formatPeso, rangeStartISO, DateRange)
 * ? - components/shared/ (Header, BottomNav, CategoryIcon, RangeFilter)
 * ? - lib/db/schema.ts (Transaction / Category types)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify SW registers only in production; breakdown math and bar widths correct
 * * - Recent-transactions list must handle an empty DB ("Add your first transaction")
 */
```

- [ ] **Step 6: Verify and commit**

Run:
```bash
rg -l "FILE NAME:" components/shared components/dashboard
git diff --stat
```
Expected: all 5 files report a `FILE NAME:` line; diff adds comments only.

```bash
git add components/shared components/dashboard
git commit -m "docs: add agent notes headers to shared and dashboard components"
```

---

### Task 5: Headers on transactions components (6 files)

**Files:**
- Modify: `components/transactions/TransactionsView.tsx`
- Modify: `components/transactions/TransactionList.tsx`
- Modify: `components/transactions/TransactionForm.tsx`
- Modify: `components/transactions/TransactionFilters.tsx`
- Modify: `components/transactions/TransactionDialog.tsx`
- Modify: `components/transactions/DeleteTransactionDialog.tsx`

- [ ] **Step 1: Prepend the header to `components/transactions/TransactionsView.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: TransactionsView.tsx
 *
 * ROLE: Transactions page orchestrator — filter state, list, add/edit/delete dialogs,
 * and the ?add=1 deep-link handling.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - add/edit/deleting are controlled by component state; ?add=1 in the URL opens the
 *     add dialog and closing it router.push("/transactions").
 * ? - dialogKey + editing.id drive React keys so each dialog instance resets cleanly.
 * ? - Filtering is memoized via applyFilters (from TransactionFilters).
 *
 * AFFECTS:
 * ! - app/transactions/page.tsx (CRITICAL: rendered by the route)
 * ? - components/transactions/TransactionFilters.tsx (consumes Filters / applyFilters)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useTransactions.ts (useTransactions)
 * ? - lib/db/schema.ts (Transaction type)
 * ? - lib/validations/transaction.ts (TransactionInput for edit prefill)
 * ? - components/transactions/TransactionFilters.tsx (Filters shape changes break this)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify add (?add=1), edit, delete flows and the "N shown" subtitle
 * * - URL param must not leave a stale ?add=1 in the address bar after closing
 */
```

- [ ] **Step 2: Prepend the header to `components/transactions/TransactionList.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: TransactionList.tsx
 *
 * ROLE: Renders a transaction list; each row shows an income/expense indicator, amount,
 * and ghost edit/delete icon buttons. Exports TransactionItem and TransactionList.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Row actions use Tabler icon buttons (IconPencil/IconTrash) with aria-labels instead
 *     of text badges.
 * ? - Income rows use text-primary (teal) and "+"; expense rows use text-destructive and "-".
 *
 * AFFECTS:
 * ? - components/transactions/TransactionsView.tsx (renders TransactionList)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (Transaction type)
 * ? - lib/format.ts (formatPeso, formatDisplayDate)
 * ? - lib/utils.ts (cn for row styling)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify aria-labels, empty state text, and +/- amount signs
 * * - Long descriptions must truncate without breaking layout
 */
```

- [ ] **Step 3: Prepend the header to `components/transactions/TransactionForm.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: TransactionForm.tsx
 *
 * ROLE: React Hook Form + Zod form for adding and editing transactions (type, amount,
 * category, date, description).
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - useWatch (not form.watch) drives the type/category selects — memo-safe for the
 *     React Compiler lint.
 * ? - When adding, the first category of the selected type is auto-selected after load.
 * ? - A local TextField helper wraps Input for number/date variants.
 *
 * AFFECTS:
 * ! - components/transactions/TransactionDialog.tsx (CRITICAL: rendered inside the dialog)
 *
 * AFFECTED BY:
 * ? - lib/validations/transaction.ts (transactionSchema, TransactionInput)
 * ? - lib/db/repository.ts (addTransaction, updateTransaction)
 * ? - lib/hooks/useTransactions.ts (useCategories)
 * ? - lib/format.ts (todayISO default date)
 * ? - components/shared/CategoryIcon.tsx (select option icons)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify edit prefill, auto-select first category, validation errors, and toasts
 * * - Editing keeps the existing id; switching type must not lose category selection
 */
```

- [ ] **Step 4: Prepend the header to `components/transactions/TransactionFilters.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: TransactionFilters.tsx
 *
 * ROLE: Search input + collapsible filter panel (range, type, category). Exports the
 * Filters interface and the pure applyFilters() predicate used by TransactionsView.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Search stays visible; the IconFilter button toggles the panel. Button is "default"
 *     when the panel is open OR any filter differs from its default.
 * ? - applyFilters is exported and kept pure so filtering is testable and memoizable.
 * ? - Category options render via CategoryIcon; type uses "all" | TransactionType.
 *
 * AFFECTS:
 * ! - components/transactions/TransactionsView.tsx (CRITICAL: consumes Filters and
 *     applyFilters — renaming fields or changing semantics breaks filtering)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useTransactions.ts (useCategories)
 * ? - lib/format.ts (rangeStartISO, DateRange)
 * ? - components/shared/RangeFilter.tsx and CategoryIcon.tsx
 * ? - lib/db/schema.ts (Transaction, TransactionType)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify search, range, type, and category filtering combine correctly
 * * - Base UI Select value/onValueChange are string | null — keep the `?? "all"` guards
 */
```

- [ ] **Step 5: Prepend the header to `components/transactions/TransactionDialog.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: TransactionDialog.tsx
 *
 * ROLE: Dialog wrapper for TransactionForm, used for both add and edit modes.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Pure presentation: open/onOpenChange/title/id/initial are passed through; the form
 *     closes the dialog via onDone → onOpenChange(false).
 *
 * AFFECTS:
 * ? - components/transactions/TransactionsView.tsx (renders it twice: add + edit)
 *
 * AFFECTED BY:
 * ? - components/transactions/TransactionForm.tsx
 * ? - components/ui/dialog.tsx
 * ? - lib/validations/transaction.ts (TransactionInput)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify both add and edit dialogs open/close correctly
 */
```

- [ ] **Step 6: Prepend the header to `components/transactions/DeleteTransactionDialog.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: DeleteTransactionDialog.tsx
 *
 * ROLE: Confirmation dialog for deleting a transaction, with success/error toasts.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Calls deleteTransaction and always closes via onOpenChange(false) afterward.
 *
 * AFFECTS:
 * ? - components/transactions/TransactionsView.tsx (rendered with the tx to delete)
 *
 * AFFECTED BY:
 * ? - lib/db/repository.ts (deleteTransaction)
 * ? - lib/db/schema.ts (Transaction type)
 * ? - components/ui/dialog.tsx, components/ui/button.tsx, sonner
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify toast on success and error; dialog closes in both cases
 */
```

- [ ] **Step 7: Verify and commit**

Run:
```bash
rg -l "FILE NAME:" components/transactions
git diff --stat
```
Expected: all 6 files report a `FILE NAME:` line; diff adds comments only.

```bash
git add components/transactions
git commit -m "docs: add agent notes headers to transactions components"
```

---

### Task 6: Headers on settings components (3 files)

**Files:**
- Modify: `components/settings/SettingsView.tsx`
- Modify: `components/settings/DeleteCategoryDialog.tsx`
- Modify: `components/settings/CategoryEditDialog.tsx`

- [ ] **Step 1: Prepend the header to `components/settings/SettingsView.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: SettingsView.tsx
 *
 * ROLE: Settings page — add/edit/delete categories, export CSV, and import CSV.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Add-category uses React Hook Form + categorySchema; type toggle drives a hidden
 *     form field.
 * ? - Edit/delete gates are async: transactionCountForCategory decides whether the
 *     category is in use before opening the respective dialog.
 * ? - Export builds the CSV inline (with an # Exported timestamp) and downloads via
 *     downloadFile with a date-stamped filename.
 * ? - Import reads the file, parses via parseTransactionsCSV, then importTransactions.
 *
 * AFFECTS:
 * ! - app/settings/page.tsx (CRITICAL: rendered by the route)
 * ? - components/settings/CategoryEditDialog.tsx and DeleteCategoryDialog.tsx (opened here)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useTransactions.ts (useCategories)
 * ? - lib/csv.ts (parseTransactionsCSV)
 * ? - lib/db/repository.ts (addCategory, exportData, importTransactions, transactionCountForCategory)
 * ? - lib/format.ts (downloadFile, todayISO)
 * ? - lib/validations/transaction.ts (categorySchema, CategoryInput)
 * ? - lib/db/schema.ts (Category type)
 * ? - components/shared/ (Header, BottomNav, CategoryIcon)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify add/rename/delete category flows and CSV import/export round-trip
 * * - Import must handle empty/invalid CSVs with a toast, not a crash
 */
```

- [ ] **Step 2: Prepend the header to `components/settings/DeleteCategoryDialog.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: DeleteCategoryDialog.tsx
 *
 * ROLE: Confirmation dialog for deleting a category; when transactions use it, requires
 * selecting a same-type category to reassign them first.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - If the category is in use (count > 0), delete is disabled until a reassign target
 *     is chosen; reassignCategory moves transactions before deleting.
 *
 * AFFECTS:
 * ? - components/settings/SettingsView.tsx (opened from the category list)
 *
 * AFFECTED BY:
 * ? - lib/db/repository.ts (deleteCategory, reassignCategory)
 * ? - lib/db/schema.ts (Category type)
 * ? - components/ui/dialog.tsx, components/ui/select.tsx, components/ui/button.tsx
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify the in-use path (reassign required) and the unused path (direct delete)
 * * - With no candidates, the Delete button must stay disabled
 */
```

- [ ] **Step 3: Prepend the header to `components/settings/CategoryEditDialog.tsx`**

Insert at the top, before `"use client";`:

```ts
/**
 * FILE NAME: CategoryEditDialog.tsx
 *
 * ROLE: Dialog to rename a category and optionally change its type; type is locked when
 * the category is in use.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Renaming relies on updateCategory's cascade (transactions follow the new name).
 * ? - useWatch (not form.watch) reads the type for the income/expense buttons.
 *
 * AFFECTS:
 * ? - components/settings/SettingsView.tsx (opened from the category list)
 *
 * AFFECTED BY:
 * ? - lib/db/repository.ts (updateCategory)
 * ? - lib/validations/transaction.ts (categorySchema, CategoryInput)
 * ? - lib/db/schema.ts (Category type)
 * ? - components/ui/dialog.tsx, components/ui/button.tsx, components/ui/input.tsx
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify rename cascades to transactions and type buttons are disabled when in use
 * * - updateCategory errors (e.g. "Category not found") must surface via toast
 */
```

- [ ] **Step 4: Verify and commit**

Run:
```bash
rg -l "FILE NAME:" components/settings
git diff --stat
```
Expected: all 3 files report a `FILE NAME:` line; diff adds comments only.

```bash
git add components/settings
git commit -m "docs: add agent notes headers to settings components"
```

---

### Task 7: Header on the service worker (1 file)

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Prepend the header to `public/sw.js`**

Insert at the top, before `const CACHE = "cash-guard-v2";`:

```js
/**
 * FILE NAME: sw.js
 *
 * ROLE: PWA service worker — caches the app shell on install, serves cached-first with
 * network fallback, and cleans up old cache versions on activate.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Cache-first for same-origin GET requests; cross-origin and non-GET are ignored.
 * ? - The CACHE name encodes a version ("cash-guard-v2"); bump it whenever the shell
 *     changes so activate() evicts stale caches.
 * ? - Offline navigation falls back to the cached "/" (the app shell).
 *
 * AFFECTS:
 * ! - Offline/PWA behavior of the whole app (CRITICAL: a broken SW breaks offline use)
 * ? - components/dashboard/DashboardView.tsx (registers this file in production)
 *
 * AFFECTED BY:
 * ? - public/ files listed in cache.addAll (/, manifest.webmanifest, icons)
 * ? - App shell changes (new routes/assets must be added to the cache list)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Bump the CACHE version string when the cache contents change
 * ? - Verify install/activate/fetch handlers still work after edits
 * * - Fetch handler must never cache POST or cross-origin requests
 */
```

- [ ] **Step 2: Verify and commit**

Run:
```bash
rg -l "FILE NAME:" public/sw.js
git diff --stat
```
Expected: `public/sw.js` reports a `FILE NAME:` line; diff adds comments only.

```bash
git add public/sw.js
git commit -m "docs: add agent notes header to service worker"
```

---

### Task 8: Final verification

**Files:** (none modified)

- [ ] **Step 1: Confirm every target file has a header**

Run:
```bash
rg -l "FILE NAME:" app components lib public
```
Expected: 29 files listed (5 app + 4 shared + 1 dashboard + 6 transactions + 3 settings + 1 theme-provider + 8 lib + 1 sw.js = 29). Confirm `components/ui` files are NOT in the list.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: TypeScript compiles and the production build completes. If a Node version error appears, prepend the user-local Node 22 first:
```powershell
$env:PATH = "$env:USERPROFILE\.local\node\bin;$env:PATH"
npm run build
```

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: clean — no errors or warnings.

- [ ] **Step 4: Confirm the diff is comment-only**

Run: `git diff --stat $(git rev-parse HEAD~7) HEAD`
Expected: the only changes across the 8 commits are added comment lines and the `AGENTS.md` section.

- [ ] **Step 5: Spot-check three headers against the code**

- `lib/db/schema.ts` header names `lib/db/repository.ts` and `lib/hooks/useTransactions.ts` as critical AFFECTS → confirm both import from `./schema`.
- `components/transactions/TransactionForm.tsx` header names `TransactionDialog` as critical AFFECTS → confirm it is imported by `components/transactions/TransactionDialog.tsx`.
- `app/globals.css` header notes the theme tokens → confirm `--primary` is teal and `--destructive` is red in the `:root` block.

---

## Verification (final, from AGENTS.md)

```bash
npm run build   # must pass TypeScript + production build
npm run lint    # must be clean
```

Always run both after changes and confirm output before claiming success.
