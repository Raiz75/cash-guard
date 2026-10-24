# Cash Guard Supabase Cloud Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Dexie/IndexedDB with Supabase Postgres + Auth, using TanStack Query for all reads, so each user's finances live in the cloud behind RLS and are reachable from any device.

**Architecture:** Client-only Next.js app. `lib/supabase/client.ts` exposes one browser Supabase client; `lib/db/repository.ts` is the only module that talks to Postgres. TanStack Query hooks wrap repository reads, and repository writes invalidate the shared query cache. `AuthProvider` + `AuthGate` gate the app shell, and `app/layout.tsx` provides the query client.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui (base-maia, Tabler icons), `@supabase/supabase-js` v2, `@tanstack/react-query` v5, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-24-supabase-cloud-migration-design.md`

## Global Constraints

- Node.js >= 20.9 (`node -v` before starting; this machine currently runs v24).
- Supabase env vars are exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Never place a service-role key in the app. The publishable key is public; RLS is the security boundary.
- No Next.js route handlers, server actions, API routes, or server-rendered user data.
- All tables live in `public`, use UUID primary keys, and carry `user_id uuid not null default auth.uid()`.
- RLS is enabled on all three tables; only `authenticated` has access; `anon` is revoked.
- Email + password auth only. No social login, MFA, password reset, or account-management screens.
- Online-only: no offline data store. Keep PWA shell/update behavior, but never cache Supabase responses in the service worker.
- Query keys are exactly `["categories"]`, `["transactions"]`, `["budgets"]`, `["monthly-spent"]`, `["monthly-spent-by-category"]`.
- `refetchOnWindowFocus` and `refetchOnReconnect` stay enabled; every query uses `enabled: !!session`.
- CSV import chunks inserts at 500 rows.
- Target release version is `2.0.0`.
- Every touched code file keeps/updates its first-line `AI-CONTEXT-NOTE` (JSON, single line, no spaces outside string values).
- Every task ends with `npm test`, `npm run build`, and `npm run lint` passing before its commit.

## Review Focus

These are the failure modes the spec implies but no single requirement names. Each has a test added in the task that owns the code.

1. **Sign-out / account switch must not leak the previous user's cached finance data.** `AuthProvider` clears the query cache when the user id changes, and the sign-out test asserts it.
2. **A failed write while offline must surface an error, never a success toast.** Repository errors propagate; `TransactionForm` has an explicit save-rejection test.
3. **Missing or misconfigured Supabase env vars must produce a readable message, not a blank screen.** `getSupabase` throws a named error and `AuthGate` renders it.
4. **Category resolution must handle case/whitespace variants and reject duplicate names readably.** Repository tests cover `" food "` → `"Food"` and Postgres `23505` mapping.
5. **CSV import must handle non-UUID/missing ids and large files.** Repository tests assert generated UUIDs and 500-row chunks.

---

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `.env.example` | Documents the two public Supabase env vars. |
| `supabase/migrations/20261024000000_init.sql` | One-time schema, indexes, trigger, RLS, grants. |
| `lib/supabase/client.ts` | Lazy singleton browser Supabase client; config validation. |
| `lib/db/types.ts` | `TransactionType`, `Category`, `Transaction`, `Budget`. |
| `lib/query/client.ts` | Shared `QueryClient`, `financeKeys`, `invalidateFinance()`. |
| `components/providers/QueryProvider.tsx` | Client wrapper around `QueryClientProvider`. |
| `lib/auth/AuthProvider.tsx` | Session context, auth subscription, cache clear on user change. |
| `components/auth/AuthGate.tsx` | Loading / config-error / signed-out / signed-in shell. |
| `components/auth/AuthScreen.tsx` | Sign in / Create account tabs. |
| `components/shared/OfflineBanner.tsx` | `online`/`offline` listener banner. |
| `lib/hooks/useFinanceError.ts` | Reactive finance-query error reader + retry. |
| `components/shared/DataError.tsx` | Error message + Retry button. |
| `lib/legacyCleanup.ts` | One-time deletion of the old `cash-guard` IndexedDB. |
| `tests/auth.test.ts`, `tests/offline.test.ts`, `tests/dataError.test.ts`, `tests/legacyCleanup.test.ts`, `tests/hooks.test.ts`, `tests/settingsAccount.test.ts`, `tests/supabaseClient.test.ts` | New coverage. |

**Modified**

| File | Change |
| --- | --- |
| `package.json`, `package-lock.json` | Swap Dexie/uuid deps for Supabase + TanStack Query; version `2.0.0`. |
| `.gitignore` | Allow `.env.example`. |
| `lib/db/repository.ts` | Full Supabase rewrite, same public names (plus `listTransactions`). |
| `lib/hooks/useTransactions.ts`, `lib/hooks/useBudget.ts` | TanStack Query hooks. |
| `app/layout.tsx` | QueryProvider + AuthProvider + AuthGate. |
| `components/dashboard/DashboardView.tsx`, `components/budget/BudgetView.tsx` | Use `budget.categoryId`. |
| `components/transactions/TransactionForm.tsx` | Budget lookup by `categoryId`. |
| `components/settings/SettingsView.tsx` | Id-based counts; Account card. |
| `components/settings/DeleteCategoryDialog.tsx` | Id-based reassignment target. |
| `components/settings/CategoryEditDialog.tsx` | Copy reflects id-based categories. |
| `components/transactions/TransactionsView.tsx`, `TransactionList.tsx`, `TransactionFilters.tsx`, `DeleteTransactionDialog.tsx`, `TransactionDialog.tsx` | Type imports only. |
| `lib/spending.ts`, `lib/csv.ts`, `lib/validations/transaction.ts`, `components/shared/CategoryIcon.tsx` | Type/note updates. |
| `tests/repository.test.ts`, `tests/budgetView.test.ts`, `tests/categoryBudgetView.test.ts`, `tests/transactionFormToast.test.ts`, `tests/spending.test.ts` | Rewrite/update mocks and fixtures. |
| `AGENTS.md`, `CLAUDE.md`, `README.md` | Cloud-first architecture docs. |

**Deleted**

- `lib/db/schema.ts`

---

### Task 1: Supabase Foundation

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `supabase/migrations/20261024000000_init.sql`
- Create: `lib/supabase/client.ts`
- Create: `lib/db/types.ts`
- Create: `lib/query/client.ts`
- Create: `components/providers/QueryProvider.tsx`
- Create: `tests/supabaseClient.test.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `lib/db/types.ts`: `TransactionType = "income" | "expense"`, `Category`, `Transaction`, `Budget` exactly as in the spec.
  - `lib/supabase/client.ts`: `getSupabase(): SupabaseClient`.
  - `lib/query/client.ts`: `queryClient: QueryClient`, `financeKeys`, `invalidateFinance(): Promise<void>`.
  - `components/providers/QueryProvider.tsx`: `QueryProvider({ children })`.

