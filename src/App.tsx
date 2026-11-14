import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import {
  AlignLeft,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Check,
  Focus,
  Info,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useReader } from "./useReader";
import { anchorParts, MAX_TEXT_LENGTH, MAX_WPM, MIN_WPM } from "./reader";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "./sample";

type View = "article" | "focus";
type Flight = {
  word: string;
  left: number;
  top: number;
  targetLeft: number;
  targetTop: number;
  size: number;
  targetSize: number;
};

function Word({ word }: { word: string }) {
  const parts = anchorParts(word);
  return (
    <>
      <span>{parts.before}</span>
      <span className="anchor-letter">{parts.anchor}</span>
      <span>{parts.after}</span>
    </>
  );
}

export default function App() {
  const reader = useReader();
  const [view, setView] = useState<View>("article");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [formError, setFormError] = useState("");
  const [focusSize, setFocusSize] = useState(76);
  const [focusOffset, setFocusOffset] = useState(0);
  const reducedMotion = useReducedMotion();
  const activeRef = useRef<HTMLSpanElement>(null);
  const focusRef = useRef<HTMLSpanElement>(null);
  const focusStageRef = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    if (view !== "focus") return;
    const measure = () => {
      const stage = focusStageRef.current;
      const word = focusRef.current;
      if (!stage || !word) return;
      const viewportWidth = stage.clientWidth;
      const base = viewportWidth < 600 ? 52 : 76;
      const parts = word.children;
      const left =
        (parts[0]?.getBoundingClientRect().width ?? 0) +
        (parts[1]?.getBoundingClientRect().width ?? 0) / 2;
      const right =
        (parts[2]?.getBoundingClientRect().width ?? 0) +
        (parts[1]?.getBoundingClientRect().width ?? 0) / 2;
      const currentSize = parseFloat(getComputedStyle(word).fontSize);
      const ideal = Math.min(
        base,
        currentSize * ((viewportWidth / 2 - 20) / Math.max(left, right, 1)),
      );
      setFocusSize(Math.max(8, Math.floor(ideal)));
      setFocusOffset(left);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view, reader.current.text, focusSize]);

  useEffect(() => {
    if (view !== "article" || !reader.ready || transitioning) return;
    const word = activeRef.current;
    const rect = word?.getBoundingClientRect();
    if (rect && (rect.top < 20 || rect.bottom > window.innerHeight - 190)) {
      word?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [reader.index, reader.ready, view, transitioning]);

  const changeView = (next: View, playAfter = false) => {
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
      activeRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
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
    setDraft("");
    setDraftTitle("");
    setFormError("");
    setPasteOpen(true);
  };
  const importText = (text: string, title: string) => {
    reader.replace(text, title);
    setView("article");
    setPasteOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => articleRef.current?.focus({ preventScroll: true }));
  };
  const progress = reader.finished ? 100 : Math.round((reader.index / reader.words.length) * 100);
  const sourceIsSample = reader.text === SAMPLE_TEXT;

  return (
    <>
      <a className="skip-link" href="#reading">
        Skip to reading
      </a>
      <header className="site-header">
        <a className="wordmark" href="#reading" aria-label="Still reader">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          still<span className="brand-period">.</span>
        </a>
        <span className="tagline">Make room for reading.</span>
        <div className="header-actions">
          <button
            className="icon-button about-button"
            aria-label="About this reader"
            onClick={() => {
              playAfterTransition.current = false;
              reader.setPlaying(false);
              setAboutOpen(true);
            }}
          >
            <Info size={19} />
          </button>
          <button
            className="text-button paste-button"
            onClick={openPaste}
            disabled={!reader.ready || transitioning}
          >
            <Plus size={17} />
            Paste text
          </button>
        </div>
      </header>

      <main id="reading" className={`reader-shell ${view === "focus" ? "is-focus" : ""}`}>
        <section className="reading-heading" aria-label="Reading details">
          <div className="document-heading">
            <h1>{reader.title}</h1>
            <p>
              {sourceIsSample ? "An original sample" : "Your reading"}
              <span aria-hidden="true">·</span>
              {reader.words.length.toLocaleString()} words
            </p>
          </div>
          <div className="view-switch" role="group" aria-label="Reading view">
            <button
              aria-pressed={view === "article"}
              disabled={transitioning || !reader.ready}
              onClick={() => changeView("article")}
            >
              <AlignLeft size={16} />
              Article
            </button>
            <button
              aria-pressed={view === "focus"}
              disabled={transitioning || !reader.ready}
              onClick={() => changeView("focus")}
            >
              <Focus size={16} />
              Focus
            </button>
          </div>
        </section>

        {view === "article" ? (
          <div className="article-area">
            <p className="reading-hint">
              <span className="hint-dot" />
              Tap a word to find your place. Press play to focus.
            </p>
            <article
              ref={articleRef}
              className="article-text"
              tabIndex={0}
              aria-label={reader.title}
              aria-describedby="reading-shortcuts"
              onClick={(event) => {
                if (transitioning || !reader.ready || window.getSelection()?.toString()) return;
                const word = (event.target as HTMLElement).closest<HTMLElement>("[data-word]");
                if (word) reader.seek(Number(word.dataset.word));
              }}
            >
              {reader.paragraphs.map((paragraph, i) => (
                <p key={i}>
                  {paragraph.map((token) => (
                    <span key={token.index}>
                      <span
                        data-word={token.index}
                        ref={token.index === reader.index ? activeRef : null}
                        className={token.index === reader.index ? "current-word" : undefined}
                        aria-current={token.index === reader.index ? "location" : undefined}
                        style={
                          transitioning && token.index === reader.index
                            ? { visibility: "hidden" }
                            : undefined
                        }
                      >
                        {token.text}
                      </span>
                      {token.following}
                    </span>
                  ))}
                </p>
              ))}
            </article>
            <div className="article-end">
              <span />A little space to take it in.
              <span />
            </div>
          </div>
        ) : (
          <section className="focus-area" aria-label="One word at a time">
            <div className="focus-status" role="status">
              {reader.finished
                ? "A moment to let it settle."
                : reader.playing
                  ? "One word at a time."
                  : "Find your pace. Take your time."}
            </div>
            <div className="focus-stage" ref={focusStageRef}>
              <div className="focus-guide top-guide" aria-hidden="true" />
              <div className="focus-line" style={{ fontSize: focusSize }}>
                <span
                  ref={focusRef}
                  className="focus-word"
                  data-testid="focus-word"
                  style={{
                    visibility: transitioning ? "hidden" : "visible",
                    transform: `translateX(-${focusOffset}px)`,
                  }}
                >
                  <Word word={reader.current.text} />
                </span>
              </div>
              <div className="focus-guide bottom-guide" aria-hidden="true" />
            </div>
            <p className="focus-context">
              {reader.finished
                ? "You reached the end. Reread a sentence, or start again."
                : "Need the bigger picture? Your passage is one click away."}
            </p>
            <button
              className="context-button"
              onClick={() => changeView("article")}
              disabled={transitioning}
            >
              <ArrowDownLeft size={17} />
              Back to the passage
            </button>
          </section>
        )}
      </main>

      <footer className="reader-dock">
        <div
          className="dock-progress"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="dock-controls">
          <div className="pace-control">
            <label htmlFor="pace">
              Your pace{" "}
              <span>
                <strong>{reader.wpm}</strong> WPM
              </span>
            </label>
            <input
              id="pace"
              type="range"
              min={MIN_WPM}
              max={MAX_WPM}
              step={25}
              value={reader.wpm}
              disabled={!reader.ready || transitioning}
              onChange={(e) => reader.setWpm(Number(e.target.value))}
              aria-valuetext={`${reader.wpm} words per minute`}
            />
            <span className="pace-note">A little breathing room at punctuation</span>
          </div>
          <div className="playback-control">
            <button
              className="icon-button replay-button"
              title="Replay sentence (R)"
              aria-label="Replay sentence"
              disabled={transitioning || !reader.ready}
              onClick={reader.replay}
            >
              <RotateCcw size={19} />
            </button>
            <button
              ref={playRef}
              className="play-button"
              onClick={handlePlay}
              disabled={!reader.ready || transitioning}
              aria-label={
                reader.playing ? "Pause reading" : reader.finished ? "Read again" : "Start reading"
              }
            >
              {reader.playing ? (
                <Pause size={19} fill="currentColor" />
              ) : reader.finished ? (
                <RotateCcw size={19} />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
              <span>{reader.playing ? "Pause" : reader.finished ? "Read again" : "Read"}</span>
            </button>
            <div className="step-buttons">
              <button
                className="icon-button"
                aria-label="Previous word"
                title="Previous word (←)"
                disabled={transitioning || reader.index === 0 || !reader.ready}
                onClick={() => reader.seek(reader.index - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Next word"
                title="Next word (→)"
                disabled={
                  transitioning || reader.index === reader.words.length - 1 || !reader.ready
                }
                onClick={() => reader.seek(reader.index + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="position-info">
            <span>
              {reader.index + 1} <span className="position-divider">/</span> {reader.words.length}
            </span>
            <small data-testid="save-status">
              {reader.storageError ? (
                "Progress could not be saved"
              ) : !reader.ready ? (
                "Opening your reading…"
              ) : reader.saving ? (
                "Saving on this device…"
              ) : (
                <>
                  <Check size={13} />
                  Saved on this device
                </>
              )}
            </small>
          </div>
        </div>
        <div className="dock-bottom">
          <span id="reading-shortcuts">
            <kbd>space</kbd> play / pause{" "}
            <span className="keyboard-extra">
              <kbd>←</kbd>
              <kbd>→</kbd> move a word
            </span>
          </span>
          <span>Understanding comes before speed.</span>
        </div>
        {reader.storageError && (
          <p className="storage-notice" role="status">
            This browser couldn’t save your reading. Keep a copy of your text before closing.
          </p>
        )}
      </footer>

      {flight && (
        <motion.div
          className="flying-word"
          aria-hidden="true"
          initial={{ x: flight.left, y: flight.top, fontSize: flight.size }}
          animate={{ x: flight.targetLeft, y: flight.targetTop, fontSize: flight.targetSize }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={finishTransition}
        >
          <Word word={flight.word} />
        </motion.div>
      )}

      <Dialog.Root open={pasteOpen} onOpenChange={setPasteOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="paste-dialog" finalFocus={playRef}>
            <div className="dialog-top">
              <Dialog.Title>Something worth reading.</Dialog.Title>
              <Dialog.Close className="icon-button" aria-label="Close paste dialog">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description>
              Paste a passage and make it your own pace. It stays in this browser.
            </Dialog.Description>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) {
                  setFormError("Add a few words to start reading.");
                  return;
                }
                if (draft.length > MAX_TEXT_LENGTH) {
                  setFormError(
                    "This first version supports up to 100,000 characters. Try a shorter passage.",
                  );
                  return;
                }
                importText(draft, draftTitle);
              }}
            >
              <label htmlFor="draft-title">
                Title <span>(optional)</span>
              </label>
              <input
                id="draft-title"
                value={draftTitle}
                maxLength={100}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="What are you reading?"
              />
              <label htmlFor="draft-text">Your text</label>
              <textarea
                id="draft-text"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setFormError("");
                }}
                placeholder="A story, an essay, a paragraph you've been meaning to read…"
                aria-describedby={formError ? "paste-error" : "paste-limit"}
              />
              <p id="paste-limit" className="form-note">
                Replaces your current reading. Up to 100,000 characters.
              </p>
              {formError && (
                <p id="paste-error" className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="sample-button"
                  type="button"
                  onClick={() => importText(SAMPLE_TEXT, SAMPLE_TITLE)}
                >
                  Use sample instead
                </button>
                <button className="primary-button" type="submit">
                  Start reading
                  <ArrowRight size={17} />
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={aboutOpen} onOpenChange={setAboutOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="about-dialog" finalFocus={playRef}>
            <div className="dialog-top">
              <Dialog.Title>A little more focus.</Dialog.Title>
              <Dialog.Close className="icon-button" aria-label="Close about dialog">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description>
              Still lets you move between a whole passage and one word at a time. You choose the
              pace.
            </Dialog.Description>
            <p>
              This technique is called rapid serial visual presentation, or RSVP. The colored letter
              provides a steady visual anchor. It isn't a promise of faster reading or better
              comprehension.
            </p>
            <p>
              Pause, reread, and slow down whenever you need to. The WPM setting controls
              presentation speed; punctuation pauses make the actual pace slower.
            </p>
            <a
              href="https://journals.sagepub.com/doi/10.1177/1529100615623267"
              target="_blank"
              rel="noreferrer"
            >
              Read the research review
              <ArrowRight size={15} />
            </a>
            <p className="privacy-note">
              Your text and position are saved in this browser. Clearing browser data removes them.
              There are no accounts, uploads, or cross-device sync.
            </p>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
