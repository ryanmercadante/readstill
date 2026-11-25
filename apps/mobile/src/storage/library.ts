import type { Position, Reading } from "@still/reader-core";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import { useSyncExternalStore } from "react";

import migrations from "../../drizzle/migrations";
import {
  type LibraryEntry,
  addReading,
  configure,
  getReading,
  listReadings,
  savePosition,
} from "./library-db";
import * as schema from "./schema";

export type { LibraryEntry } from "./library-db";

// The on-device library. Writes are synchronous, so a saved position is on disk
// before the app can be suspended or closed.
const db = drizzle(openDatabaseSync("still.db"), { schema });
configure(db);

/** Applies pending migrations. The root layout waits for this before showing screens. */
export function useLibraryMigrations() {
  return useMigrations(db, migrations);
}

const listeners = new Set<() => void>();
let entries: LibraryEntry[] | null = null;

function changed() {
  entries = null;
  for (const listener of listeners) listener();
}

export const library = {
  add(reading: Reading) {
    addReading(db, reading);
    changed();
  },
  get(id: string) {
    return getReading(db, id);
  },
  savePosition(readingId: string, position: Position) {
    savePosition(db, readingId, position);
    changed();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Every reading, newest first. Re-renders after any add or saved position. */
export function useLibraryEntries(): LibraryEntry[] {
  return useSyncExternalStore(subscribe, () => (entries ??= listReadings(db)));
}