- [ ] **Step 1: Add dependencies**

Run:
```bash
npm install @supabase/supabase-js @tanstack/react-query
```
Keep Node >= 20.9. Do not add `@supabase/ssr` — there is no server data layer.

Do **not** uninstall Dexie here: `lib/db/schema.ts` and the live-query hooks still import `dexie`, `dexie-react-hooks`, and `uuid` until Tasks 4 and 8, so removing them now would break `npm run build`. The removal is Task 8 Step 6.

- [ ] **Step 2: Write the failing client test**

Create `tests/supabaseClient.test.ts`:
```ts
/* AI-CONTEXT-NOTE:{"R":"Tests lib/supabase/client.ts — missing env vars produce a readable error and repeated calls reuse one browser client.","IDD":[{"?":"vi.resetModules + dynamic import so module-scope env reads and the cached client are re-evaluated per test"},{"?":"vi.stubEnv supplies NEXT_PUBLIC_* values without touching the developer's .env.local"}],"A":[{"!!":"lib/supabase/client.ts","CRITICAL":"config validation and singleton behavior are asserted here"}],"AB":[{"?":"vitest.config.mts","dynamic import resolution through the @/* alias"}],"E":[{"!!":"npm test -- tests/supabaseClient.test.ts"},{"?":"Missing URL or key throws /Supabase is not configured/"},{"*":"Repeated getSupabase() calls return the exact same object"}]} */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabase", () => {
  it("throws a readable error when env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const { getSupabase } = await import("@/lib/supabase/client");

    expect(() => getSupabase()).toThrow("Supabase is not configured");
  });

  it("returns the same client for repeated calls", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");

    const { getSupabase } = await import("@/lib/supabase/client");

    expect(getSupabase()).toBe(getSupabase());
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- tests/supabaseClient.test.ts`
Expected: FAIL — cannot resolve `@/lib/supabase/client`.

- [ ] **Step 4: Create `lib/supabase/client.ts`**

Module-scope env reads (Next.js statically inlines `NEXT_PUBLIC_*`), lazy client creation, and one cached instance:
```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
```

- [ ] **Step 5: Create `lib/db/types.ts`**

Copy the spec's type block verbatim:
```ts
export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  category: string; // derived display name from categories(name)
  description: string | null;
  date: string;
  createdAt: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 6: Create `lib/query/client.ts`**

```ts
export const financeKeys = {
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
  budgets: ["budgets"] as const,
  monthlySpent: ["monthly-spent"] as const,
  monthlySpentByCategory: ["monthly-spent-by-category"] as const,
} as const;

export const queryClient: QueryClient = /* globalThis-cached in dev, otherwise one instance */;
export async function invalidateFinance(): Promise<void> {
  await queryClient.invalidateQueries();
}
```
Defaults: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`.
Cache the instance on `globalThis` when `NODE_ENV !== "production"` so HMR does not create duplicate clients.

- [ ] **Step 7: Create `components/providers/QueryProvider.tsx`**

`"use client"` wrapper:
```tsx
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```
This is required because `QueryClientProvider` uses React context and root layout is a Server Component.

- [ ] **Step 8: Create `.env.example` and unignore it**

`.env.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```
In `.gitignore`, keep `.env*` and add `!.env.example` directly below it.

- [ ] **Step 9: Create the migration SQL**

Create `supabase/migrations/20261024000000_init.sql` with exactly this schema:
```sql
-- Cash Guard 2.0. Run once in the Supabase SQL Editor.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index categories_user_type_name_key
  on public.categories (user_id, type, lower(name));

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid not null,
  description text,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_category_fk
    foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete restrict
);

create index transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index transactions_user_category_idx
  on public.transactions (user_id, category_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id),
  constraint budgets_category_fk
    foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade
);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy categories_select_own on public.categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.categories
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy transactions_select_own on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy budgets_select_own on public.budgets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy budgets_insert_own on public.budgets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy budgets_update_own on public.budgets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy budgets_delete_own on public.budgets
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.categories, public.transactions, public.budgets
  to authenticated;

revoke all
  on public.categories, public.transactions, public.budgets
  from anon;
```
The named FK constraints (`transactions_category_fk`, `budgets_category_fk`) are required so the repository can use deterministic PostgREST embed hints.

- [ ] **Step 10: Run the client test and build**

