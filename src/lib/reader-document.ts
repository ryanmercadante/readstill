import { tokenize } from "./reader";
import type { Token } from "./reader";
import type { Chapter, ContentBlock, Position } from "./library";

export type ContextBlock = Exclude<ContentBlock, { type: "text" }>;
export type ReadingEntry = Token & { blockId: string; offset: number; context?: ContextBlock };
const sequences = new WeakMap<Chapter, ReadingEntry[]>();

export function blockLabel(block: ContextBlock): string {
  return block.type === "table"
    ? block.caption || "Table"
    : block.type === "image"
      ? block.alt || "Illustration"
      : block.label;
}

/** Text words and explicit context stops share one ordered playback sequence. */
export function chapterSequence(chapter: Chapter): ReadingEntry[] {
  const cached = sequences.get(chapter);
  if (cached) return cached;
  const entries: ReadingEntry[] = [];
  chapter.blocks.forEach((block, paragraph) => {
    const start = entries.length;
    if (block.type === "text") {
      for (const token of tokenize(block.text).flat())
        entries.push({
          ...token,
          index: start + token.index,
          sentenceStart: start + token.sentenceStart,
          paragraph,
          blockId: block.id,
          offset: token.index,
        });
    } else
      entries.push({
        text: blockLabel(block),
        following: "",
        index: start,
        paragraph,
        sentenceStart: start,
        endsSentence: true,
        endsParagraph: true,
        blockId: block.id,
        offset: 0,
        context: block,
      });
  });
  sequences.set(chapter, entries);
  return entries;
}

export function sequenceIndex(chapter: Chapter, position: Position): number {
  return chapterSequence(chapter).findIndex(
    (entry) => entry.blockId === position.blockId && entry.offset === position.index,
  );
}

export function positionAt(
  chapter: Chapter,
  index: number,
  finished = false,
  updatedAt = Date.now(),
): Position {
  const entries = chapterSequence(chapter);
  const entry = entries[Math.max(0, Math.min(index, entries.length - 1))];
  return {
    chapterId: chapter.id,
    blockId: entry.blockId,
    index: entry.offset,
    finished,
    updatedAt,
  };
}

export function chapterText(chapter: Chapter): string {
  return chapter.blocks
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n\n");
}
