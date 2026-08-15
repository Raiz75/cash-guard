# Update Check Button in Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Update" card to Settings that lights up when a new app version is deployed, and lets the user apply it on demand.

**Architecture:** The browser detects a new version by re-fetching `public/sw.js` and comparing it byte-for-byte. The new `useServiceWorkerUpdate` hook observes the service-worker lifecycle: when a new worker reaches the "waiting" state it reports `available`, the settings button lights up, and clicking posts `SKIP_WAITING` to the waiting worker so it activates, then reloads the page.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Dexie-agnostic (no DB involvement), Base UI (shadcn "base-maia" preset), Tabler icons.

## Global Constraints

- Node ≥ 20.9 is required. This machine has Node v24.14.0 — use `npm run build` and `npm run lint` from the repo root for verification.
- Every hand-written source file must begin with the agent-notes header (see AGENTS.md). New files: fill in real per-file analysis. Edited files: keep the header current.
- Use Tabler icons (`@tabler/icons-react`), not lucide, for new UI.
- Theme colors: semantic tokens only — teal `--primary` (`bg-primary`) for the lit/positive state, `bg-muted` for the idle state. No `green-600`/`red-600`.
- No calls to a write (rw) Dexie transaction inside a `useLiveQuery` callback (not relevant here, but do not introduce any).
- Verification is `npm run build` and `npm run lint`; both must pass. There is no test runner in this project — SW behavior is verified manually per the spec.

---

### Task 1: Service worker update support (`public/sw.js`)

**Files:**
- Modify: `public/sw.js`

**Interfaces:**
- Produces: A service worker that (a) keeps new workers in the *waiting* state instead of auto-activating, (b) responds to `{ type: "SKIP_WAITING" }` messages with `self.skipWaiting()`, and (c) exposes a `VERSION` constant that must be bumped on each release.

- [ ] **Step 1: Replace the cache name with a versioned constant**

Replace the line:

```js
const CACHE = "cash-guard-v2";
```

with:

```js
const VERSION = 3;
const CACHE = "cash-guard-v" + VERSION;
```

Note: `VERSION` MUST be incremented on every deploy that changes the app shell; a byte-identical `sw.js` is never detected as an update. This is the release step the developer performs manually.

- [ ] **Step 2: Remove the unconditional `skipWaiting()` from install**

In the `install` handler (currently around line 49), delete the line:

```js
self.skipWaiting();
```

Keeping it would make every new worker activate immediately on install, so it would never sit in "waiting" — the update button could never light up and updates would apply without consent.

- [ ] **Step 3: Add the SKIP_WAITING message listener**

