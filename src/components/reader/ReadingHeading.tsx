import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
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
      <ToggleGroup
        className="view-switch"
        aria-label="Reading view"
        spacing={0}
        multiple={false}
        value={[view]}
        disabled={disabled}
        onValueChange={(values) => {
          const next = values[0];
          if (next === "article" || next === "focus") onViewChange(next);
        }}
      >
        <ToggleGroupItem value="article" disabled={disabled}>
          <AlignLeft size={16} />
          Article
        </ToggleGroupItem>
        <ToggleGroupItem value="focus" disabled={disabled}>
          <Focus size={16} />
          Focus
        </ToggleGroupItem>
      </ToggleGroup>
    </section>
  );
}
