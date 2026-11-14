import { describe, expect, it } from "vitest";
import {
  initialPosition,
  mergeLibrary,
  migrateSnapshot,
  parseBackup,
  readingProgress,
  serializeBackup,
  textReading,
} from "./library";
import type { Library } from "./library";

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
  it("migrates an old snapshot without losing text, pace, or position", () => {
    const result = migrateSnapshot({
      version: 1,
      text: "Some old words.",
      title: "My passage",
      index: 999,
      wpm: 375,
    });
    expect(result.readings[0].title).toBe("My passage");
    expect(result.readings[0].chapters[0].text).toBe("Some old words.");
    expect(result.positions["previous-reading"].index).toBe(2);
    expect(result.wpm).toBe(375);
  });
  it("round trips chapters, illustrations, completion, and the active reading", () => {
    const value = library();
    value.readings[0].chapters.push({
      id: "chapter-two",
      title: "A return",
      text: "Final words.",
      images: [{ beforeParagraph: 1, src: "data:image/png;base64,YQ==", alt: "Illustration" }],
    });
    value.positions.essay = { chapterId: "chapter-two", index: 1, finished: true, updatedAt: 1000 };
    expect(parseBackup(serializeBackup(value))).toEqual(value);
    expect(readingProgress(value.readings[0], value.positions.essay)).toBe(100);
  });
  it("adds restored readings without overwriting newer local progress", () => {
    const current = library();
    const incoming = library();
    incoming.positions.essay.index = 0;
    expect(mergeLibrary(current, incoming)).toEqual(current);
    incoming.readings[0].chapters[0].text = "Different content using the same identifier.";
    const merged = mergeLibrary(current, incoming);
    expect(merged.readings).toHaveLength(2);
    expect(merged.readings[1].id).not.toBe("essay");
    expect(merged.positions.essay.index).toBe(2);
    expect(merged.positions[merged.readings[1].id].index).toBe(0);
    expect(
      mergeLibrary({ readings: [], positions: {}, activeId: null, wpm: 250 }, current),
    ).toEqual(current);
  });
  it("validates positions using the reader's sentence tokenization", () => {
    const value = library();
    value.readings[0].chapters[0].text = "你好。世界。";
    value.positions.essay.index = 1;
    value.positions.essay.finished = true;
    expect(parseBackup(serializeBackup(value))).toEqual(value);
    expect(readingProgress(value.readings[0], value.positions.essay)).toBe(100);
  });
  it("rejects unsafe image sources, incompatible versions, and broken positions", () => {
    for (const mutate of [
      (value: Library) => {
        value.positions.essay.chapterId = "missing";
      },
      (value: Library) => {
        value.positions.essay.index = 10000;
      },
      (value: Library) => {
        value.positions.essay.finished = true;
      },
      (value: Library) => {
        value.readings[0].id = "__proto__";
      },
      (value: Library) => {
        value.readings[0].chapters[0].images.push({
          beforeParagraph: 0,
          src: "https://tracking.invalid/image.png",
          alt: "Image",
        });
      },
    ]) {
      const value = library();
      mutate(value);
      expect(() => parseBackup(serializeBackup(value))).toThrow();
    }
    expect(() => parseBackup('{"format":"still-library","version":2}')).toThrow();
    expect(() => parseBackup("not json")).toThrow();
    expect(
      parseBackup(serializeBackup({ readings: [], positions: {}, activeId: null, wpm: 250 })),
    ).toEqual({ readings: [], positions: {}, activeId: null, wpm: 250 });
  });
});
