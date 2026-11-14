# Still

A small RSVP reader: read a passage normally, choose a word, and move into one-word-at-a-time playback without losing your place.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Node 22.12+ is recommended. This build was checked with Node 26.

## Included

- Original sample prose and paste-your-own text (up to 100,000 characters).
- Article and focus views with one shared word position.
- A word-to-focus transition, with an immediate transition for reduced-motion preferences.
- A stationary highlighted anchor, 100–700 WPM controls, sentence/paragraph pauses, play/pause, word stepping, and sentence replay.
- Automatic pause when the page is hidden. Resuming gives the current word a full presentation interval; missed frames never skip words.
- The current text, title, word position, and speed saved to IndexedDB. Wait for “Saved on this device” before closing or refreshing after a change.
- Keyboard shortcuts outside inputs and buttons: Space plays/pauses, arrow keys step words, R replays the sentence, Escape returns to article view. Buttons retain normal keyboard behavior.

Click **Read** in article view to transition into focus and start playback. The Article/Focus toggle changes views without starting playback. Returning to article view pauses reading.

## Check

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e -- http://127.0.0.1:5173
```

The browser smoke check requires a running dev or preview server. Pass its actual URL if Vite selected another port. It covers selection, fixed anchor alignment, playback, sentence replay, save/restore, keyboard controls, hidden-page pause, completion/restart, narrow layout, and reduced motion. Screenshots go to the ignored `.impeccable/review/` directory. Browser data created by this check is isolated from your own browser.

## Implementation

- `src/reader.ts`: token positions, sentence boundaries, anchor selection, pacing, and saved-data validation.
- `src/useReader.ts`: playback and IndexedDB persistence.
- `src/App.tsx`: reading surfaces, transition, and paste/about dialogs.
- `src/styles.css`: responsive layout and visual design.
- `scripts/smoke.mjs`: repeatable browser checks.

React and TypeScript run in Vite. Motion animates the view transition; Base UI provides accessible dialogs. Fonts are self-hosted. There is no application backend, telemetry, or upload endpoint.

## Scope and evidence

This MVP tests usability and comfort. It does not establish a reading-speed or comprehension benefit. The anchor placement and punctuation multipliers are explicit product heuristics; the WPM setting is the base word presentation rate, not measured comprehension or actual elapsed reading speed. The sample is original demonstration prose, not validated research material.

Context: [Rayner et al., 2016, “So Much to Read, So Little Time”](https://journals.sagepub.com/doi/10.1177/1529100615623267).

Browser storage can be cleared or evicted and is not a backup. Only the current reading is retained; importing new text replaces it. EPUBs, article URLs, accounts, library management, cloud sync, quizzes, and deployment are outside this MVP.

Browser automation verifies a Chromium desktop and a narrow viewport, not a physical phone or Safari. Browser timing follows the display refresh cycle and is not laboratory-grade stimulus timing.