Run:
```bash
npm test -- tests/supabaseClient.test.ts
npm run build
npm run lint
```
Expected: PASS. Build must still pass because no existing module imports the new files yet.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example supabase/migrations/20261024000000_init.sql lib/supabase/client.ts lib/db/types.ts lib/query/client.ts components/providers/QueryProvider.tsx tests/supabaseClient.test.ts
git commit -m "feat(supabase): add client, schema migration, query client, and shared types"
```

---

### Task 2: Repository Rewrite

**Files:**
- Modify: `lib/db/repository.ts`
- Rewrite: `tests/repository.test.ts`

**Interfaces:**
- Consumes: `getSupabase`, `Category`/`Transaction`/`Budget`/`TransactionType`, `financeKeys`/`invalidateFinance`, `monthRange`, `transactionSchema`/`TransactionInput`/`CategoryInput`, `CsvRow`.
- Produces (public names kept except where noted):
  - `listCategories(): Promise<Category[]>`
  - `listTransactions(): Promise<Transaction[]>` — **new**, needed by the hook layer.
  - `addTransaction(input: TransactionInput): Promise<Transaction>`
  - `updateTransaction(id: string, input: TransactionInput): Promise<void>`
  - `deleteTransaction(id: string): Promise<void>`
  - `addCategory(input: CategoryInput): Promise<Category>`
  - `updateCategory(id: string, input: CategoryInput): Promise<void>`
  - `deleteCategory(id: string): Promise<void>`
  - `transactionCountForCategory(categoryId: string): Promise<number>` — **signature changed from name to id**
  - `reassignCategory(fromCategoryId: string, toCategoryId: string): Promise<void>` — **changed from names to ids**
  - `getCategoryBudgets(): Promise<Budget[]>`
  - `setCategoryBudget(categoryId: string, amount: number): Promise<void>`
  - `deleteCategoryBudget(categoryId: string): Promise<void>`
  - `getMonthlySpent(): Promise<number>`
  - `getMonthlySpentByCategory(): Promise<Record<string, number>>`
  - `exportData(): Promise<{ transactions: Transaction[]; categories: Category[] }>`
  - `importTransactions(rows: CsvRow[]): Promise<{ imported: number; skipped: number; createdCategories: string[] }>`

- [ ] **Step 1: Write the fake Supabase client and failing tests**

Rewrite `tests/repository.test.ts` around a chainable fake. Mock only the client module:
```ts
const { client, state } = vi.hoisted(() => { /* ... */ });

vi.mock("@/lib/supabase/client", () => ({ getSupabase: () => client }));
vi.mock("@/lib/query/client", () => ({
  invalidateFinance: vi.fn(async () => {}),
  financeKeys: {},
}));
```

The fake contract:
- `from(table)` returns a builder; every chain method returns the builder.
- Supported methods: `select(columns, options?)`, `insert(payload)`, `upsert(payload, options?)`, `update(patch)`, `delete()`, `eq(col, value)`, `gte(col, value)`, `lte(col, value)`, `order(col, { ascending })`, `limit(n)`, `single()`, `maybeSingle()`.
- The builder is thenable: awaiting it executes the recorded operation and resolves `{ data, error, count }`.
- Table stores live in `state.tables.categories | transactions | budgets`; each inserted row gets a UUID `id` when absent and ISO `created_at`/`updated_at`.
- `upsert` on `budgets` conflicts on `category_id` (single-user test store), updating `amount`/`updated_at` and preserving `created_at`.
- Selecting from `transactions` with an embedded `categories!transactions_category_fk(name)` column attaches `{ categories: { name } }` resolved through `category_id`.
- `state.failNext = { code, message }` makes the next operation resolve `{ data: null, error: state.failNext }` once, then clears it.
- `state.inserts` records `{ table, rows }` for every insert/upsert so import chunk sizes can be asserted.

Tests to write (keep the existing suite's intent, drop the old `cat:` helpers):
- **Categories:** list maps rows; `addCategory` trims; duplicate insert (`23505`) throws `"A category with that name already exists"`.
- **updateCategory:** renames without touching transactions; rejects type change when a transaction uses the id with `"Cannot change type while the category is in use"`; missing id throws `"Category not found"`.
- **deleteCategory:** deletes by id; `23503` throws `"This category is used by transactions. Move them first."`.
- **Transactions:** `addTransaction` resolves `" food "` to the stored `"Food"` category and inserts its `category_id`; unknown category throws `Category "Nope" not found`; `listTransactions` maps amount with `Number(...)`, `created_at` with epoch ms, and the embedded category name; update/delete call the right filters.
- **Counting/reassignment:** `transactionCountForCategory("c1")` counts only that id; `reassignCategory("c1","c2")` updates `category_id`.
- **Budgets:** list maps `category_id` → `categoryId` and ISO timestamps → epoch ms; `setCategoryBudget` rejects blank id (`"Choose a category"`) and non-positive amount (`"Amount must be greater than 0"`), then upserts with `onConflict: "user_id,category_id"`; delete filters `category_id`.
- **Monthly spend:** `getMonthlySpent()` sums only `type=eq.expense` rows whose date is within `monthRange()` (fake timers pin the month); returns 0 for no expenses. `getMonthlySpentByCategory()` groups by embedded category name.
- **Export:** returns both lists.
- **Import:**
  - valid rows create missing categories and insert transactions, returning counts and created names;
  - invalid rows are skipped;
  - duplicate existing UUIDs and duplicate UUIDs within the batch are skipped;
  - `"FOOD"` reuses stored `"Food"`;
  - rows with missing ids or non-UUID ids (`"legacy-1"`, `"abc"`) are inserted with a fresh UUID matching the UUID regex;
  - 1201 valid rows produce **transaction** insert chunks of `500`, `500`, `201` (filter `state.inserts` to `table === "transactions"`);
  - an empty batch performs no writes and returns `{ imported: 0, skipped: 0, createdCategories: [] }`.
- **Error propagation:** a PostgREST error on `listCategories` throws its message.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/repository.test.ts`
Expected: FAIL — old Dexie implementation has none of the new behavior.

- [ ] **Step 3: Implement `lib/db/repository.ts`**

Implementation decisions:
- Constants:
  ```ts
  const TRANSACTION_SELECT =
    "id, type, amount, category_id, description, date, created_at, categories!transactions_category_fk(name)";
  const CHUNK_SIZE = 500;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  ```