Append before the `fetch` listener (after the `activate` listener's closing brace):

```js
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
```

- [ ] **Step 4: Update the agent-notes header**

Edit the header block:
- ROLE: add "responds to SKIP_WAITING to apply user-approved updates".
- IMPORTANT DEVELOPER DECISIONS: note that `skipWaiting()` is intentionally NOT called on install so updates wait for user consent, and that `VERSION` must be bumped each release.
- ON FILE EDIT: keep the existing `npm run build` / `npm run lint` items; add a `*` item "VERSION must be bumped on each release".

- [ ] **Step 5: Verify**

Run from the repo root:

```bash
npm run build
npm run lint
```

Expected: both pass. (SW logic itself is not exercised by build/lint; a full manual pass happens in Task 3.)

- [ ] **Step 6: Commit**

```bash
git add public/sw.js
git commit -m "feat: wait for user consent on SW update and handle SKIP_WAITING"
```

---

### Task 2: `useServiceWorkerUpdate` hook

**Files:**
- Create: `lib/hooks/useServiceWorkerUpdate.ts`

**Interfaces:**
- Produces: `useServiceWorkerUpdate()` returning `{ status: "checking" | "up-to-date" | "available", checkForUpdates: () => Promise<void>, applyUpdate: () => void }`.
- Consumes: `navigator.serviceWorker` APIs only; no DB, no other project modules.

- [ ] **Step 1: Create the hook file with the agent-notes header**

Create `lib/hooks/useServiceWorkerUpdate.ts` with this exact content:

```ts
/**
 * FILE NAME: useServiceWorkerUpdate.ts
 *
 * ROLE: Observes the service worker lifecycle and exposes whether a new app version is waiting to be applied, plus actions to check for and apply updates.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - register("/sw.js") is idempotent — calling it here reuses the registration already created by DashboardView instead of re-registering.
 * ? - A worker in "installed" (waiting) state is the ONLY signal for "available"; the statechange listener keys off worker.state === "installed".
 * ? - checkForUpdates inspects registration.waiting/installing after update() resolves to distinguish "no update" from "update found".
 * ? - controllerchange triggers a full page reload so the new shell activates; user data lives in IndexedDB and survives reloads.
 * ? - All state updates happen in async callbacks/event listeners, never synchronously in the effect body (react-hooks/set-state-in-effect).
 * ? - No-op in dev or when service workers are unsupported, so status stays "up-to-date".
 *
 * AFFECTS:
 * ? - components/settings/SettingsView.tsx (consumes status/checkForUpdates/applyUpdate for the Update card)
 *
 * AFFECTED BY:
 * ? - public/sw.js (message listener must answer { type: "SKIP_WAITING" } for applyUpdate to work)
 * ? - components/dashboard/DashboardView.tsx (already registers /sw.js on app load; this hook reuses it)
 * ? - Next.js build (process.env.NODE_ENV gating)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify state transitions: checking -> up-to-date, checking -> available, waiting -> available on mount
 * * - Confirm applyUpdate posts the message to registration.waiting only
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

"use client";

import { useEffect, useState } from "react";

export type SWUpdateStatus = "checking" | "up-to-date" | "available";

export function useServiceWorkerUpdate() {
  const [status, setStatus] = useState<SWUpdateStatus>("up-to-date");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let active = true;
    let registration: ServiceWorkerRegistration | null = null;

    const onStateChange = (worker: ServiceWorker) => {
      if (worker.state === "installed") {
        if (active) setStatus("available");
      }
    };

    const onUpdateFound = () => {
      if (registration?.installing) {
        registration.installing.addEventListener("statechange", onStateChange);
      }
    };

    const onControllerChange = () => {
      window.location.reload();
    };

    const init = async () => {
      registration = await navigator.serviceWorker.register("/sw.js");
      if (!active) return;
      if (registration.waiting) {
        setStatus("available");
        return;
      }
      registration.addEventListener("updatefound", onUpdateFound);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void init();

    return () => {
      active = false;
      registration?.removeEventListener("updatefound", onUpdateFound);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const checkForUpdates = async () => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    setStatus("checking");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await reg.update();
      if (reg.waiting || reg.installing) {
        setStatus("available");
      } else {
        setStatus("up-to-date");
      }
    } catch {
      setStatus("up-to-date");
    }
  };

  const applyUpdate = () => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  };

  return { status, checkForUpdates, applyUpdate };
}
```

- [ ] **Step 2: Verify**

Run from the repo root:

```bash
npm run build
npm run lint
```

Expected: both pass (no unused imports, no react-hooks violations — the `setStatus` calls are inside async callbacks/event listeners, not the effect body).

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useServiceWorkerUpdate.ts
git commit -m "feat: add useServiceWorkerUpdate hook for update detection"
```

---

### Task 3: Update card + confirm dialog in Settings

**Files:**
- Modify: `components/settings/SettingsView.tsx`

**Interfaces:**
- Consumes: `useServiceWorkerUpdate()` from `lib/hooks/useServiceWorkerUpdate` (`status`, `checkForUpdates`, `applyUpdate`), `cn` from `lib/utils`, `IconRefresh` / `IconDownload` from `@tabler/icons-react`, and the AlertDialog primitives from `components/ui/alert-dialog`.

- [ ] **Step 1: Add imports**

In `components/settings/SettingsView.tsx`, after the existing import block:

- Add `IconRefresh` and `IconDownload` to the `@tabler/icons-react` import (there are already two separate Tabler import lines — extend either one).
- Add `import { useServiceWorkerUpdate } from "@/lib/hooks/useServiceWorkerUpdate";`
- Add `import { cn } from "@/lib/utils";`
- Add the AlertDialog import block:

```ts
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

- [ ] **Step 2: Wire up the hook and dialog state**

Inside `SettingsView()`, next to the existing `useState` calls (around line 78):

```ts
const { status, checkForUpdates, applyUpdate } = useServiceWorkerUpdate();
const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
```

- [ ] **Step 3: Add the Update card and AlertDialog to the JSX**

Insert a new `<Card>` between the closing `</Card>` of the "Data" card (after the file input, around line 277) and the `Created by Neziar` paragraph. Also add the `<AlertDialog>` at the end, after the existing `{deleting ? ... : null}` block (before the closing `</div>` of the page container). Exact JSX:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm">Update</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "available" ? "bg-primary" : "bg-muted"
        )}
      />
      <span className="text-muted-foreground">
        {status === "checking"
          ? "Checking for updates…"
          : status === "available"
            ? "New version available"
            : "You're up to date"}
      </span>
    </div>
    <Button
      variant="outline"
      className="w-full"
      disabled={status === "checking"}
      onClick={() => void checkForUpdates()}
    >
      <IconRefresh className="mr-1 h-4 w-4" /> Check for updates
    </Button>
    {status === "available" ? (
      <Button className="w-full" onClick={() => setUpdateDialogOpen(true)}>
        <IconDownload className="mr-1 h-4 w-4" /> Restart app
      </Button>
    ) : null}
  </CardContent>
