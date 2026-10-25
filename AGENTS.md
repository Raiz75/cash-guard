# Cash Guard — Project Guide for AI Agents

## What this is

A **mobile-first personal finance tracker PWA** built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Base UI, "maia" preset with Tabler icons), Supabase (Postgres + Auth), and TanStack Query.

**Key architectural fact: the app is account-based and cloud-backed.** All data lives in a Supabase Postgres database, scoped per user via Row Level Security (RLS). There are **no API routes, no server actions, no server database of our own, no ORM** — the browser talks to Supabase directly through the publishable (anon) key, and RLS is the security boundary. The app is **online-only** for data (reads/writes require a connection), but the PWA shell stays installable and updatable offline. This keeps hosting free (Supabase free tier) while giving real accounts and cross-device sync.

**Live deployment:** the app is published at **https://cash-guard-jet.vercel.app**. Users install it from there (see "Downloading / installing the app" below). There is no staging environment — pushing to `main` and deploying on Vercel updates the live site.

## Setting up after pulling the repo

Fresh clone? Do this once:

```bash
# 1. Node.js >= 20.9 is required (Next.js 16). Verify before anything else.
node -v

# 2. Install dependencies
npm install

# 3. Copy the env template and fill in both values from your Supabase project
cp .env.example .env.local
# edit .env.local: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# 4. Create a Supabase project, then run supabase/migrations/20261024000000_init.sql
#    in the Supabase SQL Editor to create the tables + RLS policies.

# 5. Run the dev server
npm run dev
```

- Environment configuration is exactly two `NEXT_PUBLIC_*` values (see `.env.example`). Never add a service-role key to the app — the publishable key is public and RLS is the security boundary.
- `npm run build` runs `scripts/stamp-version.mjs` first, which stamps the SemVer from `package.json` into `public/sw.js`, `public/manifest.webmanifest`, and regenerates `lib/version.ts`. This is automatic and expected — the stamped files appear as working-tree changes and are committed with the release.
- The service worker only registers in production builds (`process.env.NODE_ENV === "production"`), so update-check behavior won't show in `next dev`.

## Downloading / installing the app (for users)

Cash Guard is a PWA — "download" means **install it to the home screen**:

1. Open **https://cash-guard-jet.vercel.app** in a browser.
2. **Android / Chrome:** use the browser menu → **Install app** (or "Add to Home screen"). **iOS / Safari:** Share → **Add to Home Screen**. **Desktop Chrome/Edge:** the install icon in the address bar.
3. Once installed it launches full-screen like a native app. The shell works offline; data requires a connection.

**Updating to a new version:** Cash Guard checks for updates on load. When a new version is deployed, open the app → **Settings → Update** → the status dot lights up → **Check for updates** → **Restart app**. There is no app-store update flow.

**Moving data between devices:** data lives in your Supabase account and syncs automatically once signed in. CSV export/import (Settings) remains available as a backup/migration aid.

## How data works

- **Types** (`lib/db/types.ts`): `TransactionType`, `Category`, `Transaction` (with both `categoryId` and a derived `category` display name), and `Budget` (per-category, with `categoryId`, `createdAt`/`updatedAt` epoch ms).
- **Client** (`lib/supabase/client.ts`): browser Supabase client built from the two `NEXT_PUBLIC_*` env vars.
- **Repository** (`lib/db/repository.ts`): the **only** module that touches Supabase/Postgres — CRUD for transactions, categories, budgets, monthly spend, CSV import/export, and category reassignment. Writes never send `user_id` (the DB defaults it to `auth.uid()`); every successful write ends with `invalidateFinance()` to refresh TanStack Query caches.
- **Hooks** (`lib/hooks/useTransactions.ts`, `lib/hooks/useBudget.ts`): TanStack Query hooks gated on the auth session (`enabled: !!session`) sharing the five query keys `["categories"]`, `["transactions"]`, `["budgets"]`, `["monthly-spent"]`, `["monthly-spent-by-category"]`. Writes invalidate the cache.
- **Auth** (`lib/auth/AuthProvider.tsx`): email + password only; `useAuth()` exposes the session; `AuthGate` guards data screens.
- **RLS:** all three tables (`transactions`, `categories`, `budgets`) live in `public` with UUID primary keys and `user_id uuid not null default auth.uid()`; RLS enabled, only `authenticated` has access.
- **No seeding / offline writes:** categories come only from user action (Add category form) or CSV import. Deleted categories stay deleted. The app does not write data while offline.
- **Backup/restore:** Settings → Export CSV / JSON. CSV import/export remains a backup feature even though data is cloud-synced.

## Conventions & gotchas

