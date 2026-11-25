import { afterEach, describe, expect, it, vi } from "vitest";
import { createActor, fromCallback } from "xstate";
import type { ActorRefFrom } from "xstate";
import { currentPlayback, playbackMachine } from "./playback-machine";
import { initialPosition, textReading, type Reading } from "@still/reader-core";

const actors = new Set<ActorRefFrom<typeof playbackMachine>>();
afterEach(() => {
  actors.forEach((actor) => actor.stop());
  actors.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const book = () => textReading("One two three four five six.", "Reading", "reading");
function start(options: { reading?: Reading; realTimer?: boolean; available?: boolean } = {}) {
  const reading = options.reading ?? book();
  const cancelled = vi.fn();
  const durations: number[] = [];
  const actor = createActor(
    playbackMachine.provide({
      actors: {
        visibility: fromCallback(() => {}),
        ...(options.realTimer
          ? {}
          : {
              wordTimer: fromCallback(({ input }: { input: { duration: number } }) => {
                durations.push(input.duration);
                return cancelled;
              }),
            }),
      },
    }),
    {
      input: {
        readingId: reading.id,
        chapter: reading.chapters[0],
        position: initialPosition(reading),
        wpm: 250,
        available: options.available ?? true,
      },
    },
  ).start();
  actors.add(actor);
  return { actor, cancelled, durations };
}
const selection = (actor: ActorRefFrom<typeof playbackMachine>) =>
  currentPlayback(actor.getSnapshot().context);

describe("reader lifecycle", () => {
  it("ignores playback and position edits while unavailable", () => {
    const { actor, durations } = start({ available: false });
    actor.send({ type: "PLAY" });
    actor.send({ type: "SEEK", index: 4 });
    expect(selection(actor).index).toBe(0);
    expect(durations).toEqual([]);
    actor.send({ type: "AVAILABILITY_CHANGED", available: true });
    expect(actor.getSnapshot().matches("paused")).toBe(true);
  });

  it("seeking cancels the timer and ignores a late tick; resuming and changing pace get fresh intervals", () => {
    const { actor, cancelled, durations } = start();
    actor.send({ type: "PLAY" });
    actor.send({ type: "SEEK", index: 3 });
    expect(cancelled).toHaveBeenCalledTimes(1);
    actor.send({ type: "TICK" });
    expect(selection(actor).index).toBe(3);
    actor.send({ type: "PLAY" });
    actor.send({ type: "PACE_CHANGED", wpm: 500 });
    expect(durations).toEqual([240, 240, 120]);
    expect(cancelled).toHaveBeenCalledTimes(2);
    actor.send({ type: "TICK" });
    expect(selection(actor).index).toBe(4);
    actor.stop();
    expect(cancelled).toHaveBeenCalledTimes(4);
  });

  it("a delayed animation frame advances only one word and pause cancels scheduled work", () => {
    let now = 0;
    let id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
    const frame = (time: number) => {
      now = time;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    };
    const { actor } = start({ realTimer: true });
    actor.send({ type: "PLAY" });
    frame(239);
    expect(selection(actor).index).toBe(0);
    frame(2400);
    expect(selection(actor).index).toBe(1);
    actor.send({ type: "PAUSE" });
    expect(frames.size).toBe(0);
    frame(5000);
    actor.send({ type: "PLAY" });
    frame(5239);
    expect(selection(actor).index).toBe(1);
    frame(5240);
    expect(selection(actor).index).toBe(2);
  });

  it("hiding or leaving the reader blocks playback until an explicit play in a visible reader", () => {
    const { actor } = start();
    actor.send({ type: "PLAY" });
    // An initial pageshow while already visible must not interrupt playback.
    actor.send({ type: "VISIBILITY_CHANGED", visible: true });
    expect(actor.getSnapshot().matches("playing")).toBe(true);
    actor.send({ type: "VISIBILITY_CHANGED", visible: false });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK" });
    expect(selection(actor).index).toBe(0);
    actor.send({ type: "VISIBILITY_CHANGED", visible: true });
    expect(actor.getSnapshot().matches("paused")).toBe(true);
    actor.send({ type: "PLAY" });
    actor.send({ type: "AVAILABILITY_CHANGED", available: false });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK" });
    actor.send({ type: "AVAILABILITY_CHANGED", available: true });
    expect(actor.getSnapshot().matches("paused")).toBe(true);
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK" });
    expect(selection(actor).index).toBe(1);
  });

  it("pauses at every adjacent context stop, marks completion, and restarts without skipping a leading block", () => {
    const reading: Reading = {
      ...book(),
      chapters: [
        {
          id: "chapter",
          title: "Chapter",
          blocks: [
            { id: "intro", type: "text", text: "Before" },
            { id: "first", type: "unsupported", label: "First", reason: "Unavailable" },
            { id: "second", type: "unsupported", label: "Second", reason: "Unavailable" },
          ],
        },
      ],
    };
    const { actor } = start({ reading });
    actor.send({ type: "PLAY" });
    actor.send({ type: "TICK" });
    expect(selection(actor).current.context?.id).toBe("first");
    actor.send({ type: "TOGGLE" });
    actor.send({ type: "TICK" });
    expect(selection(actor).index).toBe(1);
    actor.send({ type: "CONTINUE", blockId: "missing" });
    expect(selection(actor).index).toBe(1);
    actor.send({ type: "CONTINUE", blockId: "first" });
    expect(actor.getSnapshot().matches("context")).toBe(true);
    expect(selection(actor).current.context?.id).toBe("second");
    actor.send({ type: "CONTINUE", blockId: "second" });
    expect(selection(actor).finished).toBe(true);
    const startsWithContext = {
      ...reading,
      chapters: [{ ...reading.chapters[0], blocks: reading.chapters[0].blocks.slice(1) }],
    };
    actor.send({
      type: "LOAD",
      selection: {
        ...actor.getSnapshot().context,
        chapter: startsWithContext.chapters[0],
        position: { ...initialPosition(startsWithContext), finished: true },
      },
    });
    actor.send({ type: "TOGGLE" });
    expect(selection(actor).finished).toBe(false);
    expect(selection(actor).index).toBe(0);
    expect(actor.getSnapshot().matches("context")).toBe(true);
  });
});
