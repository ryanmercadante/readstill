import { MAX_TEXT_LENGTH } from "./reader";
import { chapterSequence, positionAt, sequenceIndex } from "./reader-document";
import type { Position, Reading, TextBlock } from "./document-types";

const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const identifier = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length <= 1000 &&
  !!v &&
  !["__proto__", "constructor", "prototype"].includes(v);
const timestamp = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Splits pasted text into paragraphs with stable ids, so every client agrees on block locations. */
export function proseBlocks(text: string): TextBlock[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((text, i) => ({ id: `p${i}`, type: "text", text }));
}

/** Builds a pasted passage. Each client supplies the id from its own random source. */
export function textReading(text: string, title: string, id: string): Reading {
  if (!text.trim() || text.length > MAX_TEXT_LENGTH)
    throw new Error("Use 1–100,000 characters per passage.");
  return {
    id,
    title: title.trim().slice(0, 100) || "Untitled reading",
    author: "",
    kind: "text",
    chapters: [{ id: "text", title: "Passage", blocks: proseBlocks(text) }],
    addedAt: Date.now(),
  };
}

export function initialPosition(reading: Reading): Position {
  return positionAt(reading.chapters[0], 0, false, 0);
}

/** Whether a saved checkpoint still points at a word or stop in this reading. */
export function validPosition(value: unknown, reading: Reading): value is Position {
  if (
    !object(value) ||
    !identifier(value.blockId) ||
    !Number.isInteger(value.index) ||
    (value.index as number) < 0 ||
    typeof value.finished !== "boolean" ||
    !timestamp(value.updatedAt)
  )
    return false;
  const chapter = reading.chapters.find((c) => c.id === value.chapterId);
  if (!chapter) return false;
  const index = sequenceIndex(chapter, value as Position);
  return index >= 0 && (!value.finished || index === chapterSequence(chapter).length - 1);
}

/** Whole-percent progress through every chapter, counting a finished reading as 100. */
export function readingProgress(reading: Reading, position: Position): number {
  const chapter = reading.chapters.findIndex((c) => c.id === position.chapterId);
  const counts = reading.chapters.map((c) => chapterSequence(c).length);
  const before = counts.slice(0, chapter).reduce((a, b) => a + b, 0);
  return Math.floor(
    (100 *
      (before + sequenceIndex(reading.chapters[chapter], position) + (position.finished ? 1 : 0))) /
      counts.reduce((a, b) => a + b, 0),
  );
}
