# Cash Guard — Project Guide for AI Agents

## What this is

A **mobile-first personal finance tracker PWA** built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Base UI, "maia" preset with Tabler icons), and Dexie for local storage.

**Key architectural fact: the app is local-first.** All data lives in the browser's IndexedDB via Dexie. There are **no API routes, no server database, no ORM, no environment secrets** — nothing is ever sent to a server. This keeps hosting free and makes it fully offline-capable.

**Live deployment:** the app is published at **https://cash-guard-jet.vercel.app**. Users install it from there (see "Downloading / installing the app" below). There is no staging environment — pushing to `main` and deploying on Vercel updates the live site.

## Setting up after pulling the repo

Fresh clone? Do this once:

```bash
# 1. Node.js >= 20.9 is required (Next.js 16). Verify before anything else.
node -v

# 2. Install dependencies
npm install

# 3. Run the dev server (no env vars, no DB to provision)
npm run dev
```

- There is **no `.env` file and no environment configuration** — nothing to copy, fill in, or mint. If a setup guide mentions secrets, it's describing a different project.
- `npm run build` runs `scripts/stamp-version.mjs` first, which stamps the SemVer from `package.json` into `public/sw.js`, `public/manifest.webmanifest`, and regenerates `lib/version.ts`. This is automatic and expected — the stamped files appear as working-tree changes and are committed with the release.
- The service worker only registers in production builds (`process.env.NODE_ENV === "production"`), so update-check behavior won't show in `next dev`.

## Downloading / installing the app (for users)

Cash Guard is a PWA — "download" means **install it to the home screen**:

1. Open **https://cash-guard-jet.vercel.app** in a browser.
2. **Android / Chrome:** use the browser menu → **Install app** (or "Add to Home screen"). **iOS / Safari:** Share → **Add to Home Screen**. **Desktop Chrome/Edge:** the install icon in the address bar.
3. Once installed it launches full-screen like a native app and works offline.

**Updating to a new version:** Cash Guard checks for updates on load. When a new version is deployed, open the app → **Settings → Update** → the status dot lights up → **Check for updates** → **Restart app**. There is no app-store update flow.

**Moving data between devices:** data lives in the browser. Export via **Settings → Export CSV / Download JSON backup**, then import on the other device.

## How data works

- **Schema** (`lib/db/schema.ts`): two Dexie tables — `transactions` (type income/expense, amount, category, description, date, createdAt) and `categories` (name, type, icon as a Tabler icon *name string*, color).
- **Repository** (`lib/db/repository.ts`): the only module that touches IndexedDB — CRUD for transactions and categories, plus data export.
- **Hooks** (`lib/hooks/useTransactions.ts`): `useLiveQuery` drives the UI reactively.
- **No seeding**: the DB starts empty. There is no `seedIfEmpty` / defaults list — categories come only from user action (Add category form) or CSV import. Deleted categories stay deleted. **Never call a write (rw) transaction inside a `useLiveQuery` callback** — live queries are read-only and this throws a `ReadonlyError`.
- **Backup/restore**: Settings → Export CSV / JSON. Data is per-browser; moving devices requires exporting/importing.

## Conventions & gotchas

- **Node ≥ 20.9 is required** (Next.js 16). The user's system Node is 18 — use `~/.local/node/bin` (a user-local Node 22 install) on this machine.
- **shadcn preset is "base-maia"** (components.json `style: "base-maia"`, `iconLibrary: "tabler"`). Use Tabler icons (`@tabler/icons-react`), not lucide, for new UI.
- **Base UI differences:** the shadcn `Button` component uses Base UI. Polymorphism is via the `render` prop, not `asChild`. When rendering a non-`<button>` element (e.g. `<Link>`) via `render`, **set `nativeButton={false}`** to avoid the console warning.
- **Base UI Select** `value`/`onValueChange` are `string | null` — coerce with `?? ""`/`?? null` guards to satisfy TypeScript.
- **Theme:** next-themes provider wraps the app; `useHydrated()` (`lib/hooks/useHydrated.ts`, backed by `useSyncExternalStore`) must gate any theme-dependent render to avoid hydration mismatches. Do not use `setState` directly inside `useEffect` for this — the lint rule `react-hooks/set-state-in-effect` rejects it.
- **Theme colors:** use semantic tokens only — teal `--primary` for income/positive, `--destructive` for expense/negative. Do **not** hardcode `green-600`/`red-600` utilities (the maia preset is teal, not green).
- **Forms:** React Hook Form + Zod (`lib/validations/transaction.ts`). Use `useWatch` (memo-safe) instead of `form.watch` in render to keep React Compiler lint clean.
- **Pages:** dashboard (`/`), transactions (`/transactions`), settings (`/settings`) are `force-dynamic` client views. Shared shell: `Header`, `BottomNav`, centered `max-w-md` column with `pb-20` so content clears the fixed bottom nav.

## Verification

```bash
npm run build   # must pass TypeScript + production build
npm run lint    # must be clean
```

Always run both after changes and confirm output before claiming success.
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
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Keep every entry on one line (no wrapped continuations) so Better Comments highlights the full line
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
