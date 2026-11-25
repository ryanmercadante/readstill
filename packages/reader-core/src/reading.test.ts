import { describe, expect, it } from "vitest";
import {
  initialPosition,
  proseBlocks,
  readingProgress,
  textReading,
  validPosition,
  type Position,
  type Reading,
} from "./index";

describe("pasted passages", () => {
  it("splits paragraphs on blank lines with stable block ids", () => {
    expect(proseBlocks("\n First line.\nSame paragraph.\n\n  \n\nSecond.\n")).toEqual([
      { id: "p0", type: "text", text: "First line.\nSame paragraph." },
      { id: "p1", type: "text", text: "Second." },
    ]);
  });

  it("uses the given id, trims the title, and names untitled passages", () => {
    const reading = textReading("One two.", "  An essay  ", "essay");
    expect(reading).toMatchObject({ id: "essay", title: "An essay", kind: "text", author: "" });
    expect(reading.chapters).toEqual([
      { id: "text", title: "Passage", blocks: [{ id: "p0", type: "text", text: "One two." }] },
    ]);
    expect(textReading("One two.", "   ", "untitled").title).toBe("Untitled reading");
    expect(textReading("One two.", "x".repeat(150), "long").title).toHaveLength(100);
  });

  it("rejects empty and oversized passages", () => {
    expect(() => textReading("  \n ", "Empty", "empty")).toThrow("1–100,000 characters");
    expect(() => textReading("x".repeat(100_001), "Huge", "huge")).toThrow("1–100,000 characters");
  });
});

describe("reading positions", () => {
  const reading: Reading = textReading("One two three.\n\nFour five.", "Essay", "essay");
  const at = (blockId: string, index: number, finished = false): Position => ({
    chapterId: "text",
    blockId,
    index,
    finished,
    updatedAt: 1,
  });

  it("starts at the first word, unfinished", () => {
    expect(initialPosition(reading)).toEqual({ ...at("p0", 0), updatedAt: 0 });
  });

  it("accepts checkpoints that point at a word in the reading", () => {
    expect(validPosition(at("p0", 0), reading)).toBe(true);
    expect(validPosition(at("p1", 1), reading)).toBe(true);
    expect(validPosition(at("p1", 1, true), reading)).toBe(true);
  });

  it("rejects checkpoints that no longer match the reading", () => {
    expect(validPosition(at("p2", 0), reading)).toBe(false);
    expect(validPosition({ ...at("p0", 0), chapterId: "other" }, reading)).toBe(false);
    expect(validPosition(at("p0", 0, true), reading)).toBe(false);
    expect(validPosition({ ...at("p0", 0), index: -1 }, reading)).toBe(false);
    expect(validPosition({ ...at("p0", 0), updatedAt: Number.NaN }, reading)).toBe(false);
    expect(validPosition({ ...at("p0", 0), blockId: "__proto__" }, reading)).toBe(false);
    expect(validPosition(null, reading)).toBe(false);
  });

  it("reports whole-percent progress and 100 once finished", () => {
    expect(readingProgress(reading, at("p0", 0))).toBe(0);
    expect(readingProgress(reading, at("p1", 0))).toBe(60);
    expect(readingProgress(reading, at("p1", 1))).toBe(80);
    expect(readingProgress(reading, at("p1", 1, true))).toBe(100);
  });
});
