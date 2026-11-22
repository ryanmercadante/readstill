import { MAX_TEXT_LENGTH, tokenize } from "./reader";
const MAX_BOOK_TEXT = 2_000_000;
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
  const count = tokenize(reading.chapters[chapterIndex].text).flat().length;
  return (value.index as number) < count && (!value.finished || value.index === count - 1);
}

export function validLegacyLibrary(value: unknown): value is Library {
  if (
    !object(value) ||
    !Array.isArray(value.readings) ||
    value.readings.length > 100 ||
    !value.readings.every(validReading) ||
    !object(value.positions)
  )
    return false;
  const ids = new Set(value.readings.map((r: Reading) => r.id));
  return (
    ids.size === value.readings.length &&
    (value.activeId === null || ids.has(value.activeId as string)) &&
    value.readings.every((r: Reading) =>
      validPosition((value.positions as Record<string, unknown>)[r.id], r),
    )
  );
}
