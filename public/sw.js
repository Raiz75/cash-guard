/* AI-CONTEXT-NOTE:{"R":"PWA service worker — caches the app shell on install, serves cached-first with network fallback, cleans up old cache versions on activate, keeps new workers waiting, and responds to SKIP_WAITING to apply user-approved updates.","IDD":[{"?":"Cache-first for same-origin GET requests; cross-origin and non-GET are ignored."},{"?":"The CACHE name encodes VERSION (\"cash-guard-v\" + VERSION); VERSION is auto-stamped from package.json at build time (const VERSION = \"0.1.0\";), so the cache name and the byte-diff update signal are derived, not hand-bumped."},{"?":"skipWaiting() is intentionally NOT called on install so new workers sit in \"waiting\" until the user approves via a SKIP_WAITING message."},{"?":"Offline navigation falls back to the cached \"/\" (the app shell)."}],"A":[{"!!!":"Offline/PWA behavior of the whole app","CRITICAL":"a broken SW breaks offline use"},{"?":"components/dashboard/DashboardView.tsx","Registers this file in production"}],"AB":[{"?":"public/ files listed in cache.addAll (/, manifest.webmanifest, icons)"},{"?":"App shell changes","New routes/assets must be added to the cache list"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify install/activate/fetch handlers still work after edits"},{"*":"Fetch handler must never cache POST or cross-origin requests"},{"*":"VERSION is stamped by scripts/stamp-version.mjs on `npm run build`; bump package.json version to release"}]} */

const VERSION = "1.2.4";
const CACHE = "cash-guard-v" + VERSION;

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
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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