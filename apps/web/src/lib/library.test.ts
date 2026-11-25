import { describe, expect, it } from "vitest";
import {
  initialPosition,
  mergeLibrary,
  migrateSnapshot,
  parseBackup,
  proseBlocks,
  readingProgress,
  serializeBackup,
  textReading,
  validReading,
  sampleReading,
} from "./library";
import type { Library } from "./library";
import { chapterSequence, chapterText, positionAt, sequenceIndex } from "@still/reader-core";
const library = (): Library => {
  const reading = textReading("First sentence. Next one.", "An essay", "essay");
  return {
    readings: [reading],
    positions: { essay: { ...initialPosition(reading), index: 2, updatedAt: 123 } },
    activeId: "essay",
    wpm: 300,
  };
};
describe("library and backups", () => {
  it("starts empty and leaves the legacy sample out of migration", () => {
    expect(migrateSnapshot(undefined)).toEqual({
      readings: [],
      positions: {},
      activeId: null,
      wpm: 250,
    });
    expect(
      migrateSnapshot({
        version: 1,
        text: chapterText(sampleReading.chapters[0]),
        title: sampleReading.title,
        index: 4,
        wpm: 375,
      }),
    ).toEqual({ readings: [], positions: {}, activeId: null, wpm: 375 });
  });
  it("removes built-in and copied samples from backups while retaining real readings and progress", () => {
    const real = library();
    const copy = { ...sampleReading, id: "old-shortcut-copy" };
    const backup = {
      ...real,
      readings: [sampleReading, copy, ...real.readings],
      positions: {
        ...real.positions,
        [sampleReading.id]: initialPosition(sampleReading),
        [copy.id]: initialPosition(copy),
      },
      activeId: sampleReading.id,
    };
    expect(parseBackup(serializeBackup(backup))).toEqual(real);
    const sameTitle = textReading("My own writing.", sampleReading.title, "own-writing");
    const own = {
      ...real,
      readings: [sameTitle],
      positions: { [sameTitle.id]: initialPosition(sameTitle) },
      activeId: sameTitle.id,
    };
    expect(parseBackup(serializeBackup(own))).toEqual(own);
  });
  it("removes the sample from version 1 backups", () => {
    const legacy = {
      readings: [
        {
          ...sampleReading,
          chapters: [
            {
              id: "text",
              title: "Passage",
              text: chapterText(sampleReading.chapters[0]),
              images: [],
            },
          ],
        },
      ],
      positions: {
        [sampleReading.id]: { chapterId: "text", index: 4, finished: false, updatedAt: 1 },
      },
      activeId: sampleReading.id,
      wpm: 300,
    };
    expect(
      parseBackup(JSON.stringify({ format: "still-library", version: 1, library: legacy })),
    ).toEqual({ readings: [], positions: {}, activeId: null, wpm: 300 });
  });
  it("keeps the previous text limit valid even for many short paragraphs", () => {
    expect(validReading(textReading("x\n\n".repeat(30_000), "Many paragraphs"))).toBe(true);
  });
  it("migrates a single snapshot without losing text, pace, or position", () => {
    const result = migrateSnapshot({
      version: 1,
      text: "Some old words.",
      title: "My passage",
      index: 999,
      wpm: 375,
    });
    expect(chapterText(result.readings[0].chapters[0])).toBe("Some old words.");
    expect(result.positions["previous-reading"]).toMatchObject({ blockId: "p0", index: 2 });
    expect(result.wpm).toBe(375);
  });
  it("migrates version 1 backups to block locations without shifting the current word", () => {
    const old = {
      readings: [
        {
          id: "book",
          title: "Book",
          author: "",
          kind: "epub",
          addedAt: 0,
          chapters: [
            {
              id: "c",
              title: "Chapter",
              text: "First words.\n\nNext few words.",
              images: [{ beforeParagraph: 1, src: "data:image/png;base64,YQ==", alt: "Picture" }],
            },
          ],
        },
      ],
      positions: { book: { chapterId: "c", index: 3, finished: false, updatedAt: 8 } },
      activeId: "book",
      wpm: 325,
    };
    const migrated = parseBackup(
      JSON.stringify({ format: "still-library", version: 1, library: old }),
    );
    expect(migrated.positions.book).toEqual({
      chapterId: "c",
      blockId: "p1",
      index: 1,
      finished: false,
      updatedAt: 8,
    });
    const chapter = migrated.readings[0].chapters[0];
    expect(chapterSequence(chapter)[sequenceIndex(chapter, migrated.positions.book)].text).toBe(
      "few",
    );
    expect(chapter.blocks.map((b) => b.type)).toEqual(["text", "image", "text"]);
    expect(parseBackup(serializeBackup(migrated))).toEqual(migrated);
  });
  it("round trips rich blocks, originals, notes, and completion", () => {
    const value = library();
    const chapter = {
      id: "chapter-two",
      title: "A return",
      blocks: [
        ...proseBlocks("Final words."),
        {
          id: "table",
          type: "table" as const,
          caption: "Results",
          rows: [[{ text: "Header", header: true, rowSpan: 2, colSpan: 1, scope: "col" as const }]],
        },
        {
          id: "image",
          type: "image" as const,
          src: "data:image/png;base64,YQ==",
          alt: "Illustration",
        },
        {
          id: "note",
          type: "unsupported" as const,
          label: "Formula",
          reason: "Read in the original EPUB.",
        },
      ],
    };
    value.readings[0].chapters.push(chapter);
    value.readings[0].originalEpub = { name: "book.epub", data: "UEsDBA==" };
    value.readings[0].importIssues = [
      { chapterId: chapter.id, blockId: "note", message: "Formula preserved in the original." },
    ];
    value.positions.essay = positionAt(chapter, chapterSequence(chapter).length - 1, true, 1000);
    expect(JSON.parse(serializeBackup(value)).version).toBe(2);
    expect(parseBackup(serializeBackup(value))).toEqual(value);
    expect(readingProgress(value.readings[0], value.positions.essay)).toBe(100);
  });
  it("keeps existing progress and separates identifier conflicts", () => {
    const current = library();
    const incoming = library();
    incoming.positions.essay.index = 0;
    expect(mergeLibrary(current, incoming)).toEqual(current);
    incoming.readings[0].chapters[0].blocks = proseBlocks(
      "Different content using the same identifier.",
    );
    const merged = mergeLibrary(current, incoming);
    expect(merged.readings).toHaveLength(2);
    expect(merged.readings[1].id).not.toBe("essay");
    expect(merged.positions.essay.index).toBe(2);
    expect(merged.positions[merged.readings[1].id].index).toBe(0);
    expect(
      mergeLibrary({ readings: [], positions: {}, activeId: null, wpm: 250 }, current),
    ).toEqual(current);
  });
  it("round trips web readings with their source page", () => {
    const value = library();
    value.readings[0] = {
      ...value.readings[0],
      kind: "web",
      source: { url: "https://quiet.example/essays/slow?ref=a", siteName: "The Quiet Review" },
    };
    expect(parseBackup(serializeBackup(value))).toEqual(value);
  });
  it("uses sentence tokenization for saved positions", () => {
    const value = library();
    value.readings[0].chapters[0].blocks = proseBlocks("你好。世界。");
    value.positions.essay.index = 1;
    value.positions.essay.finished = true;
    expect(parseBackup(serializeBackup(value))).toEqual(value);
  });
  it("rejects unsafe resources, invalid block locations, and hostile table layouts", () => {
    for (const mutate of [
      (v: Library) => {
        v.positions.essay.blockId = "missing";
      },
      (v: Library) => {
        v.positions.essay.index = 10000;
      },
      (v: Library) => {
        v.positions.essay.finished = true;
      },
      (v: Library) => {
        v.readings[0].id = "__proto__";
      },
      (v: Library) => {
        v.readings[0].source = { url: "javascript:alert(1)", siteName: "Example" };
      },
      (v: Library) => {
        v.readings[0].source = { url: "https://example.com/a b", siteName: "Example" };
      },
      (v: Library) => {
        v.readings[0].chapters[0].blocks.push({
          id: "image",
          type: "image",
          src: "data:image/svg+xml;base64,YQ==",
          alt: "Image",
        });
      },
      (v: Library) => {
        v.readings[0].chapters[0].blocks.push({
          id: "table",
          type: "table",
          caption: "",
          rows: [[{ text: "data", header: false, rowSpan: 1, colSpan: 999999 }]],
        });
      },
    ]) {
      const v = library();
      mutate(v);
      expect(() => parseBackup(serializeBackup(v))).toThrow();
    }
    expect(() => parseBackup('{"format":"still-library","version":3}')).toThrow();
    expect(() => parseBackup("not json")).toThrow();
    expect(
      parseBackup(serializeBackup({ readings: [], positions: {}, activeId: null, wpm: 250 })),
    ).toEqual({ readings: [], positions: {}, activeId: null, wpm: 250 });
  });
});