- Helpers:
  - `toError(error, fallback)` → `new Error(error.message?.trim() || fallback)`.
  - `categoryError(error)` → duplicate message on `23505`, else `toError`.
  - `deleteCategoryError(error)` → in-use message on `23503`, else `toError`.
  - `mapTransactionRow(row)` → `{ id, type, amount: Number(row.amount), categoryId: row.category_id, category: embeddedName(row.categories), description, date, createdAt: new Date(row.created_at).getTime() }`.
  - `mapBudgetRow(row)` → `{ id, categoryId: row.category_id, amount: Number(row.amount), createdAt: ..., updatedAt: ... }`.
  - `resolveCategory(type, name)` → call `listCategories()`, find `c.type === type && c.name.trim().toLowerCase() === name.trim().toLowerCase()`; throw `Category "${name.trim()}" not found` when missing. Do **not** send `user_id` on writes.
- Reads:
  - `listCategories`: `.select("id, name, type, icon, color").order("name", { ascending: true })`.
  - `listTransactions`: `.select(TRANSACTION_SELECT).order("date", { ascending: false }).order("created_at", { ascending: false })`.
  - `getCategoryBudgets`: `.select("id, category_id, amount, created_at, updated_at").order("created_at", { ascending: true })`.
  - `transactionCountForCategory`: `.select("id").eq("category_id", categoryId)`, return `data?.length ?? 0`.
  - `getMonthlySpent`: `.select("amount").eq("type","expense").gte("date",start).lte("date",end)`, sum `Number`.
  - `getMonthlySpentByCategory`: `TRANSACTION_SELECT` with the same filters, group by `category`.
  - `exportData`: `Promise.all([listTransactions(), listCategories()])`.
- Writes:
  - `addCategory`: insert `{ name: input.name.trim(), type: input.type }`, `.select("id, name, type, icon, color").single()`.
  - `updateCategory`: fetch `{ id, name, type }` by id with `.maybeSingle()`; null → `"Category not found"`; if type changed and `transactionCountForCategory(id) > 0` → reject; update `{ name: trimmed, type }`.
  - `deleteCategory`: `.delete().eq("id", id)`.
  - `reassignCategory`: `.update({ category_id: toCategoryId }).eq("category_id", fromCategoryId)`.
  - `addTransaction`: resolve category, insert `{ type, amount, category_id, description: input.description?.trim() || null, date }`, `.select("id, type, amount, category_id, description, date, created_at").single()`, then return the mapped row with `category` set to the resolved canonical name.
  - `updateTransaction`: resolve category, `.update({...}).eq("id", id)`.
  - `deleteTransaction`: `.delete().eq("id", id)`.
  - `setCategoryBudget`: validate first; `.upsert({ category_id, amount }, { onConflict: "user_id,category_id" })`.
  - `deleteCategoryBudget`: `.delete().eq("category_id", categoryId)`.
  - Every successful write ends with `await invalidateFinance()`.
- `importTransactions` algorithm:
  1. Fetch existing transaction ids (`.select("id")`) and existing categories (`listCategories()`).
  2. `safeParse` each row with `transactionSchema`; invalid → `skipped++`.
  3. For a UUID id already in the existing set or batch set (compare lowercased) → `skipped++`.
  4. For a missing/non-UUID id → `crypto.randomUUID()`; add to the batch set.
  5. Resolve `${type}:${name.trim().toLowerCase()}` against the category map; if absent, add to a `newCategories` map (storing the trimmed display name) and `createdCategories`.
  6. Batch-insert new categories once with `.insert([...]).select("id, name, type")` and merge returned ids into the map.
  7. Build transaction rows with the resolved `category_id`; insert in chunks of `CHUNK_SIZE`; add each successful chunk length to `imported`.
  8. Return `{ imported, skipped, createdCategories: [...createdCategories] }`; call `invalidateFinance()` once at the end.
  - Empty valid set returns immediately without writes.

- [ ] **Step 4: Run the repository tests**

