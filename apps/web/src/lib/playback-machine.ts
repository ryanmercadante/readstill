import { assign, fromCallback, raise, setup } from "xstate";
import type { Chapter, Position } from "./library";
import { chapterSequence, positionAt, sequenceIndex } from "./reader-document";
import { wordDuration } from "./reader";

export type PlaybackInput = {
  readingId: string | null;
  chapter: Chapter;
  position: Position;
  wpm: number;
  available: boolean;
};
type PlaybackContext = PlaybackInput & { visible: boolean };
type PlaybackEvent =
  | { type: "LOAD"; selection: PlaybackInput }
  | { type: "AVAILABILITY_CHANGED"; available: boolean }
  | { type: "VISIBILITY_CHANGED"; visible: boolean }
  | { type: "PAUSE" }
  | { type: "PLAY" }
  | { type: "TOGGLE" }
  | { type: "TICK" }
  | { type: "RETIME" }
  | { type: "SEEK"; index: number }
  | { type: "REPLAY" }
  | { type: "CONTINUE"; blockId: string }
  | { type: "PACE_CHANGED"; wpm: number };

export function currentPlayback(context: PlaybackInput) {
  const words = chapterSequence(context.chapter);
  const index = Math.max(0, sequenceIndex(context.chapter, context.position));
  return { words, index, current: words[index] ?? words[0], finished: context.position.finished };
}
const move = (context: PlaybackContext, index: number, finished = false) => ({
  position: positionAt(context.chapter, index, finished),
});

/** Playback owns the live cursor and timer, not library data or storage. */
export const playbackMachine = setup({
  types: {
    context: {} as PlaybackContext,
    input: {} as PlaybackInput,
    events: {} as PlaybackEvent,
  },
  actors: {
    wordTimer: fromCallback<PlaybackEvent, { duration: number }>(({ input, sendBack }) => {
      const start = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        if (now - start >= input.duration) sendBack({ type: "TICK" });
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }),
    visibility: fromCallback<PlaybackEvent>(({ sendBack }) => {
      const changed = () => sendBack({ type: "VISIBILITY_CHANGED", visible: !document.hidden });
      const hidden = () => sendBack({ type: "VISIBILITY_CHANGED", visible: false });
      document.addEventListener("visibilitychange", changed);
      window.addEventListener("pagehide", hidden);
      window.addEventListener("pageshow", changed);
      changed();
      return () => {
        document.removeEventListener("visibilitychange", changed);
        window.removeEventListener("pagehide", hidden);
        window.removeEventListener("pageshow", changed);
      };
    }),
  },
  guards: {
    available: ({ context }) => context.available,
    canPlay: ({ context }) => context.available && context.visible,
    finished: ({ context }) => context.position.finished,
    atContext: ({ context }) => !!currentPlayback(context).current.context,
    lastWord: ({ context }) => {
      const { index, words } = currentPlayback(context);
      return index === words.length - 1;
    },
    nextIsContext: ({ context }) => {
      const { index, words } = currentPlayback(context);
      return !!words[index + 1]?.context;
    },
    validContext: ({ context, event }) =>
      event.type === "CONTINUE" &&
      context.available &&
      currentPlayback(context).words.some(
        (entry) => entry.blockId === event.blockId && entry.context,
      ),
  },
  actions: {
    seek: assign(({ context, event }) => (event.type === "SEEK" ? move(context, event.index) : {})),
    replay: assign(({ context }) => move(context, currentPlayback(context).current.sentenceStart)),
    advance: assign(({ context }) => move(context, currentPlayback(context).index + 1)),
    finish: assign(({ context }) => move(context, currentPlayback(context).index, true)),
    restart: assign(({ context }) => move(context, 0)),
    continue: assign(({ context, event }) => {
      if (event.type !== "CONTINUE") return {};
      const { words } = currentPlayback(context);
      const from = words.findIndex((entry) => entry.blockId === event.blockId);
      return move(context, Math.min(from + 1, words.length - 1), from === words.length - 1);
    }),
  },
}).createMachine({
  id: "playback",
  context: ({ input }) => ({ ...input, visible: true }),
  invoke: { src: "visibility" },
  initial: "resting",
  on: {
    LOAD: { target: ".resting", actions: assign(({ event }) => event.selection) },
    AVAILABILITY_CHANGED: {
      target: ".resting",
      actions: assign({ available: ({ event }) => event.available }),
    },
    VISIBILITY_CHANGED: [
      {
        guard: ({ event }) => !event.visible,
        target: ".resting",
        actions: assign({ visible: false }),
      },
      { actions: assign({ visible: true }) },
    ],
    PAUSE: ".resting",
    SEEK: { guard: "available", target: ".resting", actions: "seek" },
    REPLAY: { guard: "available", target: ".resting", actions: "replay" },
    CONTINUE: { guard: "validContext", target: ".continuing", actions: "continue" },
    PACE_CHANGED: {
      actions: [assign({ wpm: ({ event }) => event.wpm }), raise({ type: "RETIME" })],
    },
  },
  states: {
    resting: {
      always: [
        { guard: "finished", target: "finished" },
        { guard: "atContext", target: "context" },
        { target: "paused" },
      ],
    },
    paused: {
      on: {
        TOGGLE: { guard: "canPlay", target: "playing" },
        PLAY: { guard: "canPlay", target: "playing" },
      },
    },
    context: {},
    finished: {
      on: {
        TOGGLE: { guard: "canPlay", target: "continuing", actions: "restart" },
        PLAY: { guard: "canPlay", target: "continuing", actions: "restart" },
      },
    },
    continuing: {
      always: [
        { guard: "finished", target: "finished" },
        { guard: "atContext", target: "context" },
        { guard: "canPlay", target: "playing" },
        { target: "paused" },
      ],
    },
    playing: {
      invoke: {
        src: "wordTimer",
        input: ({ context }) => ({
          duration: wordDuration(currentPlayback(context).current, context.wpm),
        }),
      },
      on: {
        TOGGLE: "paused",
        RETIME: { target: "playing", reenter: true },
        TICK: [
          { guard: "lastWord", target: "finished", actions: "finish" },
          { guard: "nextIsContext", target: "context", actions: "advance" },
          { target: "playing", reenter: true, actions: "advance" },
        ],
      },
    },
  },
});
