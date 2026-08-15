/**
 * FILE NAME: sw.js
 *
 * ROLE: PWA service worker — caches the app shell on install, serves cached-first with network fallback, and cleans up old cache versions on activate.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Cache-first for same-origin GET requests; cross-origin and non-GET are ignored.
 * ? - The CACHE name encodes a version ("cash-guard-v2"); bump it whenever the shell changes so activate() evicts stale caches.
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

const CACHE = "cash-guard-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/",
        "/manifest.webmanifest",
        "/images/android/launchericon-512x512.png",
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => caches.match("/"))
    )
  );
});