- **Node ≥ 20.9 is required** (Next.js 16). This machine currently runs Node 24 (`node -v` → v24.14.0).
- **shadcn preset is "base-maia"** (components.json `style: "base-maia"`, `iconLibrary: "tabler"`). Use Tabler icons (`@tabler/icons-react`), not lucide, for new UI.
- **Base UI differences:** the shadcn `Button` component uses Base UI. Polymorphism is via the `render` prop, not `asChild`. When rendering a non-`<button>` element (e.g. `<Link>`) via `render`, **set `nativeButton={false}`** to avoid the console warning.
- **Base UI Select** `value`/`onValueChange` are `string | null` — coerce with `?? ""`/`?? null` guards to satisfy TypeScript.
- **Theme:** next-themes provider wraps the app; `useHydrated()` (`lib/hooks/useHydrated.ts`, backed by `useSyncExternalStore`) must gate any theme-dependent render to avoid hydration mismatches. Do not use `setState` directly inside `useEffect` for this — the lint rule `react-hooks/set-state-in-effect` rejects it.
- **Theme colors:** use semantic tokens only — teal `--primary` for income/positive, `--destructive` for expense/negative. Do **not** hardcode `green-600`/`red-600` utilities (the maia preset is teal, not green).
- **Forms:** React Hook Form + Zod (`lib/validations/transaction.ts`). Use `useWatch` (memo-safe) instead of `form.watch` in render to keep React Compiler lint clean.
- **Pages:** dashboard (`/`), transactions (`/transactions`), settings (`/settings`) are `force-dynamic` client views. Shared shell: `Header`, `BottomNav`, centered `max-w-md` column with `pb-20` so content clears the fixed bottom nav.
- **No API routes / server actions:** all data access goes through `lib/db/repository.ts` against Supabase. Never ship a service-role key.
- **Query gating:** every query uses `enabled: !!session`; `refetchOnWindowFocus` and `refetchOnReconnect` stay enabled.
- **Legacy cleanup:** `lib/legacyCleanup.ts` deletes the old Dexie IndexedDB database (`cash-guard`) once at boot during the migration. Do not remove until all users have migrated.

## Testing

The app uses **Vitest** (the JS/TS equivalent of `php artisan test`) with `happy-dom` as the test environment and `@testing-library` available for DOM assertions.

- **Run the suite:** `npm test` (`npm test -- --watch` for interactive watch mode).
- **Where tests live:** colocated in the repo-root `tests/` folder, one `*.test.ts` file per module (e.g. `tests/repository.test.ts`, `tests/format.test.ts`, `tests/csv.test.ts`, `tests/transaction.test.ts`).
- **Config:** `vitest.config.mts` (ESM), `vitest.setup.ts` registers jest-dom matchers. The `@/*` tsconfig alias works inside tests.
- **Repository tests:** exercise `lib/db/repository.ts` against a chainable fake Supabase client (no network, no IndexedDB). No Dexie mocks.
- **Component tests:** wrap renders in a fresh `QueryClientProvider` with `retry: false` (and `gcTime: 0`) so cached query data never leaks between cases.
- **Convention (required on every feature):** when adding or changing a feature, add a `tests/<module>.test.ts` (or extend an existing one) with **multiple test cases** — at minimum the happy path, the expected failure/validation-rejection case, and the relevant edge case — so regressions are caught.

## Verification

```bash
npm run build   # must pass TypeScript + production build
npm run lint    # must be clean
npm test        # must pass — run the Vitest suite
```

Always run all three after changes and confirm output before claiming success.

## File Convention: AI-CONTEXT-NOTE (required on every code file)

Every code file (app routes, `components/` outside `components/ui/`, `lib/`, `scripts/`, `public/sw.js`) MUST begin with a token-efficient `AI-CONTEXT-NOTE` JSON header as the **first line** of the file. **Excluded:** `components/ui/*` boilerplate, config files, lockfiles, binary files, minified files, generated build artifacts, docs, README.

The JSON MUST be a single line with NO line breaks and NO spaces (no space after `:`, `,`, `{`, or `}` — only spaces inside string values). Severity markers: `!` = important, `!!` = high, `!!!` = highest (most critical).

Schema (wrap in the language's comment syntax — `/* ... */` for TS/TSX/CSS, `//` for .mjs, etc.):

```json
/* AI-CONTEXT-NOTE:{"R":"One sentence describing what this file does.","IDD":[{"?":"Key architectural decision 1"},{"?":"Key architectural decision 2"},{"?":"Why a certain approach was chosen"},{"?":"Trade-offs made"}],"A":[{"!!!":"Most critical file that depends on this","CRITICAL":"What breaks if this file changes"},{"!!":"High-priority file","How it's affected"},{"!":"Important file","How it's affected"},{"?":"Secondary file","How it's affected"}],"AB":[{"?":"Config/ENV file","What changes to it impact this file"},{"?":"Another file/dependency","What changes impact this file"}],"E":[{"!!!":"Most critical test that MUST run first"},{"!!":"High-priority check/test"},{"!":"Important test to run"},{"?":"What behavior to verify"},{"*":"What edge cases to double-check"}]} */
```

Key map:

- `R` — ROLE: one sentence describing what this file does.
- `IDD` — IMPORTANT DEVELOPER DECISIONS: key architectural decisions, why chosen, trade-offs.
- `A` — AFFECTS: critical/high/important/secondary files that depend on this.
- `AB` — AFFECTED BY: config/ENV files and dependencies that impact this file.
- `E` — ON FILE EDIT: tests/checks/behaviors/edge cases to verify when editing.
- `CRITICAL` — what breaks if an `A` entry changes.

Editing rules:

- **Keep headers current:** whenever a file is edited, update `R` if the purpose changed, `A`/`AB` if dependencies changed, and `E` with the actual checks — so the notes always match the code. Never leave a stale header behind.
- **Never delete an existing `AI-CONTEXT-NOTE`** when editing a file.
- **Never leave placeholders** (`[INSERT]`, empty values) — fill in real per-file analysis; omit sections that don't apply.
- Red (`!`/`!!`/`!!!`) items are CRITICAL and cannot be skipped; blue (`?`) items are important but not blocking; green (`*`) items are nice-to-have.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
