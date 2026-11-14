import { MAX_TEXT_LENGTH, MAX_WPM, MIN_WPM, tokenize, validSnapshot } from "./reader";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "./sample";

export const MAX_READINGS = 100;
export const MAX_BOOK_TEXT = 2_000_000;
export const MAX_FILE_BYTES = 25_000_000;

export type Illustration = { beforeParagraph: number; src: string; alt: string };
export type Chapter = { id: string; title: string; text: string; images: Illustration[] };
export type Reading = {
  id: string;
  title: string;
  author: string;
  kind: "text" | "epub";
  chapters: Chapter[];
  addedAt: number;
};
export type Position = { chapterId: string; index: number; finished: boolean; updatedAt: number };
export type Library = {
  readings: Reading[];
  positions: Record<string, Position>;
  activeId: string | null;
  wpm: number;
};
export type Backup = { format: "still-library"; version: 1; library: Library };

export function textReading(
  text: string,
  title: string,
  id: string = crypto.randomUUID(),
): Reading {
  if (!text.trim() || text.length > MAX_TEXT_LENGTH)
    throw new Error("Use 1–100,000 characters per passage.");
  return {
    id,
    title: title.trim().slice(0, 100) || "Untitled reading",
    author: "",
    kind: "text",
    chapters: [{ id: "text", title: "Passage", text: text.trim(), images: [] }],
    addedAt: Date.now(),
  };
}

// Stable server-rendered sample; never create random identifiers during hydration.
export const sampleReading: Reading = {
  id: "still-sample",
  title: SAMPLE_TITLE,
  author: "",
  kind: "text",
  addedAt: 0,
  chapters: [{ id: "text", title: "Passage", text: SAMPLE_TEXT, images: [] }],
};

export function initialPosition(reading: Reading): Position {
  return { chapterId: reading.chapters[0].id, index: 0, finished: false, updatedAt: 0 };
}

export function migrateSnapshot(value: unknown): Library {
  const reading = validSnapshot(value)
    ? textReading(value.text, value.title, "previous-reading")
    : sampleReading;
  const position = initialPosition(reading);
  if (validSnapshot(value))
    position.index = Math.min(value.index, tokenize(reading.chapters[0].text).flat().length - 1);
  return {
    readings: [reading],
    positions: { [reading.id]: position },
    activeId: reading.id,
    wpm: validSnapshot(value) ? value.wpm : 250,
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;
const identifier = (value: unknown): value is string =>
  string(value, 1000) &&
  value.length > 0 &&
  !["__proto__", "constructor", "prototype"].includes(value);
const timestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validReading(value: unknown): value is Reading {
  if (
    !object(value) ||
    !identifier(value.id) ||
    !string(value.title, 300) ||
    !value.title.trim() ||
    !string(value.author, 300) ||
    !["text", "epub"].includes(value.kind as string) ||
    !timestamp(value.addedAt) ||
    !Array.isArray(value.chapters) ||
    !value.chapters.length ||
    value.chapters.length > 500
  )
    return false;
  let size = 0;
  const ids = new Set<string>();
  return value.chapters.every((chapter) => {
    if (
      !object(chapter) ||
      !identifier(chapter.id) ||
      ids.has(chapter.id) ||
      !string(chapter.title, 300) ||
      !string(chapter.text, MAX_TEXT_LENGTH) ||
      !chapter.text.trim() ||
      !Array.isArray(chapter.images) ||
      chapter.images.length > 100
    )
      return false;
    ids.add(chapter.id);
    size += chapter.text.length;
    const paragraphCount = chapter.text.split(/\n\s*\n/).length;
    return (
      size <= MAX_BOOK_TEXT &&
      chapter.images.every(
        (image) =>
          object(image) &&
          Number.isInteger(image.beforeParagraph) &&
          (image.beforeParagraph as number) >= 0 &&
          (image.beforeParagraph as number) <= paragraphCount &&
          string(image.alt, 1000) &&
          string(image.src, 7_000_000) &&
          /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(image.src),
      )
    );
  });
}

export function validPosition(value: unknown, reading: Reading): value is Position {
  if (
    !object(value) ||
    !Number.isInteger(value.index) ||
    (value.index as number) < 0 ||
    typeof value.finished !== "boolean" ||
    !timestamp(value.updatedAt)
  )
    return false;
  const chapterIndex = reading.chapters.findIndex((c) => c.id === value.chapterId);
  if (chapterIndex < 0) return false;
  const count = chapterWordCounts(reading)[chapterIndex];
  return (value.index as number) < count && (!value.finished || value.index === count - 1);
}

export function parseBackup(raw: string): Library {
  if (new TextEncoder().encode(raw).length > MAX_FILE_BYTES)
    throw new Error("This backup is too large. Choose a backup smaller than 25 MB.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("This file isn't a readable Still backup.");
  }
  if (
    !object(data) ||
    data.format !== "still-library" ||
    data.version !== 1 ||
    !object(data.library)
  )
    throw new Error("Choose a Still library backup (version 1).");
  const library = data.library;
  if (
    !Array.isArray(library.readings) ||
    library.readings.length > MAX_READINGS ||
    !library.readings.every(validReading) ||
    !object(library.positions) ||
    !Number.isInteger(library.wpm) ||
    (library.wpm as number) < MIN_WPM ||
    (library.wpm as number) > MAX_WPM
  )
    throw new Error("This backup contains invalid readings or settings.");
  const ids = new Set(library.readings.map((r: Reading) => r.id));
  if (
    ids.size !== library.readings.length ||
    (library.activeId !== null && !ids.has(library.activeId as string)) ||
    !library.readings.every((r: Reading) =>
      validPosition((library.positions as Record<string, unknown>)[r.id], r),
    )
  )
    throw new Error("This backup contains invalid reading positions.");
  // Only copy schema fields. Extra user-controlled keys never enter application state.
  const readings = library.readings.map((r: Reading): Reading => ({
    id: r.id,
    title: r.title,
    author: r.author,
    kind: r.kind,
    addedAt: r.addedAt,
    chapters: r.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      text: c.text,
      images: c.images.map((i) => ({ src: i.src, alt: i.alt, beforeParagraph: i.beforeParagraph })),
    })),
  }));
  const positions = Object.fromEntries(
    readings.map((r) => {
      const p = (library.positions as Record<string, Position>)[r.id];
      return [
        r.id,
        { chapterId: p.chapterId, index: p.index, finished: p.finished, updatedAt: p.updatedAt },
      ];
    }),
  );
  return {
    readings,
    positions,
    activeId: library.activeId as string | null,
    wpm: library.wpm as number,
  };
}

