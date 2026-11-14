import { AlignLeft, Focus } from "lucide-react";

export type ReaderView = "article" | "focus";

type ReadingHeadingProps = {
  title: string;
  sourceIsSample: boolean;
  wordCount: number;
  view: ReaderView;
  disabled: boolean;
  onViewChange: (view: ReaderView) => void;
};

export function ReadingHeading({
  title,
  sourceIsSample,
  wordCount,
  view,
  disabled,
  onViewChange,
}: ReadingHeadingProps) {
  return (
    <section className="reading-heading" aria-label="Reading details">
      <div className="document-heading">
        <h1>{title}</h1>
        <p>
          {sourceIsSample ? "An original sample" : "Your reading"}
          <span aria-hidden="true">·</span>
          {wordCount.toLocaleString()} words
        </p>
      </div>
      <div className="view-switch" role="group" aria-label="Reading view">
        <button
          aria-pressed={view === "article"}
          disabled={disabled}
          onClick={() => onViewChange("article")}
        >
          <AlignLeft size={16} />
          Article
        </button>
        <button
          aria-pressed={view === "focus"}
          disabled={disabled}
          onClick={() => onViewChange("focus")}
        >
          <Focus size={16} />
          Focus
        </button>
      </div>
    </section>
  );
}
