import { useEffect } from "react";
import type { RefObject } from "react";
import type { Token } from "../../reader";

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
    <div className="article-area">
      <p className="reading-hint">
        <span className="hint-dot" />
        Tap a word to find your place. Press play to focus.
      </p>
      <article
        ref={articleRef}
        className="article-text"
        tabIndex={0}
        aria-label={title}
        aria-describedby="reading-shortcuts"
        onClick={(event) => {
          if (transitioning || !ready || window.getSelection()?.toString())
            return;
          const word = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-word]",
          );
          if (word) onSeek(Number(word.dataset.word));
        }}
      >
        {paragraphs.map((paragraph, i) => (
          <p key={i}>
            {paragraph.map((token) => (
              <span key={token.index}>
                <span
                  data-word={token.index}
                  ref={token.index === index ? activeRef : null}
                  className={token.index === index ? "current-word" : undefined}
                  aria-current={token.index === index ? "location" : undefined}
                  style={
                    transitioning && token.index === index
                      ? { visibility: "hidden" }
                      : undefined
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
      <div className="article-end">
        <span />A little space to take it in.
        <span />
      </div>
    </div>
  );
}
