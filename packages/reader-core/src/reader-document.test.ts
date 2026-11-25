import { expect, it } from "vitest";
import { chapterSequence, positionAt, sequenceIndex, type Chapter } from "./index";

it("restores the same word or context stop from a saved block and offset", () => {
  const chapter: Chapter = {
    id: "chapter",
    title: "A walk",
    blocks: [
      { id: "opening", type: "text", text: "We stopped." },
      { id: "map", type: "image", src: "map.png", alt: "Trail map" },
      { id: "ending", type: "text", text: "Then continued." },
    ],
  };
  const reopened: Chapter = JSON.parse(JSON.stringify(chapter));
  expect(chapterSequence(chapter).map((entry) => entry.text)).toEqual([
    "We",
    "stopped.",
    "Trail map",
    "Then",
    "continued.",
  ]);
  for (const [index, blockId, offset] of [
    [1, "opening", 1],
    [2, "map", 0],
    [4, "ending", 1],
  ] as const) {
    const checkpoint = positionAt(chapter, index, index === 4, 1000);
    expect(checkpoint).toEqual({
      chapterId: "chapter",
      blockId,
      index: offset,
      finished: index === 4,
      updatedAt: 1000,
    });
    expect(sequenceIndex(reopened, checkpoint)).toBe(index);
  }
});
