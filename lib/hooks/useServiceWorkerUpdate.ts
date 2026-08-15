/**
 * FILE NAME: useServiceWorkerUpdate.ts
 *
 * ROLE: Observes the service worker lifecycle and exposes whether a new app version is waiting to be applied, plus actions to check for and apply updates.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - register("/sw.js") is idempotent — calling it here reuses the registration already created by DashboardView instead of re-registering.
 * ? - A worker in "installed" (waiting) state is the ONLY signal for "available"; the statechange listener keys off worker.state === "installed", reading the worker from event.target (the statechange event's target is the worker).
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

    const onStateChange = (event: Event) => {
      const worker = event.target as ServiceWorker;
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