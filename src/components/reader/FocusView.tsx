import { Button } from "../ui/button";
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
    <section
      className="pt-[46px] text-center max-[800px]:pt-[30px] max-[520px]:pt-[26px] compact-reader:pt-[18px]"
      aria-label="One word at a time"
    >
      <div
        className="min-h-5 text-[12px] text-muted-foreground max-[520px]:text-[11px]"
        role="status"
      >
        {finished
          ? "A moment to let it settle."
          : playing
            ? "One word at a time."
            : "Find your pace. Take your time."}
      </div>
      <div
        className="focus-stage relative mt-2.5 mb-[17px] flex min-h-[clamp(185px,30vh,320px)] w-full items-center overflow-hidden max-[800px]:min-h-[220px] max-[520px]:mb-2 max-[520px]:min-h-[190px] compact-reader:my-1 compact-reader:min-h-[clamp(96px,20dvh,160px)]"
        ref={focusStageRef}
      >
        <div
          className="absolute top-[23px] left-1/2 h-[19px] w-px bg-[#baa08d] compact-reader:top-[5px] compact-reader:h-3"
          aria-hidden="true"
        />
        <div
          className="relative h-[1.4em] w-full font-serif leading-[1.4]"
          style={{ fontSize: focusSize }}
        >
          <span
            ref={wordRef}
            className="focus-word absolute left-1/2 inline-flex whitespace-pre"
            data-testid="focus-word"
            style={{
              visibility: transitioning ? "hidden" : "visible",
              transform: `translateX(-${focusOffset}px)`,
            }}
          >
            <AnchoredWord word={word} />
          </span>
        </div>
        <div
          className="absolute bottom-[23px] left-1/2 h-[19px] w-px bg-[#baa08d] compact-reader:bottom-[5px] compact-reader:h-3"
          aria-hidden="true"
        />
      </div>
      <p className="m-0 mb-[17px] text-[12px] leading-[1.7] text-muted-foreground max-[520px]:mx-auto max-[520px]:mb-[7px] max-[520px]:max-w-[260px] max-[520px]:text-[11px] compact-reader:hidden">
        {finished
          ? "You reached the end. Reread a sentence, or start again."
          : "Need the bigger picture? Your passage is one click away."}
      </p>
      <Button
        variant="link"
        className="context-button"
        onClick={onReturnToArticle}
        disabled={transitioning}
      >
        <ArrowDownLeft size={17} />
        Back to the passage
      </Button>
    </section>
  );
}