Run: `npm test -- tests/repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full verification for the task**

Run:
```bash
npm test
npm run build
npm run lint
```
Expected: PASS. The old hooks still compile against the still-present `lib/db/schema.ts`; only the repository's data path moved.

- [ ] **Step 6: Commit**

```bash
git add lib/db/repository.ts tests/repository.test.ts
git commit -m "refactor(db): replace Dexie repository with Supabase PostgREST and RLS-backed queries"
```

---

### Task 3: Auth, App Shell, Offline/Error UX

**Files:**
- Create: `lib/auth/AuthProvider.tsx`
- Create: `components/auth/AuthGate.tsx`
- Create: `components/auth/AuthScreen.tsx`
- Create: `components/shared/OfflineBanner.tsx`
- Create: `components/shared/DataError.tsx`
- Create: `lib/hooks/useFinanceError.ts`
- Create: `lib/legacyCleanup.ts`
- Modify: `app/layout.tsx`
- Create: `tests/auth.test.ts`, `tests/offline.test.ts`, `tests/dataError.test.ts`, `tests/legacyCleanup.test.ts`

**Interfaces:**
- Consumes: Task 1's `getSupabase`, `queryClient`/`financeKeys`.
- Produces:
  - `AuthContextValue = { session: Session | null; loading: boolean; configError: string | null }`
  - `AuthProvider({ children })`, `useAuth(): AuthContextValue`
  - `AuthGate({ children })`, `AuthScreen()`
  - `OfflineBanner()`, `DataError()`, `useFinanceError(): { message: string; retry: () => void } | null`
  - `deleteLegacyDatabase(): Promise<void>`

- [ ] **Step 1: Write the shell tests first**

`tests/legacyCleanup.test.ts`:
- stub `indexedDB.deleteDatabase` as `vi.fn` returning `{ onsuccess, onerror, onblocked }` resolved on a microtask; assert called with `"cash-guard"`.
- with `indexedDB` stubbed to `undefined`, `deleteLegacyDatabase()` resolves without throwing.

`tests/offline.test.ts`:
- define a mutable `navigator.onLine` getter; render `OfflineBanner`; no banner while online; dispatch `"offline"` in `act` → find `"You're offline. Reconnect to continue."` by `role="status"`; dispatch `"online"` → banner gone.

`tests/dataError.test.ts`:
- render a small component that calls `useQuery({ queryKey: financeKeys.transactions, queryFn: rejects })` plus `DataError` inside a `QueryClientProvider` with `retry: false`;
- assert the error message appears and clicking `Retry` calls the query function again.

`tests/auth.test.ts`:
- mock `@/lib/supabase/client` and `@/lib/legacyCleanup`;
- `getSession()` resolves `{ data: { session: null } }` → `AuthGate` renders the auth screen (tab `"Sign in"`);
- `getSession()` resolves a fake session → children (`"Dashboard content"`) render;
- `loading` before resolution shows `"Loading…"`;
- `getSupabase()` throwing renders the thrown config message;
- `AuthScreen` sign-in returning `{ error: { message: "Invalid login credentials" } }` shows that message in a `role="alert"`;
- sign-up returning an error shows it; sign-up returning `{ data: { session: null }, error: null }` shows `"Check your email to confirm your account"`;
- after a session renders, invoke the captured `onAuthStateChange` callback with `("SIGNED_OUT", null)` and assert the auth screen returns **and** `queryClient.clear` was called.
- assert `deleteLegacyDatabase` was called once on mount.

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm test -- tests/auth.test.ts tests/offline.test.ts tests/dataError.test.ts tests/legacyCleanup.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement `lib/legacyCleanup.ts` and `OfflineBanner`**

`deleteLegacyDatabase`:
```ts
export function deleteLegacyDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("cash-guard");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
```
`OfflineBanner` uses `useSyncExternalStore` (no `setState` in an effect):
- subscribe adds `window` `online`/`offline` listeners;
- client snapshot `() => !navigator.onLine`;
- server snapshot `() => false`;
- render `null` when online, otherwise a `role="status"` bar with the pinned copy.

- [ ] **Step 4: Implement `useFinanceError` and `DataError`**

`useFinanceError` subscribes to `queryClient.getQueryCache()` with `useSyncExternalStore`, scans `Object.values(financeKeys)` for `status === "error"`, and returns the first error. `retry` calls `queryClient.invalidateQueries()`.
`DataError` renders `"Could not load your data."`, the normalized message, and a `Retry` button; render nothing when there is no error.

- [ ] **Step 5: Implement `AuthProvider`**

Behavior:
- `"use client"`, context + `useAuth` that throws `"useAuth must be used inside AuthProvider"` outside the provider.
- On mount, inside an async IIFE (so `setState` is never called synchronously in the effect body):
  1. `getSupabase()`; on throw set `configError` and `loading = false`;
  2. `getSession()`; apply session;
  3. subscribe to `onAuthStateChange`; store the unsubscribe function for cleanup.
- `applySession(next)`:
  - compare the next user id with a `useRef` of the current id;
  - if it changed **away from a non-null id**, call `clear()` on the client returned by `useQueryClient()` (prevents cross-user cache leaks);
  - set session and `loading = false`.
- Call `void deleteLegacyDatabase()` once on mount.
- Memoize the context value.

- [ ] **Step 6: Implement `AuthGate` and `AuthScreen`**

`AuthGate`:
- `loading` → centered skeleton with `"Loading…"`;
- `configError` → centered card showing the message (no retry);
- no session → `AuthScreen`;
- session → `<OfflineBanner />`, `<DataError />`, then `{children}`.

`AuthScreen`:
- Use `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` with `"Sign in"` and `"Create account"` triggers.
- Controlled `mode` defaults to `"signin"`; coerce Base UI's `value` with `?? "signin"`.
- Email + password inputs with labels, `autoComplete`, and required validation.
- Submit handlers call `getSupabase().auth.signInWithPassword` / `.signUp` inside `try/catch/finally`.
- Inline error in a `role="alert"` paragraph; disable submit while loading with copy `"Signing in…"` / `"Creating account…"`.
- Sign-up with a returned session does nothing (the auth listener enters the app); sign-up without a session sets the notice `"Check your email to confirm your account"`.
- Wrap the form in the standard centered `max-w-md` column; do not render `Header` or `BottomNav` on the auth screen.

- [ ] **Step 7: Wire `app/layout.tsx`**

```tsx
<ThemeProvider>
  <QueryProvider>
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  </QueryProvider>
  <Toaster position="top-center" richColors />
</ThemeProvider>
```
Keep `suppressHydrationWarning`, fonts, metadata, and viewport unchanged.

- [ ] **Step 8: Run tests and verification**

Run:
```bash
npm test -- tests/auth.test.ts tests/offline.test.ts tests/dataError.test.ts tests/legacyCleanup.test.ts
npm test
npm run build
npm run lint
```
Expected: PASS. Existing screens still read Dexie during this task; the gate only wraps them.

- [ ] **Step 9: Commit**

```bash
git add lib/auth/AuthProvider.tsx components/auth/AuthGate.tsx components/auth/AuthScreen.tsx components/shared/OfflineBanner.tsx components/shared/DataError.tsx lib/hooks/useFinanceError.ts lib/legacyCleanup.ts app/layout.tsx tests/auth.test.ts tests/offline.test.ts tests/dataError.test.ts tests/legacyCleanup.test.ts
git commit -m "feat(auth): gate the app behind Supabase auth and add online/error shell states"
```

---

### Task 4: Query Hooks

**Files:**
- Modify: `lib/hooks/useTransactions.ts`
- Modify: `lib/hooks/useBudget.ts`
- Create: `tests/hooks.test.ts`

**Interfaces:**
- Consumes: `listCategories`, `listTransactions`, `getCategoryBudgets`, `getMonthlySpent`, `getMonthlySpentByCategory`, `financeKeys`, `useAuth`.
- Produces (signatures unchanged):
  - `useCategories(type?: TransactionType): Category[] | undefined`
  - `useTransactions(): Transaction[] | undefined`
  - `useRecentTransactions(limit: number): Transaction[] | undefined`
  - `useTotalBudget(): number | undefined`
  - `useMonthlySpent(): number | undefined`
  - `useCategoryBudgets(): Budget[] | undefined`
  - `useMonthlySpentByCategory(): Record<string, number> | undefined`

- [ ] **Step 1: Write the failing hook tests**

Create `tests/hooks.test.ts`:
- mock `@/lib/auth/AuthProvider` with a mutable `session` value;
- mock every repository read with `vi.fn`;
- wrap `renderHook` in a fresh `QueryClientProvider` with `retry: false`, `gcTime: 0`;
- cases:
  - `useCategories()` returns all categories; `useCategories("expense")` filters;
  - `useTransactions()` returns the repository order;
  - `useRecentTransactions(2)` sorts by `createdAt` descending and slices;
  - `useTotalBudget()` sums category budgets (undefined while pending);
  - `useMonthlySpent()` and `useMonthlySpentByCategory()` return repository values;
  - with `session: null`, repository functions are not called and the hook stays `undefined`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/hooks.test.ts`
