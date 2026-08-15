# Cash Guard — Project Guide for AI Agents

## What this is

A **mobile-first personal finance tracker PWA** built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Base UI, "maia" preset with Tabler icons), and Dexie for local storage.

**Key architectural fact: the app is local-first.** All data lives in the browser's IndexedDB via Dexie. There are **no API routes, no server database, no ORM, no environment secrets** — nothing is ever sent to a server. This keeps hosting free and makes it fully offline-capable.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
