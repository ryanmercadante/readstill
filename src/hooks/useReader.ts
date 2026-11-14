import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wordDuration } from "../lib/reader";
import {
  initialPosition,
  MAX_READINGS,
  mergeLibrary,
  sampleReading,
  assertLibraryCapacity,
  textReading,
} from "../lib/library";
import type { Library, Reading } from "../lib/library";
import { loadLibrary, saveLibrary } from "../lib/library-storage";
import type { StoredLibrary } from "../lib/library-storage";
import { chapterSequence, chapterText, positionAt, sequenceIndex } from "../lib/reader-document";

const initialLibrary: Library = {
  readings: [sampleReading],
  positions: { [sampleReading.id]: initialPosition(sampleReading) },
  activeId: sampleReading.id,
  wpm: 250,
};

export function useReader() {
  const [library, setLibrary] = useState<Library>(initialLibrary);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [savedLibrary, setSavedLibrary] = useState<Library | null>(null);
  const persisted = useRef<StoredLibrary | null>(null);
  const queue = useRef(Promise.resolve());
  const reading = library.readings.find((r) => r.id === library.activeId) ?? sampleReading;
  const position = library.positions[reading.id] ?? initialPosition(reading);
  const chapter = reading.chapters.find((c) => c.id === position.chapterId) ?? reading.chapters[0];
  const chapterIndex = reading.chapters.indexOf(chapter);
  const words = useMemo(() => chapterSequence(chapter), [chapter]);
  const text = useMemo(() => chapterText(chapter), [chapter]);
  const index = Math.max(0, sequenceIndex(chapter, position));
  const finished = position.finished;
  const current = words[index] ?? words[0];
  const wpm = library.wpm;

  useEffect(() => {
    let cancelled = false;
    loadLibrary()
      .then((stored) => {
        if (cancelled) return;
        persisted.current = stored;
        setLibrary(stored.library);
        setSavedLibrary(stored.library);
      })
      .catch(() => {
        if (!cancelled)
          setStorageError(
            "Your saved library couldn't be opened. Reload to try again. New readings can be exported, but won't be saved in this session.",
          );
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !persisted.current || persisted.current.library === library) return;
    let active = true;
    queue.current = queue.current.then(async () => {
      try {
        persisted.current = await saveLibrary(library, persisted.current!);
        if (active) {
          setSavedLibrary(library);
          setStorageError("");
        }
      } catch (error) {
        if (active)
          setStorageError(
            error instanceof Error && error.message.includes("another tab")
              ? error.message
              : "This browser couldn't save your library. Export a backup before closing, then free browser storage and retry.",
          );
      }
    });
    return () => {
      active = false;
    };
  }, [library, ready]);

  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    const pageHide = () => setPlaying(false);
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("pagehide", pageHide);
    return () => {
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("pagehide", pageHide);
    };
  }, []);

  const move = useCallback(
    (next: number, done = false) => {
      setLibrary((state) => ({
        ...state,
        positions: {
          ...state.positions,
          [reading.id]: positionAt(chapter, next, done),
        },
      }));
    },
    [reading.id, chapter],
  );

  useEffect(() => {
    if (!playing || !current || current.context) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - start >= wordDuration(current, wpm)) {
        if (index >= words.length - 1) {
          setPlaying(false);
          move(index, true);
        } else {
          if (words[index + 1].context) setPlaying(false);
          move(index + 1);
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, current, index, wpm, words, move]);

  const seek = useCallback(
    (next: number) => {
      setPlaying(false);
      move(Math.max(0, Math.min(words.length - 1, next)));
    },
    [words.length, move],
  );
  const replay = useCallback(() => seek(current.sentenceStart), [current, seek]);
  const togglePlay = useCallback(() => {
    if (finished) {
      move(0);
      setPlaying(!words[0].context);
    } else if (!current.context) setPlaying((p) => !p);
  }, [finished, move, words, current]);
  const setWpm = useCallback(
    (value: number) => setLibrary((state) => ({ ...state, wpm: value })),
    [],
  );
  const openReading = (id: string) => {
    setPlaying(false);
    setLibrary((state) => ({ ...state, activeId: id }));
  };
  const openChapter = (id: string) => {
    if (!reading.chapters.some((c) => c.id === id)) return;
    setPlaying(false);
    setLibrary((state) => ({
      ...state,
      positions: {
        ...state.positions,
        [reading.id]: positionAt(
          reading.chapters.find((c) => c.id === id)!,
          0,
        ),
      },
    }));
  };
  const continueAfterBlock = (blockId: string) => {
    const from = words.findIndex((entry) => entry.blockId === blockId);
    if (from < 0 || !words[from].context) return;
    if (from === words.length - 1) {
      setPlaying(false);
      move(from, true);
    } else {
      move(from + 1);
      setPlaying(!words[from + 1].context && !document.hidden);
    }
  };
  const addReading = (item: Reading) => {
    if (library.readings.length >= MAX_READINGS)
      throw new Error("Your library holds 100 readings. Remove one before adding another.");
    const next = {
      ...library,
      readings: [...library.readings, item],
      positions: { ...library.positions, [item.id]: initialPosition(item) },
      activeId: item.id,
    };
    assertLibraryCapacity(next);
    setPlaying(false);
    setLibrary(next);
  };
  const replace = (text: string, title: string) => addReading(textReading(text, title));
  const removeReading = (id: string) => {
    setPlaying(false);
    setLibrary((state) => {
      const readings = state.readings.filter((r) => r.id !== id);
      const positions = { ...state.positions };
      delete positions[id];
      return {
        ...state,
        readings,
        positions,
        activeId: state.activeId === id ? (readings[0]?.id ?? null) : state.activeId,
      };
    });
  };
  const restore = (incoming: Library) => {
    const next = mergeLibrary(library, incoming);
    assertLibraryCapacity(next);
    setLibrary(next);
    return next.readings.length - library.readings.length;
  };
  return {
    library,
    reading,
    chapter,
    chapterIndex,
    openReading,
    openChapter,
    addReading,
    removeReading,
    restore,
    text,
    context: current.context,
    continueAfterBlock,
    wordCount: words.filter((word) => !word.context).length,
    title: reading.title,
    index,
    wpm,
    setWpm,
    playing,
    setPlaying,
    finished,
    ready,
    storageError,
    // A changed position is unsaved in the very render that displays it,
    // including the interval before its persistence effect has been scheduled.
    saving: ready && library !== savedLibrary && !storageError,
    words,
    current,
    seek,
    replay,
    togglePlay,
    replace,
  };
}
