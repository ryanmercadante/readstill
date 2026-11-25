import type { Reading } from "@still/reader-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The on-device library. After changing a table, run `pnpm --filter @still/mobile db:generate`
// to add a migration; never edit a migration that has shipped.

export const readings = sqliteTable("readings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  addedAt: integer("added_at").notNull(),
  /** The whole reading, as JSON. */
  document: text("document", { mode: "json" }).$type<Reading>().notNull(),
});

/** One small row per reading, so saving the reader's place rewrites only this. */
export const positions = sqliteTable("positions", {
  readingId: text("reading_id")
    .primaryKey()
    .references(() => readings.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").notNull(),
  blockId: text("block_id").notNull(),
  wordIndex: integer("word_index").notNull(),
  finished: integer("finished", { mode: "boolean" }).notNull(),
  updatedAt: integer("updated_at").notNull(),
});