Expected: FAIL — hooks still use `useLiveQuery`.

- [ ] **Step 3: Implement `useTransactions.ts`**

- `useCategories`: `useQuery({ queryKey: financeKeys.categories, queryFn: listCategories, enabled: !!session, select: (rows) => type ? rows.filter((c) => c.type === type) : rows })`.
- `useTransactions`: `useQuery({ queryKey: financeKeys.transactions, queryFn: listTransactions, enabled: !!session })`.
- `useRecentTransactions`: same query key/function; `select` copies the array, sorts by `b.createdAt - a.createdAt`, and slices to `limit`.
- Remove `dexie-react-hooks` and `schema.ts` imports.

- [ ] **Step 4: Implement `useBudget.ts`**

- `useCategoryBudgets`: `financeKeys.budgets` / `getCategoryBudgets`.
- `useMonthlySpent`: `financeKeys.monthlySpent` / `getMonthlySpent`.
- `useMonthlySpentByCategory`: `financeKeys.monthlySpentByCategory` / `getMonthlySpentByCategory`.
- `useTotalBudget`: unchanged derivation from `useCategoryBudgets()`.
- Every hook reads `useAuth()` and passes `enabled: !!session`.

- [ ] **Step 5: Run tests and verification**

Run:
```bash
npm test -- tests/hooks.test.ts
npm test
npm run build
npm run lint
```
Expected: PASS. UI still compiles because hook return types are unchanged; budget rows now carry `categoryId`, which the next task consumes.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useTransactions.ts lib/hooks/useBudget.ts tests/hooks.test.ts
git commit -m "feat(query): replace live queries with TanStack Query hooks"
```

---

### Task 5: Dashboard and Budget Views

**Files:**
- Modify: `components/dashboard/DashboardView.tsx`
- Modify: `components/budget/BudgetView.tsx`
- Modify: `lib/spending.ts`
- Rewrite: `tests/budgetView.test.ts`
- Rewrite: `tests/categoryBudgetView.test.ts`
- Modify: `tests/spending.test.ts` (type import only)

**Interfaces:**
- Consumes: Task 4 hooks and `Budget.categoryId`.
- Produces: no new public API; both views render the same copy/states.

- [ ] **Step 1: Rewrite the two view tests**

Replace Dexie mocks with repository + auth mocks and a query provider:
```ts
const state = vi.hoisted(() => ({
  categories: [] as Array<Record<string, unknown>>,
  budgets: [] as Array<Record<string, unknown>>,
  transactions: [] as Array<Record<string, unknown>>,
  spentByCategory: {} as Record<string, number>,
  monthlySpent: 0,
}));

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "u1" } }, loading: false, configError: null }),
}));

