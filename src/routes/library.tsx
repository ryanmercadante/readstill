import { createFileRoute } from "@tanstack/react-router";
import { useReader } from "../hooks/useReader";
import { SkipLink } from "../components/SkipLink";
import { SiteHeader } from "../components/SiteHeader";
import { LibraryPanel } from "../components/reader/LibraryPanel";
import { pageHead } from "../lib/page-head";
import type { Reading } from "../lib/library";

export const Route = createFileRoute("/library")({
  head: () =>
    pageHead({
      path: "/library",
      title: "Library | Still",
      description:
        "Your saved readings, EPUB imports, and backups. Everything stays in this browser.",
      // Crawlers only ever see an empty library.
      noindex: true,
    }),
  component: LibraryPage,
});

function LibraryPage() {
  const reader = useReader();
  const navigate = Route.useNavigate();

  const showReading = (id: string) => {
    reader.openReading(id);
    void navigate({ to: "/reader" });
  };
  const importText = (text: string, title: string) => {
    reader.replace(text, title);
    void navigate({ to: "/reader" });
  };
  const importLink = (reading: Reading) => {
    reader.addReading(reading);
    void navigate({ to: "/reader" });
  };

  return (
    <>
      <SkipLink href="#library">Skip to library</SkipLink>
      <SiteHeader />
      <LibraryPanel
        library={reader.library}
        ready={reader.ready}
        saving={reader.saving}
        storageError={reader.storageError}
        onOpen={showReading}
        onAdd={reader.addReading}
        onRemove={reader.removeReading}
        onRestore={reader.restore}
        onPaste={importText}
        onLink={importLink}
      />
    </>
  );
}
