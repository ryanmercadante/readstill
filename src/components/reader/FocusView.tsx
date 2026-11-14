import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ArrowDownLeft } from "lucide-react";
import { AnchoredWord } from "./AnchoredWord";

type FocusViewProps = {
  word: string;
  playing: boolean;
  finished: boolean;
  transitioning: boolean;
  wordRef: RefObject<HTMLSpanElement | null>;
  onReturnToArticle: () => void;
};

export function FocusView({
  word,
  playing,
  finished,
  transitioning,
  wordRef,
  onReturnToArticle,
}: FocusViewProps) {
  const [focusSize, setFocusSize] = useState(76);
  const [focusOffset, setFocusOffset] = useState(0);
  const focusStageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = focusStageRef.current;
      const word = wordRef.current;
      if (!stage || !word) return;
      const viewportWidth = stage.clientWidth;
      const base = viewportWidth < 600 ? 52 : 76;
      const parts = word.children;
      const left =
        (parts[0]?.getBoundingClientRect().width ?? 0) +
        (parts[1]?.getBoundingClientRect().width ?? 0) / 2;
      const right =
        (parts[2]?.getBoundingClientRect().width ?? 0) +
        (parts[1]?.getBoundingClientRect().width ?? 0) / 2;
      const currentSize = parseFloat(getComputedStyle(word).fontSize);
      const ideal = Math.min(
        base,
        currentSize * ((viewportWidth / 2 - 20) / Math.max(left, right, 1)),
      );
      setFocusSize(Math.max(8, Math.floor(ideal)));
      setFocusOffset(left);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [word, focusSize, wordRef]);

  return (
    <section className="focus-area" aria-label="One word at a time">
      <div className="focus-status" role="status">
        {finished
          ? "A moment to let it settle."
          : playing
            ? "One word at a time."
            : "Find your pace. Take your time."}
      </div>
      <div className="focus-stage" ref={focusStageRef}>
        <div className="focus-guide top-guide" aria-hidden="true" />
        <div className="focus-line" style={{ fontSize: focusSize }}>
          <span
            ref={wordRef}
            className="focus-word"
            data-testid="focus-word"
            style={{
              visibility: transitioning ? "hidden" : "visible",
              transform: `translateX(-${focusOffset}px)`,
            }}
          >
            <AnchoredWord word={word} />
          </span>
        </div>
        <div className="focus-guide bottom-guide" aria-hidden="true" />
      </div>
      <p className="focus-context">
        {finished
          ? "You reached the end. Reread a sentence, or start again."
          : "Need the bigger picture? Your passage is one click away."}
      </p>
      <button className="context-button" onClick={onReturnToArticle} disabled={transitioning}>
        <ArrowDownLeft size={17} />
        Back to the passage
      </button>
    </section>
  );
}
