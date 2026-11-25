import { createStore, get, promisifyRequest } from "idb-keyval";
import { migrateSnapshot, parseBackup } from "./library";
import type { Position, Reading } from "@still/reader-core";
import type { Library } from "./library";

// Lazy: IndexedDB is never touched by server rendering.
let store: ReturnType<typeof createStore> | undefined;
const database = () => (store ??= createStore("still-library", "records"));
type Settings = { activeId: string | null; wpm: number; revision: number; schemaVersion?: number };
export type StoredLibrary = { library: Library; revision: number };

function transaction<T>(operation: (records: IDBObjectStore) => Promise<T>): Promise<T> {
  return database()("readwrite", async (records) => {
    const done = promisifyRequest(records.transaction);
    // Observe aborts immediately, including failures before the operation reaches await done.
    void done.catch(() => undefined);
    try {
      const result = await operation(records);
      await done;
      return result;
    } catch (error) {
      try {
        records.transaction.abort();
      } catch {
        /* Already completed or aborted. */
      }
      await done.catch(() => undefined);
      throw error;
    }
  });
}

export async function loadLibrary(): Promise<StoredLibrary> {
  const legacy = await get<unknown>("still.current-reading.v1");
  return transaction(async (records) => {
    const request = records.get("settings");
    const settings = await promisifyRequest<Settings | undefined>(request);
    if (!settings) {
      const library = migrateSnapshot(legacy);
      for (const reading of library.readings) {
        records.put(reading, `reading:${reading.id}`);
        records.put(library.positions[reading.id], `position:${reading.id}`);
      }
      records.put(
        { activeId: library.activeId, wpm: library.wpm, revision: 0, schemaVersion: 2 },
        "settings",
      );
      return { library, revision: 0 };
    }
    const [keys, values] = await Promise.all([
      promisifyRequest(records.getAllKeys()),
      promisifyRequest(records.getAll()),
    ]);
    const readings: Reading[] = [];
    const positions: Record<string, Position> = {};
    keys.forEach((key, i) => {
      if (String(key).startsWith("reading:")) readings.push(values[i]);
      if (String(key).startsWith("position:"))
        Object.defineProperty(positions, String(key).slice(9), {
          value: values[i],
          enumerable: true,
        });
    });
    const library = parseBackup(
      JSON.stringify({
        format: "still-library",
        version: settings.schemaVersion ?? 1,
        library: { readings, positions, activeId: settings.activeId, wpm: settings.wpm },
      }),
    );
    if (!Number.isSafeInteger(settings.revision) || settings.revision < 0)
      throw new Error(
        "The saved library couldn't be opened. Restore a backup in another browser to recover it.",
      );
    const removed = readings.filter(
      (reading) => !library.readings.some((r) => r.id === reading.id),
    );
    if ((settings.schemaVersion ?? 1) === 1 || removed.length) {
      for (const reading of removed) {
        records.delete(`reading:${reading.id}`);
        records.delete(`position:${reading.id}`);
      }
      for (const reading of library.readings) {
        records.put(reading, `reading:${reading.id}`);
        records.put(library.positions[reading.id], `position:${reading.id}`);
      }
      records.put(
        {
          ...settings,
          activeId: library.activeId,
          revision: settings.revision + 1,
          schemaVersion: 2,
        },
        "settings",
      );
      return { library, revision: settings.revision + 1 };
    }
    return { library, revision: settings.revision };
  });
}

/** One transaction per save; unchanged book contents never get rewritten during playback. */
export async function saveLibrary(next: Library, previous: StoredLibrary): Promise<StoredLibrary> {
  await transaction(async (records) => {
    const settings = await promisifyRequest<Settings>(records.get("settings"));
    if (settings?.revision !== previous.revision) {
      throw new Error(
        "Your library changed in another tab. Export any unsaved reading, then reload this page.",
      );
    }
    const oldReadings = new Map(previous.library.readings.map((r) => [r.id, r]));
    for (const reading of next.readings) {
      if (oldReadings.get(reading.id) !== reading) records.put(reading, `reading:${reading.id}`);
      if (previous.library.positions[reading.id] !== next.positions[reading.id])
        records.put(next.positions[reading.id], `position:${reading.id}`);
      oldReadings.delete(reading.id);
    }
    for (const id of oldReadings.keys()) {
      records.delete(`reading:${id}`);
      records.delete(`position:${id}`);
    }
    records.put(
      { activeId: next.activeId, wpm: next.wpm, revision: previous.revision + 1, schemaVersion: 2 },
      "settings",
    );
  });
  return { library: next, revision: previous.revision + 1 };
}
