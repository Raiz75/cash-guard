# Build-time SemVer stamping

Date: 2026-08-15

## Purpose

Make `package.json`'s `"version"` the single source of truth for the Cash Guard PWA version, and stamp it automatically into every place that needs it at build time — `public/sw.js` (drives the update detector), `public/manifest.webmanifest`, and a generated `lib/version.ts` consumed by the Settings "About" line. No more manual, forgettable `VERSION` bumps.

## Background

The update-check feature detects new versions by the browser re-fetching `public/sw.js` and comparing it byte-for-byte. The version must therefore be physically present in `sw.js`'s bytes at build time — a runtime fetch of `package.json` would leave the file bytes unchanged and updates would never be detected. Today `sw.js` holds a manual `const VERSION = 3;` that must be bumped by hand on every release.

## Requirements

### 1. The stamp script: `scripts/stamp-version.mjs`

A small Node ESM script, run automatically before `next build`. It:

1. Reads `"version"` from `package.json` (SemVer, e.g. `"1.0.0"`).
2. **`public/sw.js`** — rewrites the `const VERSION = …;` line to `const VERSION = "<version>";`. The existing `const CACHE = "cash-guard-v" + VERSION;` line is unchanged, so the cache name becomes e.g. `cash-guard-v1.0.0`. Changing `VERSION` changes the file bytes → the update detector sees a new version. Idempotent: building twice with the same version produces no further changes.
3. **`public/manifest.webmanifest`** — adds/updates a top-level `"version": "<version>"` field.
4. **`lib/version.ts`** (generated, overwritten each run) — writes `export const APP_VERSION = "<version>";` with a header noting it is generated and must not be hand-edited.

Notes:
- The stamp runs on `next build` (production). `next dev` must NOT stamp — dev registers no service worker and editing files on every dev start is churn. The `build` script becomes e.g. `node scripts/stamp-version.mjs && next build`.
- The script fails loudly (non-zero exit) if `package.json` has no `"version"` or it is not SemVer — a release must never go out with a missing version.

### 2. Release flow

1. Bump `"version"` in `package.json` (manual, one edit).
2. `npm run build` — stamps `sw.js`, `manifest.webmanifest`, and regenerates `lib/version.ts`.
3. Commit the bump and the stamped files together as the release commit. The stamped files appear as working-tree changes after each build; this is expected and intended — they are committed with the release, not reverted.

Git tags remain optional (not part of this feature).

### 3. Settings About line

In `components/settings/SettingsView.tsx`, render the current version inside the existing Update card, as the last child of its `CardContent` (after the Check-for-updates / Restart buttons). Concretely: import `APP_VERSION` from `@/lib/version` and render a muted `Version <APP_VERSION>` line (`text-xs text-muted-foreground`). The SettingsView imports `APP_VERSION` from the generated module — a client-safe module-level string constant, no API, no server.

## Non-goals

- No git tags, no changelog, no release automation beyond the build-time stamp.
- No UI to bump the version; it stays a `package.json` edit.
- No changes to the update-check mechanism, the hook, or the dialog.
- `lib/version.ts` is generated — it is NOT a hand-written source file and carries no agent-notes analysis beyond a "generated, do not edit" notice.

## Verification

- `npm run build` passes (TypeScript + production build) and stamps all three targets.
- `npm run lint` is clean.
- Manual: bump `package.json`, run build, confirm `sw.js` shows `VERSION = "<new>"`, manifest has `"version"`, and Settings shows "Version <new>".
- Idempotency: running build twice without bumping produces no diff.