export const MIN_WPM = 100;
export const MAX_WPM = 700;
export const MAX_TEXT_LENGTH = 100_000;

export type Token = {
  text: string;
  following: string;
  index: number;
  paragraph: number;
  sentenceStart: number;
  endsSentence: boolean;
  endsParagraph: boolean;
};

export function tokenize(text: string): Token[][] {
  let index = 0;
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph, paragraphIndex) => {
      const words: Token[] = [];
      for (const sentence of segmenter.segment(paragraph)) {
        const matches = [...sentence.segment.matchAll(/\S+/gu)];
        const sentenceStart = index;
        matches.forEach((match, i) => {
          const end = match.index + match[0].length;
          const nextStart = matches[i + 1]?.index ?? sentence.segment.length;
          words.push({
            text: match[0],
            following: sentence.segment.slice(end, nextStart),
            index: index++,
            paragraph: paragraphIndex,
            sentenceStart,
            endsSentence: i === matches.length - 1,
            endsParagraph: false,
          });
        });
      }
      if (words.length) words[words.length - 1].endsParagraph = true;
      return words;
    })
    .filter((words) => words.length > 0);
}

export function anchorParts(word: string) {
  const letters = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(word)].map(
    (x) => x.segment,
  );
  const positions = letters.flatMap((letter, i) => (/[\p{L}\p{N}]/u.test(letter) ? [i] : []));
  // A visual anchoring heuristic, not a scientifically validated recognition point.
  const offset = Math.min(positions.length - 1, Math.floor(positions.length / 4));
  const anchor = positions[Math.max(0, offset)] ?? 0;
  return {
    before: letters.slice(0, anchor).join(""),
    anchor: letters[anchor] ?? "",
    after: letters.slice(anchor + 1).join(""),
  };
}

export function wordDuration(token: Token, wpm: number) {
  const base = 60_000 / wpm;
  // These modest pauses are product defaults to evaluate, not a research-derived formula.
  if (token.endsParagraph) return base * 2.4;
  if (token.endsSentence) return base * 1.8;
  if (/[,;:][”’"')\]]*$/u.test(token.text)) return base * 1.3;
  return base;
}
