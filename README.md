# Still

A small RSVP reader: read a passage normally, choose a word, and move into one-word-at-a-time playback without losing your place.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. `/` is the landing page; **Try it** opens `/reader`. The reader’s Still wordmark returns home. Node 22.12+ and pnpm 12.18.0 (pinned in `package.json`) are required. This build was checked with Node 26.

Commit dependency changes together with `pnpm-lock.yaml`. For a reproducible install, use `pnpm install --frozen-lockfile`.

If an older pnpm launcher cannot switch to the pinned version, run commands through Corepack (for example, `corepack pnpm install`).

The first visit migrates the previous single reading, position, and pace into the local library. The old snapshot is retained. Keep the same hostname and port to retain access to existing data; browser storage belongs to an origin, not a route. Export and restore a library backup to move between origins or devices.

## Included

- Original sample prose and paste-your-own text (up to 100,000 characters).
- Article and focus views with one shared word position.
- A word-to-focus transition, with an immediate transition for reduced-motion preferences.
- A stationary highlighted anchor, 100–700 WPM controls, sentence/paragraph pauses, play/pause, word stepping, and sentence replay.
- Automatic pause when the page is hidden. Resuming gives the current word a full presentation interval; missed frames never skip words.
- A local library of pasted passages and EPUB books, with a separate chapter/word position for each reading and a shared pace setting. Wait for “Saved on this device” before closing or refreshing after a change.
- Browser-local EPUB import, chapter navigation, and illustrations in article view. Playback pauses at chapter endings; choose **Next chapter** to continue.
- Export the entire library or an individual reading as a Still JSON backup; restore adds readings and preserves existing progress. Removal asks for confirmation.
- Keyboard shortcuts outside inputs and buttons: Space plays/pauses, arrow keys step words, R replays the sentence, Escape returns to article view. Buttons retain normal keyboard behavior.

Click **Read** in article view to transition into focus and start playback. The Article/Focus toggle changes views without starting playback. Returning to article view pauses reading.

Open **Library** (the book icon in the header on small screens) to import a book or continue a saved reading. Pasting text adds a reading without replacing previous passages. Selecting a chapter starts it from the beginning; reopening a book resumes its last chapter and word.

## EPUB and backup limits

The importer supports DRM-free, reflowable prose EPUB 2/3 with an XHTML spine, EPUB navigation or NCX chapter labels, and local PNG/JPEG/GIF/WebP illustrations, including simple raster covers wrapped in SVG. It preserves prose and footnote text in reading order and displays illustrations in article view; source typography and interactive links are not reproduced. Two-column contents tables with chapter links become readable chapter lists. Nonlinear spine sections are included so notes and appendices remain available. It rejects fixed-layout sections, encrypted reading content, missing resources, malformed XML, remote resources, and chapters containing data tables, vector artwork, formulas, audio, video, or embedded documents instead of silently dropping them. Paste a passage when a book isn't supported.

Files must be at most 25 MB. EPUB extraction allows at most 3,000 archive entries, 40 MB of selected expanded resources, and 5 MB per resource. A book may contain up to 500 chapters, 100 illustrations per chapter, 100,000 characters per chapter, and 2 million text characters overall. The local library holds up to 100 readings and must fit in a 25 MB JSON backup; browser storage may impose a smaller limit.

Imported markup is parsed as inert XML and normalized into text and local raster-image data. Scripts, source styles, and event handlers never enter the rendered document. Import and restore validate the complete result before adding it. Backup restore keeps existing readings and positions; a conflicting identifier with different content becomes a separate reading. Restoring into an empty library also restores the saved pace and active reading.

Book contents and progress use separate IndexedDB records. Saves are atomic and only write changed records. A revision check refuses stale writes from another tab; export unsaved changes and reload if that happens. A failed load never overwrites the saved library. A failed save leaves the in-memory reading exportable and shows a persistent warning.

## Check

```sh
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e http://127.0.0.1:5173
pnpm test:library http://127.0.0.1:5173
pnpm test:a11y http://127.0.0.1:5173
```

Run `pnpm lint:fix` to apply safe lint fixes and `pnpm format` to format files. `pnpm install` installs the Husky pre-commit hook, which runs lint-staged on every commit: staged JavaScript and TypeScript files are lint-fixed, then formatted; other supported files are formatted. Unresolved lint warnings or errors block the commit. The generated route tree is excluded from both tools, and the pnpm lockfile is excluded from formatting.

