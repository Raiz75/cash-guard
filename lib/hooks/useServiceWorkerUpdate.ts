/* AI-CONTEXT-NOTE:{"R":"Observes the service worker lifecycle and exposes whether a new app version is waiting to be applied, plus actions to check for and apply updates.","IDD":[{"?":"register(/sw.js) is idempotent — reuses the registration already created by DashboardView instead of re-registering"},{"?":"Worker in installed (waiting) state is the ONLY signal for available; statechange listener keys off worker.state === installed, reading the worker from event.target"},{"?":"checkForUpdates keys on registration.waiting only — an installing worker is not yet applyable; statechange listener flips to available once installed"},{"?":"controllerchange triggers a full page reload so the new shell activates; user data lives in IndexedDB and survives reloads"},{"?":"All state updates happen in async callbacks/event listeners, never synchronously in the effect body (react-hooks/set-state-in-effect)"},{"?":"No-op in dev or when service workers are unsupported, so status stays up-to-date"}],"A":[{"?":"components/settings/SettingsView.tsx","consumes status/checkForUpdates/applyUpdate for the Update card"}],"AB":[{"?":"public/sw.js","message listener must answer { type: SKIP_WAITING } for applyUpdate to work"},{"?":"components/dashboard/DashboardView.tsx","already registers /sw.js on app load; this hook reuses it"},{"?":"Next.js build","process.env.NODE_ENV gating"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify state transitions: checking -> up-to-date, checking -> available, waiting -> available on mount"},{"*":"Confirm applyUpdate posts the message to registration.waiting only"}]} */

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
      if (reg.waiting) {
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
    }).catch(() => {});
  };

  return { status, checkForUpdates, applyUpdate };
}
