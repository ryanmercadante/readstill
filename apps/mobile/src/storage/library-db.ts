import {
  type Position,
  type Reading,
  initialPosition,
  readingProgress,
  validPosition,
} from "@still/reader-core";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import * as schema from "./schema";
import { positions, readings } from "./schema";

/**
 * A synchronous Drizzle database over the library schema: expo-sqlite in the
 * app, better-sqlite3 in tests. Synchronous writes reach disk before the app
 * can be suspended.
 */
export type LibraryDatabase = BaseSQLiteDatabase<"sync", unknown, typeof schema>;
type Transaction = Parameters<Parameters<LibraryDatabase["transaction"]>[0]>[0];

export type LibraryEntry = {
  id: string;
  title: string;
  addedAt: number;
  position: Position;
  /** Whole-percent progress, 100 once finished. */
  progress: number;
};

/** Durable journaling and enforced foreign keys. Run once per connection, before migrating. */
export function configure(db: LibraryDatabase) {
  db.get(sql`PRAGMA journal_mode = WAL`);
  db.run(sql`PRAGMA foreign_keys = ON`);
}

/** Saves a new reading with its starting position, both or neither. */
export function addReading(db: LibraryDatabase, reading: Reading) {
  db.transaction((tx) => {
    tx.insert(readings)
      .values({ id: reading.id, title: reading.title, addedAt: reading.addedAt, document: reading })
      .run();
    writePosition(tx, reading.id, initialPosition(reading));
  });
}

/** Saves the reader's place. Only this small row changes, so it is cheap to call on every pause. */
export function savePosition(db: LibraryDatabase, readingId: string, position: Position) {
  writePosition(db, readingId, position);
}

/** Every reading, newest first, with its saved place and progress. */
export function listReadings(db: LibraryDatabase): LibraryEntry[] {
  return db
    .select()
    .from(readings)
    .leftJoin(positions, eq(positions.readingId, readings.id))
    .orderBy(desc(readings.addedAt), asc(readings.id))
    .all()
    .map(({ readings: row, positions: saved }) => {
      const position = placeIn(row.document, saved);
      return {
        id: row.id,
        title: row.title,
        addedAt: row.addedAt,
        position,
        progress: readingProgress(row.document, position),
      };
    });
}

/** One reading and its saved place, or null if it is not in the library. */
export function getReading(
  db: LibraryDatabase,
  id: string,
): { reading: Reading; position: Position } | null {
  const row = db
    .select()
    .from(readings)
    .leftJoin(positions, eq(positions.readingId, readings.id))
    .where(eq(readings.id, id))
    .get();
  if (!row) return null;
  return {
    reading: row.readings.document,
    position: placeIn(row.readings.document, row.positions),
  };
}

function writePosition(db: LibraryDatabase | Transaction, readingId: string, position: Position) {
  const values = {
    chapterId: position.chapterId,
    blockId: position.blockId,
    wordIndex: position.index,
    finished: position.finished,
    updatedAt: position.updatedAt,
  };
  db.insert(positions)
    .values({ readingId, ...values })
    .onConflictDoUpdate({ target: positions.readingId, set: values })
    .run();
}

/** The saved place if it still fits the reading; otherwise the first word. */
function placeIn(reading: Reading, row: typeof positions.$inferSelect | null): Position {
  const saved = row && {
    chapterId: row.chapterId,
    blockId: row.blockId,
    index: row.wordIndex,
    finished: row.finished,
    updatedAt: row.updatedAt,
  };
  return validPosition(saved, reading) ? saved : initialPosition(reading);
}
