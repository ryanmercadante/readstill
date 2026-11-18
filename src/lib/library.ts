import { MAX_TEXT_LENGTH, MAX_WPM, MIN_WPM, validSnapshot } from "./reader";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "./sample";
import { chapterSequence, chapterText, positionAt, sequenceIndex } from "./reader-document";
import { validLegacyLibrary } from "./library-v1";
import type { Library as LegacyLibrary } from "./library-v1";

export const MAX_READINGS = 100;
export const MAX_BOOK_TEXT = 2_000_000;
// A legacy 100,000-character passage can contain over 30,000 short paragraphs.
export const MAX_CHAPTER_BLOCKS = 40_000;
export const MAX_FILE_BYTES = 50_000_000;
export const MAX_BACKUP_BYTES = 250_000_000;
export type TextBlock = { id: string; type: "text"; text: string };
export type ImageBlock = { id: string; type: "image"; src: string; alt: string };
export type TableCell = {
  text: string;
  header: boolean;
  rowSpan: number;
  colSpan: number;
  scope?: "row" | "col" | "rowgroup" | "colgroup";
};
export type TableBlock = { id: string; type: "table"; caption: string; rows: TableCell[][] };
export type UnsupportedBlock = { id: string; type: "unsupported"; label: string; reason: string };
export type ContentBlock = TextBlock | ImageBlock | TableBlock | UnsupportedBlock;
export type Chapter = { id: string; title: string; blocks: ContentBlock[] };
export type ImportIssue = { chapterId: string; blockId: string; message: string };
export type Reading = {
  id: string;
  title: string;
  author: string;
  kind: "text" | "epub";
  chapters: Chapter[];
  addedAt: number;
  originalEpub?: { name: string; data: string };
  importIssues?: ImportIssue[];
};
export type Position = {
  chapterId: string;
  blockId: string;
  index: number;
  finished: boolean;
  updatedAt: number;
};
export type Library = {
  readings: Reading[];
  positions: Record<string, Position>;
  activeId: string | null;
  wpm: number;
};
export type Backup = { format: "still-library"; version: 2; library: Library };

export function proseBlocks(text: string): TextBlock[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((text, i) => ({ id: `p${i}`, type: "text", text }));
}
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
    chapters: [{ id: "text", title: "Passage", blocks: proseBlocks(text) }],
    addedAt: Date.now(),
  };
}
export const sampleReading: Reading = {
  id: "still-sample",
  title: SAMPLE_TITLE,
  author: "",
  kind: "text",
  addedAt: 0,
  chapters: [{ id: "text", title: "Passage", blocks: proseBlocks(SAMPLE_TEXT) }],
};
export function initialPosition(reading: Reading): Position {
  return positionAt(reading.chapters[0], 0, false, 0);
}

/** Remove only the built-in passage, including copies added by the old sample shortcut. */
export function withoutSample(library: Library): Library {
  const readings = library.readings.filter(
    (reading) =>
      !(
        reading.kind === "text" &&
        reading.title === SAMPLE_TITLE &&
        reading.chapters.length === 1 &&
        reading.chapters[0].blocks.every((block) => block.type === "text") &&
        chapterText(reading.chapters[0]) === chapterText(sampleReading.chapters[0])
      ),
  );
  if (readings.length === library.readings.length) return library;
  return {
    ...library,
    readings,
    positions: Object.fromEntries(
      readings.map((reading) => [reading.id, library.positions[reading.id]]),
    ),
    activeId: readings.some((reading) => reading.id === library.activeId)
      ? library.activeId
      : (readings[0]?.id ?? null),
  };
}

export function migrateSnapshot(value: unknown): Library {
  if (!validSnapshot(value)) return { readings: [], positions: {}, activeId: null, wpm: 250 };
  const reading = textReading(value.text, value.title, "previous-reading");
  return withoutSample({
    readings: [reading],
    positions: { [reading.id]: positionAt(reading.chapters[0], value.index, false, 0) },
    activeId: reading.id,
    wpm: value.wpm,
  });
}

