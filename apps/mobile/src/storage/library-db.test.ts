import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Position, textReading } from "@still/reader-core";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";

import {
  type LibraryDatabase,
  addReading,
  configure,
  getReading,
  listReadings,
  savePosition,
} from "./library-db";
import * as schema from "./schema";

// Opens a database the way the app does, but with better-sqlite3 (also
// synchronous) and the same generated migrations the app bundles.
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));
function open(path = ":memory:"): { db: LibraryDatabase; close(): void } {
  const client = new Database(path);
  const db = drizzle(client, { schema });
  configure(db);
  migrate(db, { migrationsFolder });
  return { db, close: () => client.close() };
}

const passage = (id: string, addedAt: number) => ({
  ...textReading("One two three.\n\nFour five.", `Reading ${id}`, id),
  addedAt,
});
const at = (blockId: string, index: number, finished = false): Position => ({
  chapterId: "text",
  blockId,
  index,
  finished,
  updatedAt: 500,
});

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
});

describe("library database", () => {
  it("adds readings at their first word and lists the newest first", () => {
    const { db } = open();
    addReading(db, passage("old", 1));
    addReading(db, passage("new", 2));

    expect(listReadings(db).map(({ id, title, progress }) => ({ id, title, progress }))).toEqual([
      { id: "new", title: "Reading new", progress: 0 },
      { id: "old", title: "Reading old", progress: 0 },
    ]);
    expect(getReading(db, "old")?.position).toMatchObject({ blockId: "p0", index: 0 });
    expect(getReading(db, "old")?.reading).toEqual(passage("old", 1));
    expect(getReading(db, "missing")).toBeNull();
  });

  it("keeps the saved word after the database is closed and reopened", () => {
    const directory = mkdtempSync(join(tmpdir(), "still-library-"));
    directories.push(directory);
    const path = join(directory, "still.db");

    const first = open(path);
    addReading(first.db, passage("essay", 1));
    savePosition(first.db, "essay", at("p1", 1));
    first.close();

    const reopened = open(path);
    expect(getReading(reopened.db, "essay")?.position).toEqual(at("p1", 1));
    expect(listReadings(reopened.db)[0].progress).toBe(80);
    reopened.close();
  });

  it("overwrites the single position row and reports finished readings as 100%", () => {
    const { db } = open();
    addReading(db, passage("essay", 1));
    savePosition(db, "essay", at("p0", 2));
    savePosition(db, "essay", at("p1", 1, true));

    expect(db.all(sql`SELECT reading_id FROM positions`)).toHaveLength(1);
    expect(listReadings(db)[0]).toMatchObject({ progress: 100, position: at("p1", 1, true) });
  });

  it("falls back to the first word when a saved position no longer fits", () => {
    const { db } = open();
    addReading(db, passage("essay", 1));
    savePosition(db, "essay", at("p9", 0));

    expect(getReading(db, "essay")?.position).toMatchObject({ blockId: "p0", index: 0 });
  });

  it("rejects positions for readings that are not saved", () => {
    const { db } = open();

    expect(() => savePosition(db, "missing", at("p0", 0))).toThrow();
  });

  it("adds nothing when the reading fails to save", () => {
    const { db } = open();
    addReading(db, passage("essay", 1));

    expect(() => addReading(db, passage("essay", 2))).toThrow();
    expect(listReadings(db)).toHaveLength(1);
    expect(db.all(sql`SELECT reading_id FROM positions`)).toHaveLength(1);
  });

  it("applies each migration once, even when reopened", () => {
    const directory = mkdtempSync(join(tmpdir(), "still-library-"));
    directories.push(directory);
    const path = join(directory, "still.db");

    const first = open(path);
    addReading(first.db, passage("essay", 1));
    first.close();

    const reopened = open(path);
    expect(reopened.db.all(sql`SELECT id FROM __drizzle_migrations`)).toHaveLength(1);
    expect(listReadings(reopened.db)).toHaveLength(1);
    reopened.close();
  });
});
