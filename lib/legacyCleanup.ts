let cachedPromise: Promise<void> | null = null;
let cachedSource: IDBFactory | undefined;

export function deleteLegacyDatabase(): Promise<void> {
  if (cachedPromise && cachedSource === indexedDB) {
    return cachedPromise;
  }

  cachedSource = indexedDB;

  if (typeof indexedDB === "undefined") {
    cachedPromise = Promise.resolve();
    return cachedPromise;
  }

  cachedPromise = new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("cash-guard");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });

  return cachedPromise;
}
