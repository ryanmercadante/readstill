import { anchorParts } from "../../reader";

export function AnchoredWord({ word }: { word: string }) {
  const parts = anchorParts(word);
  return (
    <>
      <span>{parts.before}</span>
      <span className="anchor-letter">{parts.anchor}</span>
      <span>{parts.after}</span>
    </>
  );
}
