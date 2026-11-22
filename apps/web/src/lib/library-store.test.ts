import { expect, it, vi } from "vitest";
import { createLibraryStore } from "./library-store";
import { initialPosition, sampleReading, textReading } from "./library";
import type { Library } from "./library";
import type { StoredLibrary } from "./library-storage";
import { positionAt } from "./reader-document";

const book = textReading("One two three four five six.", "Reading", "reading");
const libraryFor = (): Library => ({
  readings: [book],
  positions: { [book.id]: initialPosition(book) },
  activeId: book.id,
  wpm: 250,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function start(
  options: {
    load?: () => Promise<StoredLibrary>;
    save?: (library: Library, previous: StoredLibrary) => Promise<StoredLibrary>;
  } = {},
) {
  const load = vi.fn(options.load ?? (async () => ({ library: libraryFor(), revision: 4 })));
  const save = vi.fn(
    options.save ?? (async (library, previous) => ({ library, revision: previous.revision + 1 })),
  );
  const requestPersistence = vi.fn(async () => true);
  return {
    store: createLibraryStore({ load, save, requestPersistence }),
    load,
    save,
    requestPersistence,
  };
}
const emptyLibrary = (): StoredLibrary => ({
  library: { readings: [], positions: {}, activeId: null, wpm: 250 },
  revision: 0,
});

it("loads once on demand, including when the provider effect reconnects", async () => {
  const pending = deferred<StoredLibrary>();
  const { store, load } = start({ load: () => pending.promise });
  expect(load).not.toHaveBeenCalled();
  expect(store.select(false).position).toBe(store.select(false).position);
  const first = store.load();
  expect(store.load()).toBe(first);
  expect(load).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot().ready).toBe(false);
  pending.resolve({ library: libraryFor(), revision: 4 });
  await first;
  expect(store.getSnapshot().ready).toBe(true);
  await store.load();
  expect(load).toHaveBeenCalledTimes(1);
});

it("keeps sample progress separate from the saved reading and never persists it", async () => {
  const { store, save } = start();
  await store.load();
  const original = store.getSnapshot().library;
  store.recordPosition(sampleReading.id, positionAt(sampleReading.chapters[0], 4));
  expect(store.select(true).position.index).toBe(4);
  expect(store.select(false).position.index).toBe(0);
  expect(store.getSnapshot().library).toBe(original);
  expect(save).not.toHaveBeenCalled();
});

it("serializes writes and drains the latest edits without replacing them with older completions", async () => {
  const first = deferred<StoredLibrary>();
  const second = deferred<StoredLibrary>();
  let calls = 0;
  const { store, save } = start({ save: () => (++calls === 1 ? first.promise : second.promise) });
  await store.load();
  store.recordPosition(book.id, positionAt(book.chapters[0], 1));
  const initialWrite = save.mock.calls[0][0];
  store.recordPosition(book.id, positionAt(book.chapters[0], 2));
  store.recordPosition(book.id, positionAt(book.chapters[0], 4));
  expect(save).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot().saving).toBe(true);
  first.resolve({ library: initialWrite, revision: 5 });
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(store.select(false).position.index).toBe(4);
  expect(store.getSnapshot().saving).toBe(true);
  const [latestWrite, previous] = save.mock.calls[1];
  expect(latestWrite.positions.reading.index).toBe(4);
  expect(previous.revision).toBe(5);
  second.resolve({ library: latestWrite, revision: 6 });
  await vi.waitFor(() => expect(store.getSnapshot().saving).toBe(false));
  expect(store.getSnapshot().library).toBe(latestWrite);
});

it("keeps failed saves exportable and retries only after a later edit", async () => {
  const { store, save } = start({
    save: async () => {
      throw new Error("Storage full");
    },
  });
  await store.load();
  store.recordPosition(book.id, positionAt(book.chapters[0], 3));
  await vi.waitFor(() => expect(store.getSnapshot().storageError).toContain("couldn't save"));
  expect(store.select(false).position.index).toBe(3);
  expect(store.getSnapshot().saving).toBe(false);
  expect(save).toHaveBeenCalledTimes(1);
  save.mockImplementation(async (library, previous) => ({
    library,
    revision: previous.revision + 1,
  }));
  store.recordPosition(book.id, positionAt(book.chapters[0], 4));
  await vi.waitFor(() => expect(store.getSnapshot().storageError).toBe(""));
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][1].revision).toBe(4);
});

it("keeps editing available after a failed load without overwriting unread saved data", async () => {
  const { store, save } = start({
    load: async () => {
      throw new Error("Read failed");
    },
  });
  await store.load();
  store.addReading(book);
  store.recordPosition(book.id, positionAt(book.chapters[0], 3));
  store.setWpm(500);
  expect(store.select(false).position.index).toBe(3);
  expect(store.getSnapshot().storageError).toContain("couldn't be opened");
  expect(store.getSnapshot().ready).toBe(true);
  expect(save).not.toHaveBeenCalled();
});

it("asks the browser to keep storage once, after the first reading is saved", async () => {
  const { store, save, requestPersistence } = start({ load: async () => emptyLibrary() });
  await store.load();
  store.setWpm(300);
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(requestPersistence).not.toHaveBeenCalled();

  store.addReading(book);
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(requestPersistence).toHaveBeenCalledTimes(1);

  store.recordPosition(book.id, positionAt(book.chapters[0], 2));
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(3));
  expect(requestPersistence).toHaveBeenCalledTimes(1);
});

it("waits for a successful save before asking to keep storage", async () => {
  const { store, save, requestPersistence } = start({
    load: async () => emptyLibrary(),
    save: async () => {
      throw new Error("Quota exceeded");
    },
  });
  await store.load();
  store.addReading(book);
  await vi.waitFor(() => expect(store.getSnapshot().storageError).toContain("couldn't save"));
  expect(requestPersistence).not.toHaveBeenCalled();

  save.mockImplementation(async (library, previous) => ({
    library,
    revision: previous.revision + 1,
  }));
  store.setWpm(320);
  await vi.waitFor(() => expect(store.getSnapshot().storageError).toBe(""));
  expect(requestPersistence).toHaveBeenCalledTimes(1);
});
