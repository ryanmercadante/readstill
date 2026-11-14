import { useEffect } from "react";
import type { RefObject } from "react";
import type { Token } from "../../lib/reader";

type ArticleViewProps = {
  title: string;
  paragraphs: Token[][];
  index: number;
  ready: boolean;
  transitioning: boolean;
  articleRef: RefObject<HTMLElement | null>;
  activeRef: RefObject<HTMLSpanElement | null>;
  onSeek: (index: number) => void;
};

export function ArticleView({
  title,
  paragraphs,
  index,
  ready,
  transitioning,
  articleRef,
  activeRef,
  onSeek,
}: ArticleViewProps) {
  useEffect(() => {
    if (!ready || transitioning) return;
    const word = activeRef.current;
    const rect = word?.getBoundingClientRect();
    if (rect && (rect.top < 20 || rect.bottom > window.innerHeight - 190)) {
      word?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [index, ready, transitioning, activeRef]);

  return (
    <div className="mx-auto max-w-[680px]">
      <p className="mt-[30px] mb-[25px] flex items-center gap-[9px] text-[11px] text-muted-foreground max-[520px]:mt-6 max-[520px]:text-[10px] max-[520px]:leading-[1.5]">
        <span className="size-[5px] shrink-0 rounded-full bg-brand" />
        Tap a word to find your place. Press play to focus.
      </p>
      <article
        ref={articleRef}
        className="font-serif text-[22px] leading-[1.85] font-normal max-[800px]:text-[21px] max-[520px]:text-[20px] [&_[data-word]]:cursor-pointer [&_[data-word]]:rounded-[3px] [&_[data-word]:hover]:bg-[#ebe6dc] [&_[aria-current=location]]:bg-highlight [&_[aria-current=location]]:text-highlight-foreground [&_[aria-current=location]]:shadow-[3px_0_0_var(--tint),-3px_0_0_var(--tint)]"
        tabIndex={0}
        aria-label={title}
        aria-describedby="reading-shortcuts"
        onClick={(event) => {
          if (transitioning || !ready || window.getSelection()?.toString()) return;
          const word = (event.target as HTMLElement).closest<HTMLElement>("[data-word]");
          if (word) onSeek(Number(word.dataset.word));
        }}
      >
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="m-0 mb-[25px] whitespace-pre-wrap wrap-anywhere">
            {paragraph.map((token) => (
              <span key={token.index}>
                <span
                  data-word={token.index}
                  ref={token.index === index ? activeRef : null}
                  aria-current={token.index === index ? "location" : undefined}
                  style={
                    transitioning && token.index === index ? { visibility: "hidden" } : undefined
                  }
                >
                  {token.text}
                </span>
                {token.following}
              </span>
            ))}
          </p>
        ))}
      </article>
      <div className="mt-[54px] flex items-center justify-center gap-[18px] font-serif text-[15px] text-muted-foreground italic">
        <span className="h-px w-7.5 bg-[#c8c2b6]" />A little space to take it in.
        <span className="h-px w-7.5 bg-[#c8c2b6]" />
      </div>
    </div>
  );
}
