import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useReader } from "../hooks/useReader";
import { SkipLink } from "../components/SkipLink";
import { ReaderHeader } from "../components/reader/ReaderHeader";
import { LibraryPanel } from "../components/reader/LibraryPanel";
import { PasteTextDialog } from "../components/reader/PasteTextDialog";
import { AboutReaderDialog } from "../components/reader/AboutReaderDialog";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "Library — Still" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const reader = useReader();
  const navigate = Route.useNavigate();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const pasteRef = useRef<HTMLButtonElement>(null);

  const showReading = (id: string) => {
    reader.openReading(id);
    void navigate({ to: "/reader" });
  };
  const importText = (text: string, title: string) => {
    reader.replace(text, title);
    void navigate({ to: "/reader" });
  };

  return (
    <>
      <SkipLink href="#library">Skip to library</SkipLink>
      <ReaderHeader
        disabled={!reader.ready || importing}
        onPaste={() => setPasteOpen(true)}
        onAbout={() => setAboutOpen(true)}
        pasteRef={pasteRef}
      />
      <LibraryPanel
        library={reader.library}
        ready={reader.ready}
        saving={reader.saving}
        storageError={reader.storageError}
        onOpen={showReading}
        onAdd={reader.addReading}
        onRemove={reader.removeReading}
        onRestore={reader.restore}
        onBusyChange={setImporting}
      />
      <PasteTextDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        returnFocusRef={pasteRef}
        onImport={importText}
      />
      <AboutReaderDialog open={aboutOpen} onOpenChange={setAboutOpen} returnFocusRef={pasteRef} />
    </>
  );
}
