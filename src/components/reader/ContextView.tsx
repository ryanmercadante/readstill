import { Button } from "../ui/button";
import { blockLabel } from "../../lib/reader-document";
import type { ContextBlock } from "../../lib/reader-document";
import type { RefObject } from "react";

type Props = {
  block: ContextBlock;
  finished: boolean;
  onView: () => void;
  onContinue: () => void;
  onRestart: () => void;
  onNextChapter?: () => void;
  actionRef: RefObject<HTMLButtonElement | null>;
};
export function ContextView({
  block,
  finished,
  onView,
  onContinue,
  onRestart,
  onNextChapter,
  actionRef,
}: Props) {
  const name =
    block.type === "table" ? "table" : block.type === "image" ? "illustration" : "section";
  return (
    <section
      aria-label="Reading paused for context"
      className="mx-auto max-w-xl py-10 text-center compact-reader:py-3"
    >
      <p role="status" className="text-sm text-muted-foreground">
        {finished ? "You reached the end of this chapter." : `Reading paused for this ${name}.`}
      </p>
      <h2 className="my-5 font-reading text-2xl leading-snug font-normal wrap-anywhere compact-reader:my-3">
        {blockLabel(block)}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground wrap-anywhere compact-reader:my-2 compact-reader:text-xs">
        {block.type === "unsupported"
          ? block.reason
          : "Take a moment with the whole picture, then continue where the prose picks up."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 compact-reader:mt-3">
        <Button variant="outline" onClick={onView}>
          View {name}
        </Button>
        {finished ? (
          <Button ref={actionRef} onClick={onNextChapter ?? onRestart}>
            {onNextChapter ? "Next chapter" : "Read again"}
          </Button>
        ) : (
          <Button ref={actionRef} onClick={onContinue}>
            Continue after {name}
          </Button>
        )}
      </div>
    </section>
  );
}
