import { describe, expect, it } from "vitest";
import { anchorParts, tokenize, wordDuration } from "./reader";

describe("document positions", () => {
  it("keeps one index across paragraphs and meaningful sentence replay locations", () => {
    const paragraphs = tokenize("First sentence. Next one!\n\nA new paragraph.");
    expect(paragraphs.map((p) => p.map((t) => t.index))).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6],
    ]);
    expect(paragraphs.flat().map((t) => t.sentenceStart)).toEqual([0, 0, 2, 2, 4, 4, 4]);
    expect(paragraphs[0].at(-1)?.endsParagraph).toBe(true);
  });
  it("retains punctuation, quotes, whitespace, and complete source words", () => {
    const source = "“Wait,”  she said. Then—quietly—she left.";
    expect(
      tokenize(source)
        .flat()
        .map((t) => t.text + t.following)
        .join(""),
    ).toBe(source);
    expect(tokenize(" \n\n ")).toEqual([]);
  });
});

describe("focus and timing", () => {
  it("anchors within the letters while retaining punctuation and graphemes", () => {
    for (const word of ["“Reading,”", "a", "cafe\u0301", "👩‍🔬", "—"]) {
      const parts = anchorParts(word);
      expect(parts.before + parts.anchor + parts.after).toBe(word);
    }
    expect(anchorParts("“Reading,”").anchor).toBe("e");
  });
  it("provides sentence and paragraph time without compounding pauses", () => {
    const words = tokenize("Hello, world. Another sentence.").flat();
    expect(wordDuration(words[0], 300)).toBe(260);
    expect(wordDuration(words[1], 300)).toBe(360);
    expect(wordDuration(words[3], 300)).toBe(480);
  });
});
