import { afterEach, expect, it, vi } from "vitest";
import { createActor, fromCallback } from "xstate";
import { createLibraryStore } from "./library-store";
import { initialPosition, textReading } from "./library";
import { playbackMachine, currentPlayback } from "./playback-machine";
import { connectReaderSession } from "./reader-session";

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((stop) => stop()));
async function start() {
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
    save: async (library, previous) => ({ library, revision: previous.revision + 1 }),
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
  return { store, actor, connect, disconnect };
}

it("checkpoints each word without pausing playback when the save completes", async () => {
  const { store, actor } = await start();
  actor.send({ type: "PLAY" });
  actor.send({ type: "TICK" });
  expect(store.select(false).position.index).toBe(1);
  expect(store.getSnapshot().saving).toBe(true);
  await vi.waitFor(() => expect(store.getSnapshot().saving).toBe(false));
  expect(actor.getSnapshot().matches("playing")).toBe(true);
  actor.send({ type: "TICK" });
  expect(currentPlayback(actor.getSnapshot().context).index).toBe(2);
  store.setWpm(500);
  expect(actor.getSnapshot().context.wpm).toBe(500);
  expect(actor.getSnapshot().matches("playing")).toBe(true);
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
