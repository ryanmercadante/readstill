import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { useReader } from "../hooks/useReader";
import { SAMPLE_TEXT } from "../lib/sample";
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

export const Route = createFileRoute("/reader")({
  head: () => ({ meta: [{ title: "Reader — Still" }] }),
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

  const finishTransition = () => {
    setFlight(null);
    setTransitioning(false);
    const shouldPlay = playAfterTransition.current && !document.hidden;
    playAfterTransition.current = false;
    if (shouldPlay) reader.togglePlay();
  };

  useEffect(() => () => cancelAnimationFrame(transitionFrame.current), []);
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
    playAfterTransition.current = playAfter;
    const source = view === "article" ? activeRef.current : focusRef.current;
    const from = source?.getBoundingClientRect();
    const size = source ? parseFloat(getComputedStyle(source).fontSize) : 24;
    flushSync(() => {
      setTransitioning(true);
      setView(next);
    });
    if (next === "article")
      activeRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    transitionFrame.current = requestAnimationFrame(() => {
      const target = next === "article" ? activeRef.current : focusRef.current;
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
    setView("article");
    setPasteOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => articleRef.current?.focus({ preventScroll: true }));
  };
  return (
    <>
      <SkipLink href="#reading">Skip to reading</SkipLink>
      <ReaderHeader
        disabled={!reader.ready || transitioning}
        onPaste={openPaste}
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
        <ReadingHeading
          title={reader.title}
          sourceIsSample={reader.text === SAMPLE_TEXT}
          wordCount={reader.words.length}
          view={view}
          disabled={transitioning || !reader.ready}
          onViewChange={changeView}
        />
        {view === "article" ? (
          <ArticleView
            title={reader.title}
            paragraphs={reader.paragraphs}
            index={reader.index}
            ready={reader.ready}
            transitioning={transitioning}
            articleRef={articleRef}
            activeRef={activeRef}
            onSeek={reader.seek}
          />
        ) : (
          <FocusView
            word={reader.current.text}
            playing={reader.playing}
            finished={reader.finished}
            transitioning={transitioning}
            wordRef={focusRef}
            onReturnToArticle={() => changeView("article")}
          />
        )}
      </main>
      <ReaderControls
        index={reader.index}
        wordCount={reader.words.length}
        wpm={reader.wpm}
        ready={reader.ready}
        playing={reader.playing}
        finished={reader.finished}
        saving={reader.saving}
        storageError={reader.storageError}
        transitioning={transitioning}
        playRef={playRef}
        onPlay={handlePlay}
        onReplay={reader.replay}
        onSeek={reader.seek}
        onWpmChange={reader.setWpm}
      />
      {flight && (
        <motion.div
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