</Card>

<AlertDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>New version ready</AlertDialogTitle>
      <AlertDialogDescription>
        Restart now to apply the update?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setUpdateDialogOpen(false)}>
        Cancel
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          setUpdateDialogOpen(false);
          applyUpdate();
        }}
      >
        Restart
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 4: Update the agent-notes header**

Edit the header block of `SettingsView.tsx`:
- ROLE: add "and an Update card with a new-version check + restart dialog".
- IMPORTANT DEVELOPER DECISIONS: add `? - Update card uses useServiceWorkerUpdate; dot lights up (bg-primary) when a new SW is waiting; Restart posts SKIP_WAITING then reloads.`
- AFFECTED BY: add `? - lib/hooks/useServiceWorkerUpdate.ts (update status/actions)`.
- ON FILE EDIT: keep existing items; verify the update flow per the manual checklist below.

- [ ] **Step 5: Verify build + lint**

Run from the repo root:

```bash
npm run build
npm run lint
```

Expected: both pass. If `npm run lint` flags `AlertDialogCancel`/`AlertDialogAction` props (e.g. the `onClick` on a Base UI Close), move the `onClick` to a wrapping `render` or wrap the confirm action in a plain `onClick` on the `AlertDialogAction` Button — resolve whatever the linter reports while keeping behavior identical.

- [ ] **Step 6: Manual verification (production build)**

```bash
npm run build
npm run start
```

Then in the browser:
1. Open the app once to register the SW (prod build). Confirm Settings shows "You're up to date" with a muted dot.
2. Bump `VERSION` in `public/sw.js` to `4`, rebuild, redeploy/serve.
3. Reload the app, open Settings, click "Check for updates" → dot turns teal, text reads "New version available", "Restart app" button appears.
4. Click "Restart app" → dialog appears → confirm → page reloads and Settings shows "You're up to date" again (new version active).
5. Cancel path: dialog Cancel closes without restarting.

- [ ] **Step 7: Commit**

```bash
git add components/settings/SettingsView.tsx
git commit -m "feat: add update check card and restart dialog to settings"
```

---

## Self-Review

**Spec coverage:**
- `useServiceWorkerUpdate` hook — Task 2. ✔
- `sw.js` version constant, no unconditional `skipWaiting`, SKIP_WAITING listener — Task 1. ✔
- Update card with dot + check button + restart button + AlertDialog — Task 3. ✔
- Non-goals respected: no polling, no layout/DashboardView changes, no changelog. ✔
- Deployment note (bump VERSION) captured in Task 1 Step 1. ✔

**Placeholder scan:** No TBD/TODO/describe-only steps; every code step has exact content. ✔

**Type consistency:** `SWUpdateStatus` union, `status`/`checkForUpdates`/`applyUpdate` names match between Task 2 (producer) and Task 3 (consumer). `VERSION`/`CACHE` used consistently in Task 1. ✔