vi.mock("@/lib/db/repository", () => ({
  listCategories: vi.fn(async () => state.categories),
  listTransactions: vi.fn(async () => state.transactions),
  getCategoryBudgets: vi.fn(async () => state.budgets),
  getMonthlySpent: vi.fn(async () => state.monthlySpent),
  getMonthlySpentByCategory: vi.fn(async () => state.spentByCategory),
  deleteCategoryBudget: vi.fn(async () => {}),
  setCategoryBudget: vi.fn(async () => {}),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(createElement(QueryClientProvider, { client }, ui));
}
```
Budget fixtures become `{ id: "b1", categoryId: "c1", amount: 8000, createdAt: 1, updatedAt: 1 }`.
Keep the existing assertions: empty state, derived total, loading gate, row content, tier hint, sort order, Edit/Remove, and dialog select-label tests. Add an assertion that no rendered text contains `"cat:"`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/budgetView.test.ts tests/categoryBudgetView.test.ts`
Expected: FAIL — `parseCategoryBudgetId` still expects `cat:` ids.

- [ ] **Step 3: Update `BudgetView.tsx`**

- Import `Category` from `@/lib/db/types`; remove `parseCategoryBudgetId`.
- Replace every `parseCategoryBudgetId(b.id)` with `b.categoryId`.
- Keep the three-state loading logic, sorting, unallocated filter, and dialog wiring unchanged.

- [ ] **Step 4: Update `DashboardView.tsx`**

- Import types from `@/lib/db/types`; remove `parseCategoryBudgetId`.
- Resolve `categories.find((c) => c.id === b.categoryId)` for the month-to-date budget spend.
- Keep service-worker registration, donut, legend, and range filter unchanged.

- [ ] **Step 5: Update type imports in `lib/spending.ts` and `tests/spending.test.ts`**

Change `@/lib/db/schema` to `@/lib/db/types`.

- [ ] **Step 6: Run tests and verification**

Run:
```bash
npm test -- tests/budgetView.test.ts tests/categoryBudgetView.test.ts tests/spending.test.ts
npm test
npm run build
npm run lint
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/DashboardView.tsx components/budget/BudgetView.tsx lib/spending.ts tests/budgetView.test.ts tests/categoryBudgetView.test.ts tests/spending.test.ts
git commit -m "refactor(ui): key budget breakdowns by category id"
```

---

### Task 6: Transaction Form and Transactions UI

**Files:**
- Modify: `components/transactions/TransactionForm.tsx`
- Modify: `components/transactions/TransactionsView.tsx`
- Modify: `components/transactions/TransactionList.tsx`
- Modify: `components/transactions/TransactionFilters.tsx`
- Modify: `components/transactions/DeleteTransactionDialog.tsx`
- Modify: `components/transactions/TransactionDialog.tsx`
- Update: `tests/transactionFormToast.test.ts`

**Interfaces:**
- Consumes: `Budget.categoryId`, types from `@/lib/db/types`.
- Produces: no public API changes; `TransactionInput.category` remains the display name.

- [ ] **Step 1: Update the form test and add the failure case**

In `tests/transactionFormToast.test.ts`:
- Change the budget fixture to `{ id: "b1", categoryId: "c1", amount: 500, createdAt: 1, updatedAt: 1 }`.
- Add:
```ts
it("shows an error toast and no success toast when the save fails", async () => {
  mocks.addTransaction.mockRejectedValueOnce(new Error("network down"));
  const { container } = render(createElement(TransactionForm));
  fireEvent.change(screen.getByLabelText("Amount (₱)"), { target: { value: "10" } });
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() => {
    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Something went wrong saving the transaction"
    );
  });
  expect(mocks.toast.success).not.toHaveBeenCalled();
});
```
- Keep the existing threshold-warning and best-effort-lookup tests.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/transactionFormToast.test.ts`
Expected: FAIL — form still looks up `categoryBudgetId(cat.id)`.

- [ ] **Step 3: Update `TransactionForm.tsx`**

- Remove the `categoryBudgetId` import.
- Look up the category budget with `(await getCategoryBudgets()).find((r) => r.categoryId === cat.id)`.
- Keep the best-effort `try/catch` boundaries and toast order.
- Keep `category` as the submitted display name.

- [ ] **Step 4: Update type imports**

Change `@/lib/db/schema` to `@/lib/db/types` in:
`TransactionsView.tsx`, `TransactionList.tsx`, `TransactionFilters.tsx`, `DeleteTransactionDialog.tsx`, `TransactionDialog.tsx`.
No behavior changes: filtering/search/pagination still use `transaction.category` (the derived display name).

- [ ] **Step 5: Run tests and verification**

Run:
```bash
npm test -- tests/transactionFormToast.test.ts
npm test
npm run build
npm run lint
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/transactions tests/transactionFormToast.test.ts
git commit -m "refactor(transactions): resolve category budgets and types by id"
```

---

### Task 7: Settings and Category Dialogs

**Files:**
- Modify: `components/settings/SettingsView.tsx`
- Modify: `components/settings/DeleteCategoryDialog.tsx`
- Modify: `components/settings/CategoryEditDialog.tsx`
- Create: `tests/settingsAccount.test.ts`

**Interfaces:**
- Consumes: `useAuth`, `getSupabase`, id-based repository functions.
- Produces: no new public API.

- [ ] **Step 1: Write the failing settings test**

`tests/settingsAccount.test.ts`:
- mock `@/lib/hooks/useTransactions` (`useCategories` returns one category), `@/lib/hooks/useServiceWorkerUpdate` (`status: "idle"`, no-op actions), `@/lib/auth/AuthProvider` (`session.user.email === "a@b.com"`), `@/lib/supabase/client` (`auth.signOut` spy), and `@/lib/db/repository`;
- render `SettingsView`;
- assert the account card shows `"a@b.com"`;
- click `"Sign out"` and assert `signOut` was called;
- click the delete button for `"Food"` and assert `transactionCountForCategory` was called with `"c1"` (the id, not the name).

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/settingsAccount.test.ts`
Expected: FAIL — no Account card and counts use the name.

- [ ] **Step 3: Update `SettingsView.tsx`**

- Import `useAuth` and `getSupabase`.
- `openEdit` / `openDelete` call `transactionCountForCategory(c.id)` (wrap in `try/catch` and toast `err.message` on failure).
- `addNew` wraps `addCategory` in `try/catch`; on failure toast the repository message (so duplicate-name `23505` is readable), and only reset the form after a successful add.
- Add an Account card above/below Data:
  - title `"Account"`;
  - signed-in email (`session?.user.email ?? ""`);
  - outline full-width `"Sign out"` button with `IconLogout`, calling `getSupabase().auth.signOut()` and ignoring the resolved error (the auth listener drives navigation).
- Wrap `handleExportCSV` in `try/catch`; on failure toast `"Could not export data"` instead of leaving a rejected promise.
- Keep CSV import and update-card behavior unchanged.
- Import `Category` from `@/lib/db/types`.

- [ ] **Step 4: Update `DeleteCategoryDialog.tsx`**

- `reassignCategory(category.id, target)`.
- Build `items = Object.fromEntries(candidates.map((c) => [c.id, c.name]))`.
- Select uses `items`, `value={target || null}`, `onValueChange={(v) => setTarget(v ?? "")}`; option values are `c.id`, labels are `c.name`.
- Import `Category` from `@/lib/db/types`.

- [ ] **Step 5: Update `CategoryEditDialog.tsx`**

- Change the dialog description from "Renaming moves existing transactions..." to `"Changes apply everywhere this category is used."` (transactions reference `category_id`, so no cascade is needed).
- Keep the type lock when `inUse > 0`.
- Import `Category` from `@/lib/db/types`.

- [ ] **Step 6: Run tests and verification**

Run:
```bash
npm test -- tests/settingsAccount.test.ts
npm test
npm run build
npm run lint
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/settings tests/settingsAccount.test.ts
git commit -m "feat(settings): add account card and use category ids for edit/delete flows"
```

---

### Task 8: Remove Dexie, Update Docs, Version 2.0.0

**Files:**
- Delete: `lib/db/schema.ts`
- Modify: `lib/csv.ts`, `lib/validations/transaction.ts`, `components/shared/CategoryIcon.tsx` (notes only if no code imports remain)
- Modify: `AGENTS.md`, `CLAUDE.md`, `README.md`
- Modify: `package.json` (remove Dexie-era deps, version)
- Build-stamped: `public/sw.js`, `public/manifest.webmanifest`, `lib/version.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: release-ready `2.0.0` tree with no Dexie references.

- [ ] **Step 1: Prove the old layer is unused**

Run:
```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx app,components,lib,tests |
  Select-String -Pattern 'lib/db/schema|dexie|Dexie|parseCategoryBudgetId|categoryBudgetId|CATEGORY_BUDGET_PREFIX|from "uuid"'
```
Expected: no matches. (`docs/` may still mention history; that is fine.)

- [ ] **Step 2: Delete `lib/db/schema.ts`**

Delete the file. If the grep found any import, update it to `@/lib/db/types` (or the correct repository/hook) before continuing.

- [ ] **Step 3: Update the stale AI-CONTEXT-NOTE headers**

For `lib/csv.ts`, `lib/validations/transaction.ts`, `components/shared/CategoryIcon.tsx`, and any touched file whose note still mentions Dexie/IndexedDB/`schema.ts`, rewrite `R`/`AB`/`E` to point at `lib/db/types.ts`, the Supabase repository, or TanStack Query.

- [ ] **Step 4: Rewrite the local-first sections of `AGENTS.md`**

Required content:
- What this is: local-first removed; Supabase Postgres + Auth, account-based, online-only; PWA install/update still applies.
- Setup: Node >= 20.9, `npm install`, copy `.env.example` to `.env.local`, fill both `NEXT_PUBLIC_*` values, create a Supabase project, run `supabase/migrations/20261024000000_init.sql` in the SQL Editor.
- Data flow: `lib/supabase/client.ts` → `lib/db/repository.ts` → Postgres; RLS per user; TanStack Query hooks with the five keys; writes invalidate the cache.
- Conventions: no API routes/server actions; never ship a service-role key; `enabled: !!session`; no offline writes; `useAuth`/`AuthGate`; repository is the only data-access module.
- Testing: fake Supabase client for repository tests; `QueryClientProvider` with `retry: false` for component tests; no Dexie mocks; keep the three-command verification.
- Remove the "no env vars", "IndexedDB via Dexie", "live query", and "export/import to move devices" claims except where CSV export/import is still a backup feature.

`CLAUDE.md` contains only `@AGENTS.md`; verify it still does and leave it as the delegation stub (no duplicated content).

- [ ] **Step 5: Update `README.md`**

Replace the "runs entirely in your browser / no account / IndexedDB" claims with:
- account-based cloud storage in Supabase Postgres;
- RLS per user;
- online-only (offline shell still installable);
- CSV export/import remains available as a backup;
- stack table: Supabase (Postgres + Auth) and TanStack Query instead of Dexie.

- [ ] **Step 6: Remove the Dexie-era dependencies**

Run:
```bash
npm uninstall dexie dexie-react-hooks uuid @types/uuid
```
This must come after `lib/db/schema.ts` is deleted (Step 2) and after the hooks/components stopped importing Dexie (Tasks 4-7), otherwise the build breaks.

- [ ] **Step 7: Bump the version**

Set `"version": "2.0.0"` in `package.json`.

- [ ] **Step 8: Run full verification**

Run:
```bash
npm install
npm run build
npm run lint
npm test
```
Expected:
- build PASS, and `scripts/stamp-version.mjs` updates `public/sw.js`, `public/manifest.webmanifest`, and `lib/version.ts` to `2.0.0`;
- lint clean;
- all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/db/schema.ts lib/csv.ts lib/validations/transaction.ts components/shared/CategoryIcon.tsx AGENTS.md CLAUDE.md README.md package.json package-lock.json public/sw.js public/manifest.webmanifest lib/version.ts
git commit -m "chore(release): remove Dexie, document Supabase architecture, and bump to 2.0.0"
```

---

### Task 9: Supabase Project and Rollout Checklist

**Files:** none (operational).

- [ ] **Step 1: Create the Supabase project**

Create one project. Copy the project URL and the **publishable** key (never the service-role key).

- [ ] **Step 2: Run the migration**

Paste `supabase/migrations/20261024000000_init.sql` into the Supabase SQL Editor and run it once. If any statement fails, stop and fix the migration file before proceeding.

- [ ] **Step 3: Verify RLS and policies**

Run in the SQL Editor:
```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('categories', 'transactions', 'budgets');

select tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in ('categories', 'transactions', 'budgets')
group by tablename;
```
Expected: `rowsecurity = true` for all three; `policy_count = 4` for each.

- [ ] **Step 4: Configure environments**

- Local: create `.env.local` with both variables (already gitignored).
- Vercel: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project environment, then redeploy.

- [ ] **Step 5: Deploy and smoke test**

Deploy `main`, then in the installed PWA or browser:
1. Sign up with a new email.
2. Add a category.
3. Add an income and an expense transaction.
4. Set a category budget.
5. Export CSV, then import it and confirm duplicates are skipped.
6. Sign out, sign in again, and confirm the data persists.
7. Sign in on a second browser and confirm the same data appears.
8. Create a second account and confirm it sees zero rows (RLS check).
9. Go offline (DevTools) and confirm the banner appears and a write shows an error rather than a success toast.
10. Confirm **Settings → Update** still detects a deployed version change.

- [ ] **Step 6: Post-deploy notes**

- Any pre-2.0 local data is intentionally not migrated; export it to CSV before deployment if it matters.
- If email confirmations are enabled, sign-up requires the confirmation email before first sign-in.
- Monthly totals are aggregated client-side; revisit with a SQL view/RPC only if personal data volumes grow.
