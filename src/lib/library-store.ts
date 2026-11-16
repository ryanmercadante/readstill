import {
  assertLibraryCapacity,
  initialPosition,
  MAX_READINGS,
  mergeLibrary,
  sampleReading,
  textReading,
} from "./library";
import type { Library, Position, Reading } from "./library";
import { positionAt } from "./reader-document";
import { loadLibrary, saveLibrary } from "./library-storage";
import type { StoredLibrary } from "./library-storage";

type LibraryState = {
  library: Library;
  samplePosition: Position;
  ready: boolean;
  saving: boolean;
  storageError: string;
};
type Storage = { load: () => Promise<StoredLibrary>; save: typeof saveLibrary };

/** One browser session's editable library; constructing it performs no IO. */
export function createLibraryStore(storage: Storage = { load: loadLibrary, save: saveLibrary }) {
  let state: LibraryState = {
    library: { readings: [], positions: {}, activeId: null, wpm: 250 },
    samplePosition: initialPosition(sampleReading),
    ready: false,
    saving: false,
    storageError: "",
  };
  let persisted: StoredLibrary | null = null;
  let loading: Promise<void> | undefined;
  let writing = false;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<LibraryState> = {}) => {
    const next = { ...state, ...patch };
    state = {
      ...next,
      // An in-flight write, not merely unsaved edits: positions recorded during playback
      // are held in memory until playback stops.
      saving: next.ready && !!persisted && writing && !next.storageError,
    };
    listeners.forEach((listener) => listener());
  };
  const persist = async () => {
    if (!persisted || writing || state.library === persisted.library) return;
    writing = true;
    publish();
    try {
      while (state.library !== persisted.library) {
        const attempted = state.library;
        let error = "";
        try {
          persisted = await storage.save(attempted, persisted);
        } catch (cause) {
          error =
            cause instanceof Error && cause.message.includes("another tab")
              ? cause.message
              : "This browser couldn't save your library. Export a backup before closing, then free browser storage and retry.";
        }
        // Publish the saved status, never an older copy of the editable library.
        publish({ storageError: error });
        if (error && state.library === attempted) break;
        // Edits made during the write are coalesced into the next transaction.
      }
    } finally {
      writing = false;
      publish();
    }
  };
  const update = (library: Library, save = true) => {
    if (library !== state.library) publish({ library });
    if (save) void persist();
  };
  const addReading = (reading: Reading) => {
    if (state.library.readings.length >= MAX_READINGS)
      throw new Error("Your library holds 100 readings. Remove one before adding another.");
    const next = {
      ...state.library,
      readings: [...state.library.readings, reading],
      positions: { ...state.library.positions, [reading.id]: initialPosition(reading) },
      activeId: reading.id,
    };
    assertLibraryCapacity(next);
    update(next);
  };
  /**
   * Move a reading's cursor. With `save: false` the position only changes in memory;
   * the next saving call (any edit, or recording with `save: true`) writes it.
   */
  const recordPosition = (id: string | null, position: Position, save = true) => {
    if (id === sampleReading.id) {
      if (state.samplePosition !== position) publish({ samplePosition: position });
    } else if (id && state.library.positions[id]) {
      update(
        state.library.positions[id] === position
          ? state.library
          : { ...state.library, positions: { ...state.library.positions, [id]: position } },
        save,
      );
    }
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load: () =>
      (loading ??= storage.load().then(
        (stored) => {
          persisted = stored;
          publish({ library: stored.library, ready: true });
        },
        () => {
          // With no trustworthy revision, this session must never write to storage.
          publish({
            ready: true,
            storageError:
              "Your saved library couldn't be opened. Reload to try again. New readings can be exported, but won't be saved in this session.",
          });
        },
      )),
    select: (isSample: boolean) => {
      const selected = isSample
        ? sampleReading
        : state.library.readings.find((item) => item.id === state.library.activeId);
      const reading = selected ?? sampleReading;
      const position = isSample
        ? state.samplePosition
        : (state.library.positions[reading.id] ?? state.samplePosition);
      const chapter =
        reading.chapters.find((item) => item.id === position.chapterId) ?? reading.chapters[0];
      return { readingId: selected?.id ?? null, reading, chapter, position };
    },
    recordPosition,
    setWpm: (wpm: number) => update({ ...state.library, wpm }),
    openReading: (id: string) => {
      if (state.library.readings.some((reading) => reading.id === id))
        update({ ...state.library, activeId: id });
    },
    openChapter: (readingId: string | null, chapterId: string) => {
      const reading =
        readingId === sampleReading.id
          ? sampleReading
          : state.library.readings.find((item) => item.id === readingId);
      const chapter = reading?.chapters.find((item) => item.id === chapterId);
      if (chapter) recordPosition(readingId, positionAt(chapter, 0));
    },
    removeReading: (id: string) => {
      const readings = state.library.readings.filter((item) => item.id !== id);
      const positions = { ...state.library.positions };
      delete positions[id];
      update({
        ...state.library,
        readings,
        positions,
        activeId:
          state.library.activeId === id ? (readings[0]?.id ?? null) : state.library.activeId,
      });
    },
    addReading,
    replace: (text: string, title: string) => addReading(textReading(text, title)),
    restore: (incoming: Library) => {
      const next = mergeLibrary(state.library, incoming);
      assertLibraryCapacity(next);
      const count = next.readings.length - state.library.readings.length;
      update(next);
      return count;
    },
  };
}