export function migrateV1Library(legacy: LegacyLibrary): Library {
  const readings: Reading[] = legacy.readings.map((reading) => ({
    id: reading.id,
    title: reading.title,
    author: reading.author,
    kind: reading.kind,
    addedAt: reading.addedAt,
    chapters: reading.chapters.map((chapter) => {
      const prose = proseBlocks(chapter.text);
      const blocks: ContentBlock[] = [];
      for (let i = 0; i <= prose.length; i++) {
        chapter.images.forEach((image, j) => {
          if (Math.min(image.beforeParagraph, prose.length) === i)
            blocks.push({ id: `image${j}`, type: "image", src: image.src, alt: image.alt });
        });
        if (prose[i]) blocks.push(prose[i]);
      }
      return { id: chapter.id, title: chapter.title, blocks };
    }),
  }));
  const positions = Object.fromEntries(
    readings.map((reading) => {
      const old = legacy.positions[reading.id];
      const chapter = reading.chapters.find((c) => c.id === old.chapterId)!;
      const sequence = chapterSequence(chapter);
      const word = sequence.filter((entry) => !entry.context)[old.index];
      return [
        reading.id,
        positionAt(
          chapter,
          word.index,
          old.finished && word.index === sequence.length - 1,
          old.updatedAt,
        ),
      ];
    }),
  );
  return withoutSample({
    readings,
    positions,
    activeId: legacy.activeId ?? readings[0]?.id ?? null,
    wpm: legacy.wpm,
  });
}

const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const identifier = (v: unknown): v is string =>
  string(v, 1000) && !!v && !["__proto__", "constructor", "prototype"].includes(v);
const timestamp = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const base64 = (v: unknown, max: number): v is string =>
  string(v, max) && v.length > 0 && v.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(v);
const span = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 100;

function validBlock(v: unknown): v is ContentBlock {
  if (!object(v) || !identifier(v.id)) return false;
  if (v.type === "text") return string(v.text, MAX_TEXT_LENGTH) && !!v.text.trim();
  if (v.type === "image")
    return (
      string(v.alt, 1000) &&
      string(v.src, 7_000_000) &&
      /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(v.src)
    );
  if (v.type === "unsupported")
    return string(v.label, 300) && !!v.label.trim() && string(v.reason, 1000) && !!v.reason.trim();
  if (
    v.type !== "table" ||
    !string(v.caption, 1000) ||
    !Array.isArray(v.rows) ||
    !v.rows.length ||
    v.rows.length > 200
  )
    return false;
  let cells = 0;
  return v.rows.every(
    (row) =>
      Array.isArray(row) &&
      row.length > 0 &&
      row.length <= 50 &&
      (cells += row.length) <= 5000 &&
      row.every(
        (cell) =>
          object(cell) &&
          string(cell.text, MAX_TEXT_LENGTH) &&
          typeof cell.header === "boolean" &&
          span(cell.rowSpan) &&
          span(cell.colSpan) &&
          (cell.scope === undefined ||
            ["row", "col", "rowgroup", "colgroup"].includes(cell.scope as string)),
      ),
  );
}
export function blockTextSize(block: ContentBlock): number {
  return block.type === "text"
    ? block.text.length
    : block.type === "table"
      ? block.caption.length + block.rows.flat().reduce((size, c) => size + c.text.length, 0)
      : 0;
}
export function validReading(v: unknown): v is Reading {
  if (
    !object(v) ||
    !identifier(v.id) ||
    !string(v.title, 300) ||
    !v.title.trim() ||
    !string(v.author, 300) ||
    !["text", "epub"].includes(v.kind as string) ||
    !timestamp(v.addedAt) ||
    !Array.isArray(v.chapters) ||
    !v.chapters.length ||
    v.chapters.length > 500
  )
    return false;
  let total = 0;
  const chapterIds = new Set<string>();
  if (
    !v.chapters.every((c) => {
      if (
        !object(c) ||
        !identifier(c.id) ||
        chapterIds.has(c.id) ||
        !string(c.title, 300) ||
        !Array.isArray(c.blocks) ||
        !c.blocks.length ||
        c.blocks.length > MAX_CHAPTER_BLOCKS ||
        !c.blocks.every(validBlock)
      )
        return false;
      chapterIds.add(c.id);
      const ids = new Set(c.blocks.map((b: ContentBlock) => b.id));
      const size = c.blocks.reduce((n: number, b: ContentBlock) => n + blockTextSize(b), 0);
      total += size;
      return (
        ids.size === c.blocks.length &&
        size <= MAX_TEXT_LENGTH &&
        total <= MAX_BOOK_TEXT &&
        c.blocks.filter((b: ContentBlock) => b.type === "image").length <= 100
      );
    })
  )
    return false;
  if (
    v.originalEpub !== undefined &&
    (!object(v.originalEpub) ||
      !string(v.originalEpub.name, 200) ||
      !base64(v.originalEpub.data, Math.ceil(MAX_FILE_BYTES / 3) * 4))
  )
    return false;
  const chapters = v.chapters as Chapter[];
  if (
    v.importIssues !== undefined &&
    (!Array.isArray(v.importIssues) ||
      v.importIssues.length > 2000 ||
      !v.importIssues.every(
        (issue) =>
          object(issue) &&
          string(issue.message, 1000) &&
          chapters.some(
            (c: Chapter) =>
              c.id === issue.chapterId && c.blocks.some((b) => b.id === issue.blockId),
          ),
      ))
  )
    return false;
  return true;
}
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

