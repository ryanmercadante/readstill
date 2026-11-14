import { useCallback, useEffect, useMemo, useState } from "react";
import { get, set } from "idb-keyval";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "../lib/sample";
import { tokenize, validSnapshot, wordDuration } from "../lib/reader";
import type { Snapshot } from "../lib/reader";

const STORAGE_KEY = "still.current-reading.v1";

export function useReader() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [title, setTitle] = useState(SAMPLE_TITLE);
  const [index, setIndex] = useState(0);
  const [wpm, setWpm] = useState(250);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const paragraphs = useMemo(() => tokenize(text), [text]);
  const words = useMemo(() => paragraphs.flat(), [paragraphs]);
  const current = words[index] ?? words[0];

  useEffect(() => {
    let cancelled = false;
    get(STORAGE_KEY)
      .then((value) => {
        if (cancelled) return;
        if (validSnapshot(value)) {
          setText(value.text);
          setTitle(value.title);
          setWpm(value.wpm);
          setIndex(Math.min(value.index, tokenize(value.text).flat().length - 1));
        }
      })
      .catch(() => {
        if (!cancelled) setStorageError(true);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setSaving(true);
    const snapshot: Snapshot = { version: 1, text, title, index, wpm };
    // One small, asynchronous record; IndexedDB transactions preserve write order.
    void set(STORAGE_KEY, snapshot)
      .then(() => {
        if (active) setStorageError(false);
      })
      .catch(() => {
        if (active) setStorageError(true);
      })
      .finally(() => {
        if (active) setSaving(false);
      });
    return () => {
      active = false;
    };
  }, [ready, text, title, index, wpm]);

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

  useEffect(() => {
    if (!playing || !current) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= wordDuration(current, wpm)) {
        if (index >= words.length - 1) {
          setPlaying(false);
          setFinished(true);
        } else setIndex((i) => i + 1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, current, index, wpm, words.length]);

  const seek = useCallback(
    (next: number) => {
      setPlaying(false);
      setFinished(false);
      setIndex(Math.max(0, Math.min(words.length - 1, next)));
    },
    [words.length],
  );

  const replay = useCallback(() => seek(current.sentenceStart), [current, seek]);
  const togglePlay = useCallback(() => {
    if (finished) {
      setIndex(0);
      setFinished(false);
    }
    setPlaying((p) => !p);
  }, [finished]);
  const replace = useCallback((nextText: string, nextTitle: string) => {
    setPlaying(false);
    setFinished(false);
    setIndex(0);
    setText(nextText.trim());
    setTitle(nextTitle.trim() || "Untitled reading");
  }, []);

  return {
    text,
    title,
    index,
    wpm,
    setWpm,
    playing,
    setPlaying,
    finished,
    ready,
    storageError,
    saving,
    paragraphs,
    words,
    current,
    seek,
    replay,
    togglePlay,
    replace,
  };
}
