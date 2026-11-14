import { useEffect, useMemo } from "react";
import type { RefObject } from "react";
import type { Chapter } from "../../lib/library";
import type { ReadingEntry } from "../../lib/reader-document";
import { blockLabel } from "../../lib/reader-document";
import { Button } from "../ui/button";

type Props = {
  title: string;
  chapter: Chapter;
  entries: ReadingEntry[];
  index: number;
  ready: boolean;
  transitioning: boolean;
  articleRef: RefObject<HTMLElement | null>;
  activeRef: RefObject<HTMLSpanElement | null>;
  onSeek: (index: number) => void;
  onContinue: (blockId: string) => void;
  onDownloadOriginal?: () => void;
};
export function ArticleView({
  title,
  chapter,
  entries,
  index,
  ready,
  transitioning,
  articleRef,
  activeRef,
  onSeek,
  onContinue,
  onDownloadOriginal,
}: Props) {
  const byBlock = useMemo(() => {
    const map = new Map<string, ReadingEntry[]>();
    for (const entry of entries) {
      const group = map.get(entry.blockId) ?? [];
      group.push(entry);
      map.set(entry.blockId, group);
    }
    return map;
  }, [entries]);
  useEffect(() => {
    if (!ready || transitioning) return;
    const word = activeRef.current;
    const rect = word?.getBoundingClientRect();
    if (rect && (rect.top < 20 || rect.bottom > window.innerHeight - 190))
      word?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [index, chapter.id, ready, transitioning, activeRef]);
  return (
    <div className="mx-auto max-w-[680px]">
      <p className="mt-[30px] mb-[25px] flex items-center gap-[9px] text-[11px] text-muted-foreground max-[520px]:mt-6 max-[520px]:text-[10px] max-[520px]:leading-[1.5]">
        <span className="size-[5px] shrink-0 rounded-full bg-brand" />
        Tap a word to find your place. Press play to focus.
      </p>
      <article
        ref={articleRef}
        className="font-serif text-[22px] leading-[1.85] font-normal max-[800px]:text-[21px] max-[520px]:text-[20px] [&_[data-word]]:cursor-pointer [&_[data-word]]:rounded-[3px] [&_[data-word]:hover]:bg-word-hover [&_[aria-current=location]]:bg-highlight [&_[aria-current=location]]:text-highlight-foreground [&_[aria-current=location]]:shadow-[3px_0_0_var(--tint),-3px_0_0_var(--tint)]"
        tabIndex={0}
        aria-label={title}
        aria-describedby="reading-shortcuts"
        onClick={(event) => {
          if (transitioning || !ready || window.getSelection()?.toString()) return;
          const word = (event.target as HTMLElement).closest<HTMLElement>("[data-word]");
          if (word) onSeek(Number(word.dataset.word));
        }}
      >
        {chapter.blocks.map((block) => {
          const tokens = byBlock.get(block.id)!;
          if (block.type === "text")
            return (
              <p key={block.id} className="m-0 mb-[25px] whitespace-pre-wrap wrap-anywhere">
                {tokens.map((token) => (
                  <span key={token.index}>
                    <span
                      data-word={token.index}
                      ref={token.index === index ? activeRef : null}
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
            );
          const active = tokens[0].index === index;
          const name =
            block.type === "table" ? "table" : block.type === "image" ? "illustration" : "section";
          return (
            <figure
              key={block.id}
              data-context-id={block.id}
              className="mx-0 my-9 min-w-0 border-y border-border py-6"
            >
              <figcaption className="mb-4 font-sans text-sm leading-relaxed text-muted-foreground wrap-anywhere">
                <span
                  ref={active ? activeRef : null}
                  tabIndex={-1}
                  aria-current={active ? "location" : undefined}
                  className={active ? "text-brand" : undefined}
                >
                  {blockLabel(block)}
                </span>
              </figcaption>
              {block.type === "image" ? (
                <img
                  src={block.src}
                  alt={block.alt}
                  className="mx-auto block max-h-[70vh] max-w-full object-contain"
                  loading="lazy"
                />
              ) : block.type === "table" ? (
                <div
                  className="max-w-full overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-ring"
                  role="region"
                  aria-label={block.caption || "Table"}
                  tabIndex={0}
                >
                  <table className="w-full border-collapse text-left text-base leading-relaxed">
                    <caption className="sr-only">{block.caption || "Table"}</caption>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => {
                            const Cell = cell.header ? "th" : "td";
                            return (
                              <Cell
                                key={c}
                                scope={cell.header ? cell.scope : undefined}
                                rowSpan={cell.rowSpan}
                                colSpan={cell.colSpan}
                                className="border border-border px-3 py-2 align-top whitespace-pre-wrap"
                              >
                                {cell.text}
                              </Cell>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="my-0 font-sans text-sm leading-relaxed text-muted-foreground wrap-anywhere">
                  {block.reason}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-sans">
                <Button
                  variant="text"
                  disabled={!ready || transitioning}
                  onClick={() => onContinue(block.id)}
                >
                  Continue after {name}
                </Button>
                {block.type === "unsupported" && onDownloadOriginal && (
                  <Button variant="text" onClick={onDownloadOriginal}>
                    Download original EPUB
                  </Button>
                )}
              </div>
            </figure>
          );
        })}
      </article>
      <div className="mt-[54px] flex items-center justify-center gap-[18px] font-serif text-[15px] text-muted-foreground italic">
        <span className="h-px w-7.5 bg-divider" />A little space to take it in.
        <span className="h-px w-7.5 bg-divider" />
      </div>
    </div>
  );
}
