import { useSyncExternalStore } from "react";

/** Matches the mobile navigation breakpoint, where overlays become bottom sheets. */
const COMPACT_QUERY = "(max-width: 800px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useCompactViewport() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
}
