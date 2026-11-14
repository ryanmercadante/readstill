import "fake-indexeddb/auto";
import { get, set, createStore } from "idb-keyval";
import { expect, it, vi } from "vitest";
import { loadLibrary, saveLibrary } from "./library-storage";
import { initialPosition, textReading } from "./library";

it("migrates once, saves books and positions atomically, and refuses stale-tab overwrites", async () => {
  await set("still.current-reading.v1", {
    version: 1,
    text: "My original passage.",
    title: "Original",
    index: 1,
    wpm: 325,
  });
  const first = await loadLibrary();
  expect(first.library.readings[0].title).toBe("Original");
  const reading = textReading("A new reading for tomorrow.", "Tomorrow", "tomorrow");
  const next = {
    ...first.library,
    readings: [...first.library.readings, reading],
    positions: { ...first.library.positions, tomorrow: initialPosition(reading) },
    activeId: reading.id,
  };
  const saved = await saveLibrary(next, first);
  expect((await loadLibrary()).library).toEqual(next);
  expect(await get("still.current-reading.v1")).toMatchObject({ title: "Original", index: 1 });
  const moved = {
    ...next,
    positions: { ...next.positions, tomorrow: { ...next.positions.tomorrow, index: 3 } },
  };
  const progressed = await saveLibrary(moved, saved);
  await expect(saveLibrary(next, saved)).rejects.toThrow("another tab");
  expect((await loadLibrary()).library.positions.tomorrow.index).toBe(3);
  const db = createStore("still-library", "records");
  const failedReading = textReading("This must not be partially saved.", "Failed import", "failed");
  const attempted = {
    ...moved,
    readings: [...moved.readings, failedReading],
    positions: { ...moved.positions, failed: initialPosition(failedReading) },
  };
  const originalPut = IDBObjectStore.prototype.put;
  const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
    this: IDBObjectStore,
    value,
    key,
  ) {
    if (key === "position:failed") throw new DOMException("Storage full", "QuotaExceededError");
    return originalPut.call(this, value, key);
  });
  try {
    await expect(saveLibrary(attempted, progressed)).rejects.toThrow("Storage full");
  } finally {
    put.mockRestore();
  }
  expect(await get("reading:failed", db)).toBeUndefined();
  expect((await loadLibrary()).library).toEqual(moved);
  const empty = { ...next, readings: [], positions: {}, activeId: null };
  await saveLibrary(empty, progressed);
  expect((await loadLibrary()).library.readings).toEqual([]);
  expect(await get("reading:tomorrow", db)).toBeUndefined();
  expect(await get("position:tomorrow", db)).toBeUndefined();
  await set("settings", { activeId: "missing", wpm: 300, revision: 50 }, db);
  await expect(loadLibrary()).rejects.toThrow();
  expect(await get("settings", db)).toEqual({ activeId: "missing", wpm: 300, revision: 50 });
  const oldReading = {
    id: "old-book",
    title: "Old book",
    author: "",
    kind: "epub",
    addedAt: 0,
    chapters: [
      {
        id: "c",
        title: "One",
        text: "First paragraph.\n\nSecond paragraph here.",
        images: [{ beforeParagraph: 1, src: "data:image/png;base64,YQ==", alt: "Picture" }],
      },
    ],
  };
  await set("reading:old-book", oldReading, db);
  await set("position:old-book", { chapterId: "c", index: 3, finished: false, updatedAt: 7 }, db);
  await set("settings", { activeId: "old-book", wpm: 300, revision: 60 }, db);
  // A migration must roll back its rewritten content if a later record fails.
  const migrationPut = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
    this: IDBObjectStore,
    value,
    key,
  ) {
    if (key === "position:old-book") throw new DOMException("Storage full", "QuotaExceededError");
    return originalPut.call(this, value, key);
  });
  try {
    await expect(loadLibrary()).rejects.toThrow("Storage full");
  } finally {
    migrationPut.mockRestore();
  }
  expect(await get("reading:old-book", db)).toEqual(oldReading);
  expect(await get("settings", db)).toEqual({ activeId: "old-book", wpm: 300, revision: 60 });
  const migrated = await loadLibrary();
  expect(migrated.library.positions["old-book"]).toMatchObject({ blockId: "p1", index: 1 });
  expect(migrated.revision).toBe(61);
  expect(await get("settings", db)).toMatchObject({ schemaVersion: 2, revision: 61 });
  expect((await loadLibrary()).revision).toBe(61);
});
