import { useRef, useState } from "react";
import { ArrowRight, BookOpen, Download, Link2, Plus, Upload, X } from "lucide-react";
import { Button } from "../ui/button";
import { MAX_FILE_BYTES, MAX_BACKUP_BYTES, parseBackup, serializeBackup } from "../../lib/library";
import { downloadOriginal } from "../../lib/reading-download";
import { ImportReport, ImportNotes } from "./ImportReport";
import { InstallGuide } from "../InstallGuide";
import { PasteTextDialog } from "./PasteTextDialog";
import { LinkImportDialog } from "./LinkImportDialog";
import type { Library } from "../../lib/library";
import { initialPosition, readingProgress, type Reading } from "@still/reader-core";

type Props = {
  library: Library;
  ready: boolean;
  saving: boolean;
  storageError: string;
  onOpen: (id: string) => void;
  onAdd: (reading: Reading) => void;
  onRemove: (id: string) => void;
  onRestore: (library: Library) => number;
  onPaste: (text: string, title: string) => void;
  onLink: (reading: Reading) => void;
};

function download(library: Library) {
  const blob = new Blob([serializeBackup(library)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `still-library-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  // Allow the browser to begin the download before releasing its URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function LibraryPanel({
  library,
  ready,
  saving,
  storageError,
  onOpen,
  onAdd,
  onRemove,
  onRestore,
  onPaste,
  onLink,
}: Props) {
  const epubInput = useRef<HTMLInputElement>(null);
  const pasteButton = useRef<HTMLButtonElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const linkButton = useRef<HTMLButtonElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingReading, setPendingReading] = useState<Reading | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const active = library.readings.find((r) => r.id === library.activeId);
  const readings = [...library.readings].sort(
    (a, b) =>
      (library.positions[b.id]?.updatedAt || b.addedAt) -
      (library.positions[a.id]?.updatedAt || a.addedAt),
  );
  const runImport = async (file: File | undefined, kind: "epub" | "backup") => {
    if (!file) return;
    setError("");
    setMessage("");
    setPendingReading(null);
    setBusy(true);
    try {
      if (file.size > (kind === "epub" ? MAX_FILE_BYTES : MAX_BACKUP_BYTES))
        throw new Error(
          kind === "epub"
            ? "Choose an EPUB smaller than 50 MB."
            : "Choose a Still backup smaller than 250 MB.",
        );
      if (kind === "epub") {
        const { importEpub } = await import("../../lib/epub");
        const reading = await importEpub(
          new Uint8Array(await file.arrayBuffer()),
          file.name.replace(/\.epub$/i, ""),
          file.name,
        );
        setPendingReading(reading);
        setMessage("Review your book below before adding it to the library.");
      } else {
        const count = onRestore(parseBackup(await file.text()));
        setMessage(
          count
            ? `Restored ${count} ${count === 1 ? "reading" : "readings"}. Existing readings and progress were kept.`
            : "These readings are already in your library. Your progress was kept.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The file couldn't be imported. Try another file.",
      );
    } finally {
      setBusy(false);
    }
  };
  const exportLibrary = (value: Library) => {
    try {
      download(value);
      setError("");
      setMessage("Backup prepared. Keep the downloaded file somewhere safe.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The backup couldn't be created.");
    }
  };
  return (
    <main
      id="library"
      className="mx-auto max-w-[1000px] px-10 pt-12 pb-20 max-[800px]:px-7 max-[520px]:px-[23px] max-[520px]:pt-8"
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-7">
        <div>
          <h1>Your library</h1>
          <p className="m-0 text-sm leading-relaxed text-muted-foreground">
            A place for the reading you want to return to.
          </p>
          <InstallGuide
            busy={busy}
            onExportLibrary={
              ready && readings.length > 0 ? () => exportLibrary(library) : undefined
            }
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            ref={pasteButton}
            onClick={() => setPasteOpen(true)}
            disabled={busy || !ready}
          >
            <Plus size={17} /> Paste text
          </Button>
          <Button
            variant="outline"
            ref={linkButton}
            onClick={() => setLinkOpen(true)}
            disabled={busy || !ready}
          >
            <Link2 size={17} /> From a link
          </Button>
          <Button onClick={() => epubInput.current?.click()} disabled={busy || !ready}>
            <Upload size={17} /> Import EPUB
          </Button>
        </div>
      </div>
      <PasteTextDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        returnFocusRef={pasteButton}
        onImport={onPaste}
      />
      <LinkImportDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        returnFocusRef={linkButton}
        onImport={onLink}
      />
      <input
        className="sr-only"
        tabIndex={-1}
        ref={epubInput}
        type="file"
        accept=".epub,application/epub+zip"
        aria-label="Choose EPUB"
        disabled={busy || !ready}
        onChange={(event) => {
          void runImport(event.target.files?.[0], "epub");
          event.target.value = "";
        }}
      />
      <input
        className="sr-only"
        tabIndex={-1}
        ref={backupInput}
        type="file"
        accept=".json,application/json"
        aria-label="Choose Still backup"
        disabled={busy || !ready}
        onChange={(event) => {
          void runImport(event.target.files?.[0], "backup");
          event.target.value = "";
        }}
      />
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        DRM-free, reflowable prose EPUBs, up to 50 MB. Books stay on this device.
      </p>
      <div role="status" className="text-sm leading-relaxed text-muted-foreground">
        {busy ? "Opening your file…" : message}
      </div>
      {error && (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {error}
        </p>
      )}
      {storageError && (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {storageError}
        </p>
      )}
      {pendingReading && (
        <ImportReport
          reading={pendingReading}
          onCancel={() => {
            setPendingReading(null);
            setMessage("Import canceled. Your library is unchanged.");
          }}
          onAccept={() => {
            try {
              onAdd(pendingReading);
              setMessage(`Added ${pendingReading.title}. Your book is ready to read.`);
              setPendingReading(null);
              setError("");
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "The book couldn't be added.");
            }
          }}
        />
      )}
      {!ready ? (
        <p className="py-12 text-sm text-muted-foreground">Opening your library…</p>
      ) : (
        <>
          {active && (
            <section className="my-10 border-b border-border pb-9" aria-label="Continue reading">
              <div className="flex flex-wrap items-center justify-between gap-5 max-[520px]:flex-col max-[520px]:items-start">
                <div className="min-w-0 flex-1 max-[520px]:w-full">
                  <h2 className="m-0 font-serif text-[28px] leading-tight font-[450] wrap-anywhere">
                    {active.title}
                  </h2>
                  <p className="mt-3 mb-0 text-xs leading-relaxed text-muted-foreground">
                    {active.author && `${active.author} · `}
                    {readingProgress(
                      active,
                      library.positions[active.id] ?? initialPosition(active),
                    )}
                    % through
                    {active.kind === "epub" &&
                      ` · ${active.chapters.find((c) => c.id === library.positions[active.id]?.chapterId)?.title ?? active.chapters[0].title}`}
                  </p>
                </div>
                <Button disabled={busy} onClick={() => onOpen(active.id)}>
                  Continue reading <ArrowRight size={17} />
                </Button>
              </div>
            </section>
          )}
          {readings.length ? (
            <ul className="m-0 list-none p-0" aria-label="Saved readings">
              {readings.map((reading) => {
                const position = library.positions[reading.id] ?? initialPosition(reading);
                return (
                  <li key={reading.id} className="border-b border-border py-5">
                    <div className="flex items-start gap-4">
                      <BookOpen
                        size={19}
                        className="mt-1 shrink-0 text-muted-foreground max-[520px]:hidden"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <Button
                          variant="plain"
                          className="justify-start bg-transparent p-0 text-left font-serif text-xl leading-snug text-foreground wrap-anywhere hover:text-brand"
                          disabled={busy}
                          onClick={() => onOpen(reading.id)}
                        >
                          {reading.title}
                        </Button>
                        <p className="mt-2 mb-0 text-xs leading-relaxed text-muted-foreground">
                          {reading.kind === "epub"
                            ? `${reading.chapters.length} chapters`
                            : reading.source
                              ? reading.source.siteName
                              : "Pasted reading"}
                          {reading.author && ` · ${reading.author}`} ·{" "}
                          {readingProgress(reading, position)}% through
                        </p>
                        {reading.originalEpub && (
                          <Button
                            variant="text"
                            disabled={busy}
                            aria-label={`Download original EPUB: ${reading.title}`}
                            onClick={() => downloadOriginal(reading)}
                          >
                            Download original EPUB
                          </Button>
                        )}
                        <ImportNotes reading={reading} />
                        {removing === reading.id && (
                          <div className="mt-4 text-sm">
                            <p>
                              Remove this reading and its saved place? Export it first to keep a
                              copy.
                            </p>
                            <div className="flex flex-wrap gap-4">
                              <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                  onRemove(reading.id);
                                  setRemoving(null);
                                  setMessage(`Removed ${reading.title}.`);
                                }}
                              >
                                Remove reading
                              </Button>
                              <Button variant="text" onClick={() => setRemoving(null)}>
                                Keep reading
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 max-[520px]:flex-col">
                        <Button
                          variant="ghost"
                          disabled={busy}
                          aria-label={`Export ${reading.title}`}
                          title="Export reading"
                          onClick={() =>
                            exportLibrary({
                              ...library,
                              readings: [reading],
                              positions: { [reading.id]: position },
                              activeId: reading.id,
                            })
                          }
                        >
                          <Download size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          aria-label={`Remove ${reading.title}`}
                          title="Remove reading"
                          onClick={() => setRemoving(removing === reading.id ? null : reading.id)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-14">
              <h2 className="font-serif text-2xl">Make room for your first reading.</h2>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                Import a book, paste a passage, open an article from a link, or restore a Still
                backup. Your place will be here when you come back.
              </p>
            </div>
          )}
        </>
      )}
      <footer
        className="mt-10"
        data-save={storageError ? "error" : saving ? "saving" : ready ? "saved" : "loading"}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Button
            variant="text"
            disabled={busy || !ready || !readings.length}
            onClick={() => exportLibrary(library)}
          >
            Export library
          </Button>
          <Button
            variant="text"
            disabled={busy || !ready}
            onClick={() => backupInput.current?.click()}
          >
            Restore backup
          </Button>
          {storageError && (
            <span className="text-xs text-muted-foreground">Changes are not saved</span>
          )}
        </div>
        <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
          Clearing browser data removes your library. Export a backup to keep your readings and
          progress, or move them to another device. Restoring adds readings and keeps existing
          progress.
        </p>
      </footer>
    </main>
  );
}
