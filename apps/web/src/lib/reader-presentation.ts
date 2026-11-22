import { assign, setup } from "xstate";

export type ReaderView = "article" | "guided" | "focus";
export type WordFlight = {
  word: string;
  left: number;
  top: number;
  targetLeft: number;
  targetTop: number;
  size: number;
  targetSize: number;
};
type PresentationEvent =
  | { type: "VIEW_CHANGED"; view: ReaderView; atContext: boolean; playAfter: boolean }
  | { type: "SHOW_VIEW"; view: ReaderView }
  | { type: "FLIGHT_MEASURED"; id: number; flight: WordFlight }
  | { type: "TRANSITION_FINISHED"; id: number }
  | { type: "INTERRUPT" };

export const readerPresentationMachine = setup({
  types: {
    context: {} as { view: ReaderView; flight: WordFlight | null; transitionId: number },
    events: {} as PresentationEvent,
  },
  actions: {
    pause: () => {},
    play: () => {},
    changeView: assign(({ context, event }) =>
      event.type === "VIEW_CHANGED" || event.type === "SHOW_VIEW"
        ? { view: event.view, flight: null, transitionId: context.transitionId + 1 }
        : {},
    ),
    clearFlight: assign({ flight: null }),
  },
  guards: {
    sameView: ({ context, event }) => event.type === "VIEW_CHANGED" && event.view === context.view,
    instant: ({ context, event }) =>
      event.type === "VIEW_CHANGED" &&
      (event.atContext || (context.view !== "focus" && event.view !== "focus")),
    autoplay: ({ event }) => event.type === "VIEW_CHANGED" && event.playAfter,
    currentTransition: ({ context, event }) =>
      (event.type === "TRANSITION_FINISHED" || event.type === "FLIGHT_MEASURED") &&
      event.id === context.transitionId,
  },
}).createMachine({
  id: "readerPresentation",
  context: { view: "article", flight: null, transitionId: 0 },
  initial: "settled",
  on: {
    INTERRUPT: { actions: "pause" },
    SHOW_VIEW: { target: ".settled", actions: "changeView" },
  },
  states: {
    settled: {
      on: {
        VIEW_CHANGED: [
          { guard: "sameView" },
          { guard: "instant", actions: ["pause", "changeView"] },
          { guard: "autoplay", target: "transitioning.autoplay", actions: ["pause", "changeView"] },
          { target: "transitioning.paused", actions: ["pause", "changeView"] },
        ],
      },
    },
    transitioning: {
      initial: "paused",
      on: {
        FLIGHT_MEASURED: {
          guard: "currentTransition",
          actions: assign({ flight: ({ event }) => event.flight }),
        },
      },
      states: {
        autoplay: {
          on: {
            INTERRUPT: { target: "paused", actions: "pause" },
            TRANSITION_FINISHED: {
              guard: "currentTransition",
              target: "#readerPresentation.settled",
              actions: ["clearFlight", "play"],
            },
          },
        },
        paused: {
          on: {
            TRANSITION_FINISHED: {
              guard: "currentTransition",
              target: "#readerPresentation.settled",
              actions: "clearFlight",
            },
          },
        },
      },
    },
  },
});
