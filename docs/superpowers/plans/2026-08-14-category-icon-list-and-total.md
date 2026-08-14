# Category Icon, One-Column List & Breakdown Total Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every category icon the tag icon, render the Settings category list in a single column, and show a filtered total in the dashboard's Spending-by-category card.

**Architecture:** Three small, independent UI/data changes. Task 1 touches the Dexie seed/migration logic in `lib/db/schema.ts`. Task 2 changes a Tailwind container class in `components/settings/SettingsView.tsx`. Task 3 adds a derived total + header row in `components/dashboard/DashboardView.tsx`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Dexie 4 (IndexedDB), shadcn/ui base-maia preset.

## Global Constraints

- Node ≥ 20.9 required (this machine has Node v24.14.0 — use it directly).
- No unit test runner is configured. Verification for every task is `npm run build` and `npm run lint` from the repo root — both must pass before committing.
- Work from repo root: `C:\Users\RAIZEN B. INGALLA\Documents\@cyber-space\personal-proj\cash-guard`
- Use semantic color tokens only (`--primary`, `--destructive`, `text-muted-foreground`). Do not hardcode `green-600`/`red-600`.
- New UI icons use Tabler (`@tabler/icons-react`); the maia preset is teal, not green.
- Dexie: never call a write (`rw`) transaction inside a `useLiveQuery` callback.
- Follow existing file style: double quotes, semicolons, 2-space indent.
- Commit messages use conventional style (`feat: ...`, `fix: ...`).

---

### Task 1: All category icons → `tag` (seed + migration)

**Files:**
- Modify: `lib/db/schema.ts:52-86` (`seedIfEmpty`)

**Interfaces:**
- Consumes: `Category` type (`lib/db/schema.ts:16-22`), `newId()` (`lib/db/schema.ts:39-41`)
- Produces: unchanged `seedIfEmpty(): Promise<void>` signature — later tasks rely on categories continuing to load through `useCategories`

- [ ] **Step 1: Set all default category icons to `"tag"`**

In `lib/db/schema.ts`, replace the `defaults` array (lines 53-62) so every entry has `icon: "tag"`:

```ts
const defaults: Omit<Category, "id">[] = [
  { name: "Salary", type: "income", icon: "tag", color: "#2dd4bf" },
  { name: "Freelance", type: "income", icon: "tag", color: "#38bdf8" },
  { name: "Food", type: "expense", icon: "tag", color: "#fb7185" },
  { name: "Transport", type: "expense", icon: "tag", color: "#fbbf24" },
  { name: "Shopping", type: "expense", icon: "tag", color: "#a78bfa" },
  { name: "Bills", type: "expense", icon: "tag", color: "#22d3ee" },
  { name: "Entertainment", type: "expense", icon: "tag", color: "#f472b6" },
  { name: "Other", type: "expense", icon: "tag", color: toColor("Other") },
];
```

- [ ] **Step 2: Migrate every existing category to the tag icon**

In `seedIfEmpty`, inside the existing `db.transaction("rw", db.categories, async () => { ... })` block, AFTER the dedupe loop and AFTER the `keysToAdd`/`bulkPut` insertion, set `icon: "tag"` on every remaining category (seeded rows with old icons and user-created rows alike):

```ts
await db.categories.toCollection().modify({ icon: "tag" });
```

The result of the transaction body:

```ts
await db.transaction("rw", db.categories, async () => {
  const existing = await db.categories.toArray();

  const seen = new Set<string>();
  const keep = new Set<string>();
  for (const cat of existing) {
    const key = `${cat.type}:${cat.name.toLowerCase()}`;
    if (seen.has(key)) {
      await db.categories.delete(cat.id);
    } else {
      seen.add(key);
      keep.add(key);
    }
  }

  const keysToAdd = defaults.filter(
    (d) => !keep.has(`${d.type}:${d.name.toLowerCase()}`)
  );
  if (keysToAdd.length > 0) {
    await db.categories.bulkPut(keysToAdd.map((c) => ({ id: newId(), ...c })));
  }

  await db.categories.toCollection().modify({ icon: "tag" });
});
```

- [ ] **Step 3: Verify build and lint**

Run: `npm run build`
Run: `npm run lint`
Expected: both pass with no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: use tag icon for all categories"
```

---

### Task 2: One-column category list in Settings

**Files:**
- Modify: `components/settings/SettingsView.tsx:155` (Categories card container)

**Interfaces:**
- Consumes: `useCategories()` hook (`@/lib/hooks/useTransactions`) — unchanged
- Produces: unchanged component; each row keeps icon, name, In/Ex Badge, and Edit/Delete buttons (rows at `components/settings/SettingsView.tsx:156-193` unchanged)

- [ ] **Step 1: Change the grid to a single column**

In `components/settings/SettingsView.tsx`, change the Categories `CardContent` container from a two-column grid to a stacked single-column layout:

```tsx
<CardContent className="flex flex-col gap-2">
```

(Original: `<CardContent className="grid grid-cols-2 gap-2">`)

- [ ] **Step 2: Verify build and lint**

Run: `npm run build`
Run: `npm run lint`
Expected: both pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add components/settings/SettingsView.tsx
git commit -m "feat: show categories in a single column"
```

---

### Task 3: Filtered total in "Spending by category"

**Files:**
- Modify: `components/dashboard/DashboardView.tsx:46-49` (compute total), `components/dashboard/DashboardView.tsx:77-114` (card header)

**Interfaces:**
- Consumes: `breakdown` array (built from range-filtered expenses, lines 40-48), `formatPeso` (`@/lib/format`, already imported at line 8), `RangeFilter` (already rendered at line 80)
- Produces: `totalSpent` — sum of `breakdown` amounts

- [ ] **Step 1: Compute the filtered total**

In `components/dashboard/DashboardView.tsx`, right after `const maxExpense = breakdown.length ? breakdown[0][1] : 0;` (line 49), add:

```ts
const totalSpent = breakdown.reduce((s, [, amount]) => s + amount, 0);
```

- [ ] **Step 2: Render the total row in the card header**

In the "Spending by category" `CardHeader` (lines 78-81), add a total row below `<RangeFilter value={range} onChange={setRange} />`:

```tsx
<CardHeader>
  <CardTitle className="text-sm">Spending by category</CardTitle>
  <RangeFilter value={range} onChange={setRange} />
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">Total</span>
    <span className="font-semibold">{formatPeso(totalSpent)}</span>
  </div>
</CardHeader>
```

This row always renders — it shows `₱0` when the range has no expenses (the existing empty-state message "No expenses in this period." in the card body is unchanged).

- [ ] **Step 3: Verify build and lint**

Run: `npm run build`
Run: `npm run lint`
Expected: both pass with no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/DashboardView.tsx
git commit -m "feat: show total in spending by category"
```

---

## Self-Review Notes

- Spec item 1 (all tag icons) → Task 1. Spec item 2 (one-column list) → Task 2. Spec item 3 (filtered total) → Task 3. No gaps.
- All code is inline above; no TBDs or references to undefined symbols. `formatPeso`, `RangeFilter`, `CardTitle`, `CardHeader` are all already imported in DashboardView.tsx.
- `toColor` remains defined at `lib/db/schema.ts:43-50` and is still used by the "Other" default — no unused-function lint.