import { afterEach, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import type { ActorRefFrom } from "xstate";
import { readerPresentationMachine } from "./reader-presentation";

const actors = new Set<ActorRefFrom<typeof readerPresentationMachine>>();
afterEach(() => {
  actors.forEach((actor) => actor.stop());
  actors.clear();
});
function start() {
  const pause = vi.fn();
  const play = vi.fn();
  const actor = createActor(
    readerPresentationMachine.provide({ actions: { pause, play } }),
  ).start();
  actors.add(actor);
  return { actor, pause, play };
}
const focusAndPlay = {
  type: "VIEW_CHANGED",
  view: "focus",
  atContext: false,
  playAfter: true,
} as const;

it("changes between Article and Guided immediately without starting playback", () => {
  const { actor, play, pause } = start();
  actor.send({ type: "VIEW_CHANGED", view: "guided", atContext: false, playAfter: false });
  expect(actor.getSnapshot().context.view).toBe("guided");
  expect(actor.getSnapshot().matches("settled")).toBe(true);
  actor.send({ type: "VIEW_CHANGED", view: "guided", atContext: false, playAfter: false });
  expect(pause).toHaveBeenCalledTimes(1);
  expect(play).not.toHaveBeenCalled();
});

it("starts playback once only after the requested flight completes", () => {
  const { actor, play } = start();
  actor.send(focusAndPlay);
  const id = actor.getSnapshot().context.transitionId;
  actor.send({ ...focusAndPlay, view: "guided" });
  expect(actor.getSnapshot().context.view).toBe("focus");
  expect(play).not.toHaveBeenCalled();
  actor.send({ type: "TRANSITION_FINISHED", id });
  actor.send({ type: "TRANSITION_FINISHED", id });
  expect(play).toHaveBeenCalledTimes(1);
});

it("an interruption permanently cancels autoplay until a new play request", () => {
  const { actor, play, pause } = start();
  actor.send(focusAndPlay);
  const id = actor.getSnapshot().context.transitionId;
  actor.send({ type: "INTERRUPT" });
  expect(actor.getSnapshot().matches({ transitioning: "paused" })).toBe(true);
  actor.send({ type: "TRANSITION_FINISHED", id });
  expect(actor.getSnapshot().matches("settled")).toBe(true);
  expect(play).not.toHaveBeenCalled();
  expect(pause).toHaveBeenCalledTimes(2);
});

it("a completion from an abandoned flight cannot finish a newer transition or start playback", () => {
  const { actor, play } = start();
  actor.send(focusAndPlay);
  const oldId = actor.getSnapshot().context.transitionId;
  actor.send({ type: "SHOW_VIEW", view: "article" });
  actor.send(focusAndPlay);
  actor.send({ type: "TRANSITION_FINISHED", id: oldId });
  expect(actor.getSnapshot().matches({ transitioning: "autoplay" })).toBe(true);
  expect(play).not.toHaveBeenCalled();
  actor.send({ type: "TRANSITION_FINISHED", id: actor.getSnapshot().context.transitionId });
  expect(play).toHaveBeenCalledTimes(1);
});

it("viewing a context block changes surfaces without a flight or autoplay", () => {
  const { actor, play } = start();
  actor.send({ ...focusAndPlay, atContext: true });
  expect(actor.getSnapshot().matches("settled")).toBe(true);
  actor.send({ type: "TRANSITION_FINISHED", id: actor.getSnapshot().context.transitionId });
  expect(play).not.toHaveBeenCalled();
});
