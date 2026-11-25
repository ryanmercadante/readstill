import { afterEach, expect, it, vi } from "vitest";
import { createActor, fromCallback } from "xstate";
import { createLibraryStore } from "./library-store";
import type { Library } from "./library";
import type { StoredLibrary } from "./library-storage";
import { playbackMachine, currentPlayback } from "./playback-machine";
import { connectReaderSession } from "./reader-session";
import { initialPosition, textReading } from "@still/reader-core";

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((stop) => stop()));
async function start() {
  const save = vi.fn(async (library: Library, previous: StoredLibrary) => ({
    library,
    revision: previous.revision + 1,
  }));
  const reading = textReading("One two three four five.", "Reading", "reading");
  const store = createLibraryStore({
    load: async () => ({
      library: {
        readings: [reading],
        positions: { reading: initialPosition(reading) },
        activeId: reading.id,
        wpm: 250,
      },
      revision: 1,
    }),
    save,
  });
  const actor = createActor(
    playbackMachine.provide({
      actors: {
        visibility: fromCallback(() => {}),
        wordTimer: fromCallback(() => {}),
      },
    }),
    { input: { ...store.select(false), wpm: 250, available: false } },
  ).start();
  const connect = (isSample = false, inReader = true) => {
    const disconnect = connectReaderSession(store, actor, { isSample, inReader });
    cleanup.push(disconnect);
    return disconnect;
  };
  const disconnect = connect();
  cleanup.push(() => actor.stop());
  await store.load();
  return { store, actor, connect, disconnect, save };
}

it("holds the cursor in memory while playing and saves once playback stops", async () => {
  const { store, actor, save } = await start();
  actor.send({ type: "PLAY" });
  actor.send({ type: "TICK" });
  actor.send({ type: "TICK" });
  expect(store.select(false).position.index).toBe(2);
  expect(store.getSnapshot().saving).toBe(false);
  expect(save).not.toHaveBeenCalled();
  store.setWpm(500);
  expect(actor.getSnapshot().context.wpm).toBe(500);
  expect(actor.getSnapshot().matches("playing")).toBe(true);
  await vi.waitFor(() => expect(store.getSnapshot().saving).toBe(false));
  expect(save).toHaveBeenCalledTimes(1);
  actor.send({ type: "TICK" });
  expect(save).toHaveBeenCalledTimes(1);
  actor.send({ type: "PAUSE" });
  expect(store.getSnapshot().saving).toBe(true);
  await vi.waitFor(() => expect(store.getSnapshot().saving).toBe(false));
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][0].positions.reading.index).toBe(3);
  expect(actor.getSnapshot().matches("paused")).toBe(true);
});

it("switches between sample and saved progress, pauses on departure, and reconnects safely", async () => {
  const { store, actor, connect, disconnect } = await start();
  actor.send({ type: "SEEK", index: 2 });
  disconnect();
  const stopSample = connect(true);
  actor.send({ type: "SEEK", index: 4 });
  expect(store.select(false).position.index).toBe(2);
  stopSample();
  const stopReading = connect();
  expect(currentPlayback(actor.getSnapshot().context).index).toBe(2);
  actor.send({ type: "PLAY" });
  stopReading();
  const stopAway = connect(false, false);
  expect(actor.getSnapshot().matches("paused")).toBe(true);
  actor.send({ type: "PLAY" });
  expect(actor.getSnapshot().matches("paused")).toBe(true);
  stopAway();
  connect(true);
  expect(currentPlayback(actor.getSnapshot().context).index).toBe(4);
  expect(actor.getSnapshot().matches("paused")).toBe(true);
});