export function serializeBackup(library: Library): string {
  const data: Backup = { format: "still-library", version: 1, library };
  const raw = JSON.stringify(data);
  if (new TextEncoder().encode(raw).length > MAX_FILE_BYTES)
    throw new Error(
      "The library exceeds the 25 MB backup limit. Export individual readings instead.",
    );
  return raw;
}

export function assertLibraryCapacity(library: Library): void {
  // Reserve space for longer positions/timestamps so a near-limit import can
  // always be exported and reopened after its reading progress advances.
  if (new TextEncoder().encode(serializeBackup(library)).length > MAX_FILE_BYTES - 10_000)
    throw new Error(
      "This would fill your library's 25 MB backup allowance. Export and remove a reading before importing more.",
    );
}

/** Restore adds readings; an existing reading and its newer progress always win. */
export function mergeLibrary(current: Library, incoming: Library): Library {
  const readings = [...current.readings];
  const positions = { ...current.positions };
  for (const item of incoming.readings) {
    const existing = readings.find((r) => r.id === item.id);
    if (
      existing &&
      JSON.stringify(existing.chapters) === JSON.stringify(item.chapters) &&
      existing.title === item.title
    )
      continue;
    const reading = existing ? { ...item, id: crypto.randomUUID() } : item;
    readings.push(reading);
    positions[reading.id] = incoming.positions[item.id];
  }
  if (readings.length > MAX_READINGS)
    throw new Error(
      "The library can hold 100 readings. Remove a reading before restoring this backup.",
    );
  return {
    ...current,
    readings,
    positions,
    activeId: current.activeId ?? incoming.activeId ?? readings[0]?.id ?? null,
    wpm: current.readings.length ? current.wpm : incoming.wpm,
  };
}

const countsByReading = new WeakMap<Reading, number[]>();
function chapterWordCounts(reading: Reading): number[] {
  let counts = countsByReading.get(reading);
  if (!counts) {
    counts = reading.chapters.map((c) =>
      tokenize(c.text).reduce((sum, paragraph) => sum + paragraph.length, 0),
    );
    countsByReading.set(reading, counts);
  }
  return counts;
}

export function readingProgress(reading: Reading, position: Position): number {
  const chapter = reading.chapters.findIndex((c) => c.id === position.chapterId);
  const counts = chapterWordCounts(reading);
  const before = counts.slice(0, chapter).reduce((a, b) => a + b, 0);
  return Math.floor(
    (100 * (before + position.index + (position.finished ? 1 : 0))) /
      counts.reduce((a, b) => a + b, 0),
  );
}
