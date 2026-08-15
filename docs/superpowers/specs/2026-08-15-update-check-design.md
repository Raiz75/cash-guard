# Update check button in Settings

Date: 2026-08-15

## Purpose

Let the user know a new version of the Cash Guard PWA is deployed and let them apply it on demand. A button in Settings lights up when a newer service worker is available; clicking it asks for confirmation and then activates the new version.

The app is local-first with no server, so detection relies on the standard PWA service-worker update mechanism: the browser re-fetches `public/sw.js` and compares it byte-for-byte. No push notifications, no background polling.

## Requirements

### 1. `lib/hooks/useServiceWorkerUpdate.ts` (new)

A hook that owns the update lifecycle. It is consumed by SettingsView only.

- Resolves the SW registration in production (`process.env.NODE_ENV === "production"` and `"serviceWorker" in navigator`) by calling `navigator.serviceWorker.register("/sw.js")`. This is idempotent — it returns the registration already created by DashboardView rather than re-registering, so it is safe to call again. In dev / unsupported browsers, resolve to `null` and keep status `"up-to-date"`.
- Exposes a status: `"checking" | "up-to-date" | "available"`. State is local `useState` in the hook (single consumer).
- On mount:
  - Check `registration.waiting` — if a new SW is already waiting, set status to `"available"` immediately.
  - Attach `updatefound` on the registration; when the new worker's `statechange` reaches `"installed"` (waiting), set status to `"available"`.
- `checkForUpdates()`: call `registration.update()` (safe no-op when no registration), set status to `"checking"`, and let the `updatefound` listener decide the outcome.
- `applyUpdate()`: post `{ type: "SKIP_WAITING" }` to `registration.waiting`; add a one-time `controllerchange` listener on `navigator.serviceWorker` that reloads the page (`window.location.reload()`) so the new shell activates.
- Status resets naturally: after reload the new SW is active, so nothing is "available" anymore.

Must include the agent-notes header (it is a new hand-written file in `lib/`).

### 2. `public/sw.js`

Three changes:

- **Remove the unconditional `self.skipWaiting()`** from the install handler (line 49). With it, a new SW activates immediately on install and never sits in "waiting", so the update button would never light up and updates would apply without consent. The new SW must stay waiting until the user opts in.
- **Add a version constant**: e.g. `const VERSION = "v3";` used as `const CACHE = "cash-guard-v" + VERSION;`. This constant MUST be bumped on every deploy — a changed `sw.js` is the only signal the browser uses to detect an update. (Current cache is `"cash-guard-v2"`, so start at `"v3"`.)
- **Add a `message` listener**: on `event.data?.type === "SKIP_WAITING"`, call `self.skipWaiting()`. `clients.claim()` in activate (already present) then takes control; the client-side `controllerchange` listener reloads the page.

### 3. `components/settings/SettingsView.tsx`

Add a new "Update" Card. Placement: a new Card after the existing "Data" card (before the "Created by Neziar" footer).

- Status row:
  - A small dot indicator. Teal (`bg-primary`) when status is `"available"` (this is the "lights up" moment), muted (`bg-muted`) when `"up-to-date"`, and while `"checking"` show the checking copy.
  - Text beside the dot: `"New version available"` / `"You're up to date"` / `"Checking for updates…"`.
- Actions:
  - An always-visible `Check for updates` outline button (Tabler `IconRefresh`) calling `checkForUpdates()`.
  - When status is `"available"`, a primary button `Restart app` (or similar) that opens the AlertDialog.
- `AlertDialog` (existing `components/ui/alert-dialog.tsx`): title `"New version ready"`, description `"Restart now to apply the update?"`, buttons `Cancel` / `Restart`. Confirm calls `applyUpdate()`. Reset dialog open state after confirm/cancel.
- Use Tabler icons (`@tabler/icons-react`), not lucide, for new UI per project convention (note the existing file imports both, but new icons should be Tabler).

## Non-goals

- No push notifications or real-time delivery — updates are only discovered on app load, on Settings mount, or via the manual check button.
- No background polling of `registration.update()`.
- No changelog / "what's new" content.
- No changes to `app/layout.tsx` or `components/dashboard/DashboardView.tsx` — the existing app-load registration stays as the registration point; the hook only observes and controls it.

## Deployment note (manual step)

The developer must bump `VERSION` in `public/sw.js` on each release for the update button to ever light up. This is a known, documented requirement, not automated in this feature.

## Verification

- `npm run build` passes (TypeScript + production build).
- `npm run lint` is clean.
- Manual (production build): with SW registered, deploy a new build with a bumped `VERSION`, open the app, open Settings, click Check for updates → dot lights up → Restart → dialog → app reloads to the new version.