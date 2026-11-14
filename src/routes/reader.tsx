import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { useReader } from "../hooks/useReader";
import { AboutReaderDialog } from "../components/reader/AboutReaderDialog";
import { SkipLink } from "../components/SkipLink";
import { AnchoredWord } from "../components/reader/AnchoredWord";
import { ArticleView } from "../components/reader/ArticleView";
import { FocusView } from "../components/reader/FocusView";
import { PasteTextDialog } from "../components/reader/PasteTextDialog";
import { ReaderControls } from "../components/reader/ReaderControls";
import { ReaderHeader } from "../components/reader/ReaderHeader";
import { ReadingHeading } from "../components/reader/ReadingHeading";
import type { ReaderView } from "../components/reader/ReadingHeading";
import { ContextView } from "../components/reader/ContextView";
import { downloadOriginal } from "../lib/reading-download";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/reader")({
  head: () => ({ meta: [{ title: "Reader — Still" }] }),
  validateSearch: (search: Record<string, unknown>): { sample?: boolean } =>
    search.sample === true ? { sample: true } : {},
  component: ReaderPage,
});

type Flight = {
  word: string;
  left: number;
  top: number;
  targetLeft: number;
  targetTop: number;
  size: number;
  targetSize: number;
};

function ReaderPage() {
  const reader = useReader();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const [view, setView] = useState<ReaderView>("article");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const activeRef = useRef<HTMLSpanElement>(null);
  const focusRef = useRef<HTMLSpanElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const playAfterTransition = useRef(false);
  const transitionFrame = useRef(0);
  const playRef = useRef<HTMLButtonElement>(null);
  const pasteRef = useRef<HTMLButtonElement>(null);

  const finishTransition = () => {
    setFlight(null);
    setTransitioning(false);
    const shouldPlay = playAfterTransition.current && !document.hidden;
    playAfterTransition.current = false;
    if (shouldPlay) reader.togglePlay();
  };

  useEffect(() => {
    // The outgoing reader can render once more while another route is loading.
    if (
      router.state.location.pathname === "/reader" &&
      reader.ready &&
      !reader.isSample &&
      !reader.library.readings.length
    )
      void navigate({ to: "/library", replace: true });
  }, [reader.ready, reader.isSample, reader.library.readings.length, navigate, router]);

  useEffect(() => () => cancelAnimationFrame(transitionFrame.current), []);
  useEffect(() => () => reader.setPlaying(false), [reader.setPlaying]);
  useEffect(() => {
    const cancelPendingPlay = () => {
      playAfterTransition.current = false;
    };
    const onVisibility = () => {
      if (document.hidden) cancelPendingPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", cancelPendingPlay);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", cancelPendingPlay);
    };
  }, []);

  const changeView = (next: ReaderView, playAfter = false) => {
    if (transitioning || next === view) return;
    reader.setPlaying(false);
    // Article and Guided share the same surface; only Focus needs a word flight.
    if (view !== "focus" && next !== "focus") {
      playAfterTransition.current = false;
      setView(next);
      return;
    }
    if (reader.context) {
      playAfterTransition.current = false;
      flushSync(() => setView(next));
      if (next !== "focus") {
        activeRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
        activeRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    playAfterTransition.current = playAfter;
    const source = view === "focus" ? focusRef.current : activeRef.current;
    const from = source?.getBoundingClientRect();
    const size = source ? parseFloat(getComputedStyle(source).fontSize) : 24;
    flushSync(() => {
      setTransitioning(true);
      setView(next);
    });
    if (next !== "focus")
      activeRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    transitionFrame.current = requestAnimationFrame(() => {
      const target = next === "focus" ? focusRef.current : activeRef.current;
      const to = target?.getBoundingClientRect();
      if (reducedMotion || !from || !to || from.bottom < 0 || from.top > window.innerHeight) {
        finishTransition();
        return;
      }
      setFlight({
        word: reader.current.text,
        left: from.left,
        top: from.top,
        targetLeft: to.left,
        targetTop: to.top,
        size,
        targetSize: target ? parseFloat(getComputedStyle(target).fontSize) : size,
      });
    });
  };

  const handlePlay = () => {
    if (!reader.ready || transitioning) return;
    if (view === "article") changeView("focus", true);
    else reader.togglePlay();
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector('[role="dialog"]') ||
        target.isContentEditable ||
        pasteOpen ||
        aboutOpen ||
        transitioning ||
        !reader.ready ||
        target.closest('input, textarea, button, select, a, [contenteditable="true"]')
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        handlePlay();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        reader.seek(reader.index - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        reader.seek(reader.index + 1);
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        reader.replay();
      }
      if (event.key === "Escape" && view === "focus") changeView("article");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const openPaste = () => {
    playAfterTransition.current = false;
    reader.setPlaying(false);
    setPasteOpen(true);
  };
  const importText = (text: string, title: string) => {
    reader.replace(text, title);
    void navigate({ search: {}, replace: true });
    setView("article");
    setPasteOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => articleRef.current?.focus({ preventScroll: true }));
  };
  const showChapter = (id: string) => {
    playAfterTransition.current = false;
    reader.openChapter(id);
    setView(view === "guided" ? "guided" : "article");
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => articleRef.current?.focus({ preventScroll: true }));
  };
  const continueAfterBlock = (blockId: string) => {
    playAfterTransition.current = false;
    reader.continueAfterBlock(blockId);
    setView(view === "guided" ? "guided" : "focus");
    requestAnimationFrame(() => playRef.current?.focus({ preventScroll: true }));
  };
  if (!reader.isSample && (!reader.ready || !reader.library.readings.length))
    return <p className="p-8 text-sm text-muted-foreground">Opening your reading…</p>;

  return (
    <>
      <SkipLink href="#reading">Skip to reading</SkipLink>
      <ReaderHeader
        disabled={!reader.ready || transitioning}
        onPaste={openPaste}
        onShortcutsOpen={() => {
          playAfterTransition.current = false;
        }}
        pasteRef={pasteRef}
        onAbout={() => {
          playAfterTransition.current = false;
          reader.setPlaying(false);
          setAboutOpen(true);
        }}
      />
      <main
        id="reading"
        data-view={view}
        className="group/reader mx-auto max-w-[1000px] px-10 pt-[51px] pb-[210px] min-[1500px]:pt-[65px] max-[800px]:px-7 max-[800px]:pt-[37px] max-[520px]:px-[23px] max-[520px]:pt-[30px] max-[520px]:pb-[235px] compact-reader:data-[view=focus]:pt-[22px]"
      >
        <p id="reading-shortcuts" className="sr-only">
          Press ? or use Keyboard shortcuts in the header for the keyboard legend.
        </p>
        <ReadingHeading
          title={reader.title}
          sourceIsSample={reader.isSample}
          wordCount={reader.wordCount}
          view={view}
          disabled={transitioning || !reader.ready}
          onViewChange={changeView}
        />
        {reader.reading.kind === "epub" && view !== "focus" && (
          <nav aria-label="Chapters" className="mt-6 flex flex-wrap items-center gap-3">
            <label htmlFor="chapter" className="text-xs text-muted-foreground">
              Chapter {reader.chapterIndex + 1} of {reader.reading.chapters.length}
            </label>
            <select
              id="chapter"
              value={reader.chapter.id}
              disabled={transitioning || !reader.ready}
              onChange={(event) => showChapter(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm max-[520px]:basis-full"
            >
              {reader.reading.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
            <Button
              variant="text"
              disabled={transitioning || reader.chapterIndex === 0}
              onClick={() => showChapter(reader.reading.chapters[reader.chapterIndex - 1].id)}
            >
              Previous chapter
            </Button>
            <Button
              variant="text"
              disabled={transitioning || reader.chapterIndex === reader.reading.chapters.length - 1}
              onClick={() => showChapter(reader.reading.chapters[reader.chapterIndex + 1].id)}
            >
              Next chapter
            </Button>
          </nav>
        )}
        {view !== "focus" ? (
          <ArticleView
            guided={view === "guided"}
            playing={reader.playing}
            title={reader.title}
            chapter={reader.chapter}
            entries={reader.words}
            index={reader.index}
            ready={reader.ready}
            transitioning={transitioning}
            articleRef={articleRef}
            activeRef={activeRef}
            onSeek={reader.seek}
            onContinue={continueAfterBlock}
            onDownloadOriginal={
              reader.reading.originalEpub ? () => downloadOriginal(reader.reading) : undefined
            }
          />
        ) : reader.context ? (
          <ContextView
            actionRef={playRef}
            block={reader.context}
            finished={reader.finished}
            onView={() => changeView("article")}
            onContinue={() => continueAfterBlock(reader.context!.id)}
            onRestart={reader.togglePlay}
            onNextChapter={
              reader.chapterIndex < reader.reading.chapters.length - 1
                ? () => showChapter(reader.reading.chapters[reader.chapterIndex + 1].id)
                : undefined
            }
          />
        ) : (
          <FocusView
            word={reader.current.text}
            playing={reader.playing}
            finished={reader.finished}
            transitioning={transitioning}
            wordRef={focusRef}
            onReturnToArticle={() => changeView("article")}
            onNextChapter={
              reader.chapterIndex < reader.reading.chapters.length - 1
                ? () => showChapter(reader.reading.chapters[reader.chapterIndex + 1].id)
                : undefined
            }
          />
        )}
      </main>
      <ReaderControls
        isSample={reader.isSample}
        index={reader.index}
        wordCount={reader.words.length}
        wpm={reader.wpm}
        ready={reader.ready}
        playing={reader.playing}
        finished={reader.finished}
        saving={reader.saving}
        storageError={reader.storageError}
        transitioning={transitioning}
        contextPaused={view === "focus" && !!reader.context}
        atContext={view === "guided" && !!reader.context}
        playRef={playRef}
        onPlay={handlePlay}
        onReplay={reader.replay}
        onSeek={reader.seek}
        onWpmChange={reader.setWpm}
      />
      {flight && (
        <motion.div
          data-testid="word-flight"
          className="pointer-events-none fixed top-0 left-0 z-20 font-serif leading-[1.4] whitespace-nowrap"
          aria-hidden="true"
          initial={{ x: flight.left, y: flight.top, fontSize: flight.size }}
          animate={{
            x: flight.targetLeft,
            y: flight.targetTop,
            fontSize: flight.targetSize,
          }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={finishTransition}
        >
          <AnchoredWord word={flight.word} />
        </motion.div>
      )}

      <PasteTextDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        returnFocusRef={playRef}
        onImport={importText}
      />
      <AboutReaderDialog open={aboutOpen} onOpenChange={setAboutOpen} returnFocusRef={playRef} />
    </>
  );
}
