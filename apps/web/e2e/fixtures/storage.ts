import type { Page } from "@playwright/test";

/** Seed an older on-disk format before the app can initialize its current schema. */
export async function seedRecords(
  page: Page,
  database: string,
  store: string,
  records: Record<string, unknown>,
) {
  await page.route("**/__e2e_seed", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body>Storage fixture</body></html>",
    }),
  );
  await page.goto("/__e2e_seed");
  await page.evaluate(
    async ({ database, store, records }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(store);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(store, "readwrite");
          for (const [key, value] of Object.entries(records)) tx.objectStore(store).put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { database, store, records },
  );
  await page.unroute("**/__e2e_seed");
}