The browser smoke check requires a running dev or preview server. Pass its actual base URL if Vite selected another port. It covers server rendering, landing-to-reader navigation, browser history, direct reader reloads, selection, fixed anchor alignment, playback, sentence replay, save/restore, keyboard controls, hidden-page pause, completion/restart, narrow layout, and reduced motion. Screenshots go to the ignored `.impeccable/review/` directory. Browser data created by this check is isolated from your own browser.

To check the production build locally, run `pnpm build`, then `pnpm preview`, and pass the printed preview URL to the smoke check.

The accessibility check runs axe WCAG A/AA scans across the landing page, both reader views, and dialogs at desktop and mobile widths. It also checks keyboard view switching, slider limits and announcements, dialog focus containment/return, and validation associations. Automated checks do not replace screen-reader or physical-device testing.

The library browser check covers legacy migration, multiple readings, EPUB order/labels/images, worker-based extraction, chapter resume and completion, backup round trips, merge behavior, invalid-file recovery, storage-write failure with export, and library accessibility at desktop, 390px, and 320px. Unit tests exercise the parser and archive limits, backup validation, transaction rollback, and stale-tab conflicts using generated EPUB fixtures. The production build was also checked with [Project Gutenberg's Alice's Adventures in Wonderland EPUB3](https://www.gutenberg.org/ebooks/11), including its cover, contents list, and chapter navigation. This coverage is not a claim of compatibility with every publisher's EPUB.

## Implementation

- `src/lib/reader.ts`: token positions, sentence boundaries, anchor selection, pacing, and saved-data validation.
- `src/lib/sample.ts` and `reader.test.ts`: sample prose and reader logic tests.
- `src/lib/library.ts`: reading/chapter model, backup validation, migration, merge, and progress.
- `src/lib/library-storage.ts`: atomic IndexedDB saves, separate content/position records, and revision checks.
- `src/lib/epub.ts`: bounded ZIP extraction and inert XHTML-to-reading normalization, loaded only when importing.
- `src/hooks/useReader.ts`: library state, playback, and queued persistence.
- `src/routes/reader.tsx`: reader page composition, shared view state, word transitions, and keyboard shortcuts.
- `src/components/reader/`: library, article and focus views, reading controls, header, heading, anchored word, and paste/about dialogs. Focus layout measurements and paste-form state live with their components.
- `src/components/ui/`: official shadcn Base UI components with Tailwind styles customized to Still's design; see the [component notes](src/components/ui/README.md).
- `src/router.tsx` and `src/routes/`: TanStack Start router, shared HTML document, landing page, and reader route. `src/routeTree.gen.ts` is generated by the router plugin and committed for standalone typechecking.
- `src/components/SiteHeader.tsx`, `SkipLink.tsx`, and `Wordmark.tsx`: shared navigation and branding.
- `src/styles.css`: Tailwind theme tokens, document defaults, and the compact reader media variant. Responsive layouts and component styling live in Tailwind utilities alongside their markup.
- `scripts/smoke.mjs`: repeatable browser checks.

React and TypeScript run in TanStack Start with Vite, following the [official setup](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch). Both routes render on the server and hydrate in the browser. IndexedDB access, playback, and layout measurements stay in browser effects; saved text is never sent to the server. Motion animates the view transition; shadcn's Base UI components provide the interactive controls and dialogs. Fonts are self-hosted. There is no telemetry, upload endpoint, or server-side reading storage.

The build emits `dist/client` assets and `dist/server/server.js`. `pnpm preview` serves them locally; production hosting still needs a deployment adapter or server appropriate to the chosen host.

## Scope and evidence

This MVP tests usability and comfort. It does not establish a reading-speed or comprehension benefit. The anchor placement and punctuation multipliers are explicit product heuristics; the WPM setting is the base word presentation rate, not measured comprehension or actual elapsed reading speed. The sample is original demonstration prose, not validated research material.

Context: [Rayner et al., 2016, “So Much to Read, So Little Time”](https://journals.sagepub.com/doi/10.1177/1529100615623267).

Browser storage can be cleared or evicted and is not a backup. Export a library backup before clearing browser data or changing devices. Article URLs, accounts, cloud sync, quizzes, and deployment remain outside this build.

Browser automation verifies a Chromium desktop and a narrow viewport, not a physical phone or Safari. Browser timing follows the display refresh cycle and is not laboratory-grade stimulus timing.
