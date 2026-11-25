import { useRouterState } from "@tanstack/react-router";
import { useMachine } from "@xstate/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { Library } from "../lib/library";
import { createLibraryStore } from "../lib/library-store";
import { currentPlayback, playbackMachine } from "../lib/playback-machine";
import { connectReaderSession } from "../lib/reader-session";
import { type Reading } from "@still/reader-core";

function useReaderState() {
  const inReader = useRouterState({ select: (state) => state.location.pathname === "/reader" });
  const isSample = useRouterState({
    select: (state) =>
      state.location.pathname === "/reader" && state.location.search.sample === true,
  });
  const [store] = useState(() => createLibraryStore());
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [snapshot, send, actor] = useMachine(playbackMachine, {
    input: { ...store.select(isSample), wpm: state.library.wpm, available: false },
  });
  useEffect(() => {
    const disconnect = connectReaderSession(store, actor, { inReader, isSample });
    void store.load();
    return disconnect;
  }, [store, actor, inReader, isSample]);

  const { reading } = store.select(isSample);
  const { chapter } = snapshot.context;
  const selection = currentPlayback(snapshot.context);
  const actions = useMemo(() => {
    const pause = () => send({ type: "PAUSE" });
    return {
      pause,
      play: () => send({ type: "PLAY" }),
      togglePlay: () => send({ type: "TOGGLE" }),
      seek: (index: number) => send({ type: "SEEK", index }),
      replay: () => send({ type: "REPLAY" }),
      setWpm: store.setWpm,
      openReading: (id: string) => {
        pause();
        store.openReading(id);
      },
      openChapter: (id: string) => {
        pause();
        store.openChapter(actor.getSnapshot().context.readingId, id);
      },
      continueAfterBlock: (blockId: string) => send({ type: "CONTINUE", blockId }),
      removeReading: (id: string) => {
        pause();
        store.removeReading(id);
      },
      addReading: (reading: Reading) => {
        pause();
        store.addReading(reading);
      },
      replace: (text: string, title: string) => {
        pause();
        store.replace(text, title);
      },
      restore: (incoming: Library) => {
        pause();
        return store.restore(incoming);
      },
    };
  }, [actor, send, store]);

  return {
    ...selection,
    ...actions,
    library: state.library,
    ready: state.ready,
    saving: state.saving,
    storageError: state.storageError,
    reading,
    chapter,
    chapterIndex: Math.max(
      0,
      reading.chapters.findIndex((item) => item.id === chapter.id),
    ),
    isSample,
    context: selection.current.context,
    wordCount: selection.words.filter((word) => !word.context).length,
    title: reading.title,
    wpm: state.library.wpm,
    playing: snapshot.matches("playing"),
  };
}

const ReaderContext = createContext<ReturnType<typeof useReaderState> | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const reader = useReaderState();
  return <ReaderContext value={reader}>{children}</ReaderContext>;
}

export function useReader() {
  const reader = useContext(ReaderContext);
  if (!reader) throw new Error("useReader must be used within ReaderProvider");
  return reader;
}
