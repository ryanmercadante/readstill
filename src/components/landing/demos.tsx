import { Fragment, useEffect, useState } from "react";
import { cn } from "cn";
import { motion } from "motion/react";

export const PASSAGE =
  "There is a small bookshop on a quiet street, the kind of place you might walk past if you were in a hurry.";
export const WORDS = PASSAGE.split(" ");
/** Each demo rests on this word when it is not playing. */
export const START = WORDS.indexOf("bookshop");

/** Guided pace: steps the highlight through the passage while `playing`, then loops. */
export function useGuidedPlayback(playing: boolean) {
  const [index, setIndex] = useState(START);
  useEffect(() => {
    if (!playing) return;
    // A few empty beats after the last word let the passage rest before it loops.
    const id = setInterval(() => setIndex((i) => (i + 1) % (WORDS.length + 4)), 300);
    return () => clearInterval(id);
  }, [playing]);
  return [index, setIndex] as const;
}

/** Focus pace: one word at a time while `playing`, lingering on punctuation. */
export function useFocusPlayback(playing: boolean) {
  const [index, setIndex] = useState(START);
  useEffect(() => {
    if (!playing) return;
    const word = WORDS[index];
    const last = index === WORDS.length - 1;
    const delay = last ? 1600 : /[.,]$/.test(word) ? 620 : 300;
    const id = setTimeout(() => setIndex((i) => (i + 1) % WORDS.length), delay);
    return () => clearTimeout(id);
  }, [playing, index]);
  return [index, setIndex] as const;
}

/** The passage with a highlight that glides to the word at `index`. */
export function GuidedPassage({
  index,
  still,
  layoutId,
  className,
}: {
  index: number;
  still: boolean;
  layoutId: string;
  className?: string;
}) {
  return (
    <>
      <p className="sr-only">{PASSAGE} The word “bookshop” is highlighted.</p>
      {/* One stacking layer for the whole passage, so the gliding highlight stays
          behind every word, including the one it just left. */}
      <p aria-hidden="true" className={cn("relative isolate m-0 font-serif", className)}>
        {WORDS.map((word, i) => (
          <Fragment key={i}>
            <span
              className={cn(
                "relative transition-colors duration-200",
                i === index && "text-highlight-foreground",
              )}
            >
              {i === index && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-y-0 -right-[3px] -left-[3px] -z-10 rounded-[3px] bg-highlight"
                  transition={
                    still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }
                  }
                />
              )}
              {word}
            </span>{" "}
          </Fragment>
        ))}
      </p>
    </>
  );
}
