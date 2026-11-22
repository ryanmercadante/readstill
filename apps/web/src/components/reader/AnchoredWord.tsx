import { anchorParts } from "../../lib/reader";

export function AnchoredWord({ word }: { word: string }) {
  const parts = anchorParts(word);
  return (
    <>
      <span>{parts.before}</span>
      <span className="anchor-letter text-brand">{parts.anchor}</span>
      <span>{parts.after}</span>
    </>
  );
}
