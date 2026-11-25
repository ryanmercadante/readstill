import { Button } from "../ui/button";
import { type Reading } from "@still/reader-core";

export function ImportNotes({ reading }: { reading: Reading }) {
  if (!reading.importIssues?.length) return null;
  return (
    <details className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground wrap-anywhere">
      <summary className="cursor-pointer py-2 text-foreground">
        Import notes ({reading.importIssues.length})
      </summary>
      <ul className="mt-2 max-h-64 overflow-y-auto pl-5">
        {reading.importIssues.map((issue, i) => (
          <li key={i} className="mb-3">
            <span className="font-semibold">
              {reading.chapters.find((chapter) => chapter.id === issue.chapterId)?.title}:{" "}
            </span>
            {issue.message}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function ImportReport({
  reading,
  onAccept,
  onCancel,
}: {
  reading: Reading;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const blocks = reading.chapters.flatMap((c) => c.blocks);
  const tables = blocks.filter((b) => b.type === "table").length;
  const illustrations = blocks.filter((b) => b.type === "image").length;
  const unavailable = blocks.filter((b) => b.type === "unsupported").length;
  return (
    <section aria-label="EPUB import review" className="my-8 border-y border-border py-7">
      <h2 className="m-0 font-serif text-2xl font-normal wrap-anywhere">{reading.title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {reading.chapters.length} chapters · {tables} {tables === 1 ? "table" : "tables"} ·{" "}
        {illustrations} {illustrations === 1 ? "illustration" : "illustrations"}
      </p>
      <p className="text-sm leading-relaxed">
        {unavailable
          ? `${unavailable} ${unavailable === 1 ? "section can't" : "sections can't"} be displayed in Still. Their places will be marked, and the original EPUB will be kept for download.`
          : "Your book is ready. The original EPUB will also be kept for download."}
      </p>
      {(tables > 0 || illustrations > 0) && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Focus mode pauses at tables and illustrations so you can view them in context before
          continuing.
        </p>
      )}
      <ImportNotes reading={reading} />
      <div className="mt-5 flex flex-wrap gap-4">
        <Button onClick={onAccept}>
          {reading.importIssues?.length ? "Import with notes" : "Add to library"}
        </Button>
        <Button variant="text" onClick={onCancel}>
          Cancel import
        </Button>
      </div>
    </section>
  );
}
