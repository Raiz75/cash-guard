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
