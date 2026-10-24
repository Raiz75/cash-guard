/* AI-CONTEXT-NOTE:{"R":"One-time deletion of the legacy Dexie IndexedDB database (cash-guard) at boot during the Supabase migration.","IDD":[{"?":"Resolves regardless of success/error/blocked so boot never hangs on a locked DB"},{"?":"No-op when indexedDB is unavailable (SSR/tests)"}],"A":[{"!!":"lib/auth/AuthProvider.tsx","CRITICAL":"calls deleteLegacyDatabase() once on mount"},{"?":"tests/legacyCleanup.test.ts","asserts DB name and undefined tolerance"}],"AB":[{"?":"global indexedDB","browser API"}],"E":[{"!!":"npm test -- tests/legacyCleanup.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"}]} */
export function deleteLegacyDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("cash-guard");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}