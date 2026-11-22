import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { AlignLeft, ArrowUpRight, Focus, Highlighter } from "lucide-react";

import type { ReaderView } from "../../lib/reader-presentation";
import { ReadingFontMenu } from "../ReadingFontMenu";

type ReadingHeadingProps = {
  title: string;
  sourceIsSample: boolean;
  /** The page a web reading came from. */
  source?: { url: string; siteName: string };
  wordCount: number;
  view: ReaderView;
  disabled: boolean;
  onViewChange: (view: ReaderView) => void;
  /** Called when the font menu opens, so playback and transitions can stop. */
  onFontMenuOpen?: () => void;
};

export function ReadingHeading({
  title,
  sourceIsSample,
  source,
  wordCount,
  view,
  disabled,
  onViewChange,
  onFontMenuOpen,
}: ReadingHeadingProps) {
  return (
    <section
      className="flex items-start justify-between gap-6 border-0 border-b border-solid border-border pb-[29px] max-[800px]:flex-col max-[800px]:gap-[21px] max-[800px]:pb-[22px] max-[520px]:gap-[19px] compact-reader:group-data-[view=focus]/reader:gap-3 compact-reader:group-data-[view=focus]/reader:pb-3"
      aria-label="Reading details"
    >
      <div className="min-w-0 compact-reader:group-data-[view=focus]/reader:w-full">
        <h1 className="font-reading compact-reader:group-data-[view=focus]/reader:mb-0 compact-reader:group-data-[view=focus]/reader:truncate compact-reader:group-data-[view=focus]/reader:text-[22px]">
          {title}
        </h1>
        <p className="m-0 flex gap-2.5 text-[11px] text-muted-foreground max-[520px]:text-[10px] compact-reader:group-data-[view=focus]/reader:hidden">
          {sourceIsSample ? "An original sample" : "Your reading"}
          <span aria-hidden="true">·</span>
          {source && (
            <>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-0.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <span className="truncate">{source.siteName}</span>
                <ArrowUpRight size={11} aria-hidden="true" />
                <span className="sr-only">(original page, opens in a new tab)</span>
              </a>
              <span aria-hidden="true">·</span>
            </>
          )}
          {wordCount.toLocaleString()} words
        </p>
      </div>
      <div className="mt-1 flex shrink-0 items-center gap-2 max-[800px]:m-0 max-[800px]:self-start max-[520px]:w-full">
        <ToggleGroup
          className="view-switch shrink-0 rounded-[8px] bg-secondary p-1 max-[520px]:min-w-0 max-[520px]:flex-1"
          aria-label="Reading view"
          spacing={0}
          multiple={false}
          value={[view]}
          disabled={disabled}
          onValueChange={(values) => {
            const next = values[0];
            if (next === "article" || next === "guided" || next === "focus") onViewChange(next);
          }}
        >
          <ToggleGroupItem
            className="max-[520px]:min-h-[38px] max-[520px]:flex-1 max-[520px]:justify-center max-[520px]:px-2"
            value="article"
            disabled={disabled}
          >
            <AlignLeft size={16} />
            Article
          </ToggleGroupItem>
          <ToggleGroupItem
            className="max-[520px]:min-h-[38px] max-[520px]:flex-1 max-[520px]:justify-center max-[520px]:px-2"
            value="guided"
            disabled={disabled}
          >
            <Highlighter size={16} />
            Guided
          </ToggleGroupItem>
          <ToggleGroupItem
            className="max-[520px]:min-h-[38px] max-[520px]:flex-1 max-[520px]:justify-center max-[520px]:px-2"
            value="focus"
            disabled={disabled}
          >
            <Focus size={16} />
            Focus
          </ToggleGroupItem>
        </ToggleGroup>
        <ReadingFontMenu onOpen={onFontMenuOpen} />
      </div>
    </section>
  );
}
