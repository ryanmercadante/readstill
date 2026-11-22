# Reader state ownership

XState is limited to two workflows with meaningful transitions: playback and animated view changes. Library loading, edits, persistence, routing, and dialog visibility have separate owners. Existing EPUB normalization, IndexedDB transactions, backup schemas, and pacing calculations stay in their domain modules.

## Playback

`apps/web/src/lib/playback-machine.ts` owns the active chapter's live cursor and timer. Its stable states are `paused`, `playing`, `context`, and `finished`; `resting` and `continuing` are transient decisions. It receives an active selection, pace, and availability, not the whole library.

`PLAY`, `TOGGLE`, `PAUSE`, `SEEK`, `REPLAY`, and `CONTINUE` express reading actions. `LOAD` switches the selection and pauses. The session adapter supplies availability from library readiness and the current route. Page visibility is observed by an invoked actor. Leaving or hiding the reader pauses playback; returning never resumes it automatically.

A word timer exists only in `playing`. It uses requestAnimationFrame and the existing duration function, sends one `TICK`, and is cancelled when playback exits that state. Pace changes restart the current interval. Delayed frames advance one entry, not an accumulated backlog. Tables, illustrations, and unavailable blocks require explicit continuation, including consecutive context blocks. Completion is part of the cursor's position.

## View transitions

`apps/web/src/lib/reader-presentation.ts` belongs to the reader route. It owns the selected Article/Guided/Focus view and a transition that is either `settled` or `transitioning`. A transition carries either `autoplay` or `paused` intent.

Article/Guided switches are immediate. Crossing the Focus boundary pauses playback and waits for `TRANSITION_FINISHED`; Article's play action requests autoplay after the flight. Context stops switch views immediately without autoplay. Transition identifiers reject measurements and completions from abandoned animations.

React owns dialogs with a simple nullable value. Opening a dialog or keyboard legend sends `INTERRUPT`, as does hiding the page. This permanently cancels pending autoplay; closing a dialog does not restore it. Route unmount stops the presentation actor and pauses playback. React also owns refs, measurements, scroll/focus behavior, and Motion rendering.

## Library data and persistence

`apps/web/src/lib/library-store.ts` is a plain session-scoped store exposed through React's `useSyncExternalStore`. Construction performs no IO. Its idempotent `load()` runs from a client effect; repeated subscriptions do not reload storage. It owns library metadata, stored position checkpoints, temporary sample progress, readiness, and save status. Import/restore validation throws normally so existing forms can report errors.

Writes run through one asynchronous drain. Edits during a write are coalesced into the next transaction using the latest persisted revision. An older completion never replaces the editable library or marks newer edits as saved. Failed saves preserve exportable data and retry after a later edit; failed loads disable writes for the session to protect unread saved data. The storage module still enforces atomicity and rejects stale-tab revisions. Sample progress never enters the saved library.

`apps/web/src/lib/reader-session.ts` connects the two owners. Explicit selection changes hydrate playback from stored checkpoints. Committed playback snapshots update those checkpoints. Save-status notifications do not send playback events; reference comparisons prevent a checkpoint from being mistaken for an external seek. `apps/web/src/hooks/useReader.tsx` exposes the composed data and commands to React.

TanStack Query is not added here: the library loads once per provider, and the essential persistence work is ordered local writes. A cache/refetch layer would not replace that work. Revisit Query if shared asynchronous reads or invalidation requirements grow.

## Verification

Unit tests cover timer cancellation, delayed frames, context stops, visibility and availability guards, stale animation completions, sample isolation, save ordering and failure handling. Session integration tests verify that saving a checkpoint never pauses playback and that route changes preserve independent sample/saved positions. The unchanged Playwright suite exercises public UI and persistence behavior against a production build.

Run `pnpm test` and `pnpm test:e2e`. Passing tests provide regression coverage, not proof of exhaustive equivalence. Theme, form drafts/errors, import-review/removal UI, and navigation remain ordinary React/router state; introduce further machines only when a concrete workflow warrants them.
