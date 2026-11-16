import type { ActorRefFrom } from "xstate";
import type { createLibraryStore } from "./library-store";
import type { playbackMachine } from "./playback-machine";

/** Connect saved checkpoints to the live cursor without replaying storage notifications as seeks. */
export function connectReaderSession(
  store: ReturnType<typeof createLibraryStore>,
  actor: ActorRefFrom<typeof playbackMachine>,
  route: { inReader: boolean; isSample: boolean },
) {
  const sync = () => {
    const state = store.getSnapshot();
    const selection = store.select(route.isSample);
    const current = actor.getSnapshot().context;
    const available = state.ready && route.inReader && selection.readingId !== null;
    if (
      current.readingId !== selection.readingId ||
      current.chapter !== selection.chapter ||
      current.position !== selection.position
    ) {
      actor.send({ type: "LOAD", selection: { ...selection, wpm: state.library.wpm, available } });
    } else {
      if (current.wpm !== state.library.wpm)
        actor.send({ type: "PACE_CHANGED", wpm: state.library.wpm });
      if (current.available !== available) actor.send({ type: "AVAILABILITY_CHANGED", available });
    }
  };
  // Subscribe to committed snapshots: during a machine action getSnapshot() would still
  // expose the previous cursor, causing the store notification to issue a spurious LOAD.
  // While playing, the cursor moves every word; keep it in memory and write it once
  // playback stops (pause, finish, a context stop, leaving, or the page hiding).
  const playback = actor.subscribe((snapshot) =>
    store.recordPosition(
      snapshot.context.readingId,
      snapshot.context.position,
      !snapshot.matches("playing"),
    ),
  );
  const unsubscribe = store.subscribe(sync);
  sync();
  return () => {
    playback.unsubscribe();
    unsubscribe();
  };
}
