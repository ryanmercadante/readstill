import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { MousePointer2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { anchorParts } from "../../lib/reader";
import { GuidedPassage, PASSAGE, START, WORDS, useFocusPlayback, useGuidedPlayback } from "./demos";

/**
 * The three modes side by side, used above 800px and before the page hydrates.
 * Guided and Focus play while the pointer rests on them and return to “bookshop”
 * when it leaves.
 */
export function ModesFigure() {
  return (
    <figure
      className="m-0 mt-10 grid grid-cols-3 border-0 border-t border-solid border-border max-[900px]:grid-cols-1 max-[600px]:mt-7"
      aria-label="A preview of the Article, Guided, and Focus reading modes"
    >
      <ModeCard
        className="py-5 pr-7 max-[900px]:pr-0"
        title="Article"
        description="Read freely, with the whole passage in view."
      >
        <p className="m-0 font-serif text-[21px] leading-[1.7]">{PASSAGE}</p>
      </ModeCard>
      <GuidedCard />
      <FocusCard />
      <figcaption className="col-span-full border-0 border-t border-solid border-border pt-4 text-[12px] text-muted-foreground">
        Three ways to read. Switch modes without losing your place.
      </figcaption>
    </figure>
  );
}

function ModeCard({
  className,
  title,
  description,
  hover,
  children,
}: {
  className: string;
  title: string;
  description: string;
  hover?: HoverPlayback;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      onPointerEnter={() => hover?.onHoverChange(true)}
      onPointerLeave={() => hover?.onHoverChange(false)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="m-0 font-sans text-[13px] font-semibold tracking-normal">{title}</h2>
        {/* Only where hovering is possible and something will play. Hidden with CSS,
            not React, so the server and first client render match. */}
        {hover && (
          <span
            aria-hidden="true"
            className={cn(
              "flex items-center gap-1.5 text-[11px] text-muted-foreground transition-opacity duration-300 motion-reduce:hidden [@media(hover:none)]:hidden",
              hover.hovered && "opacity-0",
            )}
          >
            <MousePointer2 size={12} />
            Hover me
          </span>
        )}
      </div>
      <p className="m-0 mt-2 text-[12px] leading-[1.7] text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Plays while hovered, and rewinds to the resting word when the pointer leaves. */
function useHoverPlayback(usePlayback: typeof useGuidedPlayback) {
  const still = !!useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [index, setIndex] = usePlayback(hovered && !still);
  const onHoverChange = (next: boolean) => {
    setHovered(next);
    if (!next) setIndex(START);
  };
  return { index, still, hovered, onHoverChange };
}

type HoverPlayback = ReturnType<typeof useHoverPlayback>;

function GuidedCard() {
  const hover = useHoverPlayback(useGuidedPlayback);
  return (
    <ModeCard
      className="border-0 border-l border-solid border-border px-7 py-5 max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:px-0"
      title="Guided"
      description="Follow a paced highlight through the passage."
      hover={hover}
    >
      <GuidedPassage
        index={hover.index}
        still={hover.still}
        layoutId="guided-card-highlight"
        className="text-[21px] leading-[1.7]"
      />
    </ModeCard>
  );
}

function FocusCard() {
  const hover = useHoverPlayback(useFocusPlayback);
  const parts = anchorParts(WORDS[hover.index]);
  return (
    <ModeCard
      className="border-0 border-l border-solid border-border py-5 pl-7 max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:pl-0"
      title="Focus"
      description="Read one word at a time, at a pace you choose."
      hover={hover}
    >
      <div className="relative flex min-h-[124px] items-center before:absolute before:top-3 before:left-1/2 before:h-[15px] before:w-px before:bg-brand before:content-[''] after:absolute after:bottom-3 after:left-1/2 after:h-[15px] after:w-px after:bg-brand after:content-['']">
        <span className="sr-only">bookshop</span>
        <span
          aria-hidden="true"
          className="grid w-full grid-cols-[1fr_auto_1fr] font-serif text-[44px]"
        >
          <span className="text-right">{parts.before}</span>
          <span className="text-brand">{parts.anchor}</span>
          <span>{parts.after}</span>
        </span>
      </div>
    </ModeCard>
  );
}
