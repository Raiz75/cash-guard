/* AI-CONTEXT-NOTE:{"R":"Pinned offline indicator shown in the app shell when navigator.onLine is false; uses useSyncExternalStore to avoid setState-in-effect.","IDD":[{"?":"Subscribes to window online/offline events; client snapshot reflects navigator.onLine, server snapshot assumes online"}],"A":[{"!!":"components/auth/AuthGate.tsx","CRITICAL":"renders OfflineBanner in the authenticated shell"},{"?":"tests/offline.test.ts","asserts copy and role"}],"AB":[{"?":"React useSyncExternalStore","subscription API"}],"E":[{"!!":"npm test -- tests/offline.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"}]} */
"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return !navigator.onLine;
}

function getServerSnapshot(): boolean {
  return false;
}

export function OfflineBanner() {
  const offline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!offline) return null;
  return (
    <div role="status" className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
      You&apos;re offline. Reconnect to continue.
    </div>
  );
}