function copyBlock(block: ContentBlock): ContentBlock {
  if (block.type === "text") return { id: block.id, type: "text", text: block.text };
  if (block.type === "image")
    return { id: block.id, type: "image", src: block.src, alt: block.alt };
  if (block.type === "unsupported")
    return { id: block.id, type: "unsupported", label: block.label, reason: block.reason };
  return {
    id: block.id,
    type: "table",
    caption: block.caption,
    rows: block.rows.map((row) =>
      row.map((c) => ({
        text: c.text,
        header: c.header,
        rowSpan: c.rowSpan,
        colSpan: c.colSpan,
        ...(c.scope ? { scope: c.scope } : {}),
      })),
    ),
  };
}
export function parseBackup(raw: string): Library {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES)
    throw new Error("Choose a Still backup smaller than 250 MB.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("This file isn't a readable Still backup.");
  }
  if (
    !object(data) ||
    data.format !== "still-library" ||
    ![1, 2].includes(data.version as number) ||
    !object(data.library)
  )
    throw new Error("Choose a Still library backup (version 1 or 2).");
  const library = data.library;
  if (
    !Number.isInteger(library.wpm) ||
    (library.wpm as number) < MIN_WPM ||
    (library.wpm as number) > MAX_WPM
  )
    throw new Error("This backup contains invalid settings.");
  if (data.version === 1) {
    if (!validLegacyLibrary(library))
      throw new Error("This backup contains invalid readings or positions.");
    return migrateV1Library(library);
  }
  if (
    !Array.isArray(library.readings) ||
    library.readings.length > MAX_READINGS ||
    !library.readings.every(validReading) ||
    !object(library.positions)
  )
    throw new Error("This backup contains invalid readings.");
  const ids = new Set(library.readings.map((r: Reading) => r.id));
  if (
    ids.size !== library.readings.length ||
    (library.activeId === null ? ids.size > 0 : !ids.has(library.activeId as string)) ||
    !library.readings.every((r: Reading) =>
      validPosition((library.positions as Record<string, unknown>)[r.id], r),
    )
  )
    throw new Error("This backup contains invalid reading positions.");
  const readings = library.readings.map((r: Reading): Reading => ({
    id: r.id,
    title: r.title,
    author: r.author,
    kind: r.kind,
    addedAt: r.addedAt,
    chapters: r.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      blocks: c.blocks.map(copyBlock),
    })),
    ...(r.originalEpub
      ? { originalEpub: { name: r.originalEpub.name, data: r.originalEpub.data } }
      : {}),
    ...(r.importIssues
      ? {
          importIssues: r.importIssues.map((i) => ({
            chapterId: i.chapterId,
            blockId: i.blockId,
            message: i.message,
          })),
        }
      : {}),
  }));
  const positions = Object.fromEntries(
    readings.map((r) => {
      const p = (library.positions as Record<string, Position>)[r.id];
      return [
        r.id,
        {
          chapterId: p.chapterId,
          blockId: p.blockId,
          index: p.index,
          finished: p.finished,
          updatedAt: p.updatedAt,
        },
      ];
    }),
  );
  return withoutSample({
    readings,
    positions,
    activeId: library.activeId as string | null,
    wpm: library.wpm as number,
  });
}
export function serializeBackup(library: Library): string {
  const data: Backup = { format: "still-library", version: 2, library };
  const raw = JSON.stringify(data);
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES)
    throw new Error(
      "The library exceeds the 250 MB backup limit. Export individual readings instead.",
    );
  return raw;
}
export function assertLibraryCapacity(library: Library): void {
  if (new TextEncoder().encode(serializeBackup(library)).length > MAX_BACKUP_BYTES - 10_000)
    throw new Error(
      "This would fill your library's 250 MB backup allowance. Export and remove a reading before importing more.",
    );
}
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
