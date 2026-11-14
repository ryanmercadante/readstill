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

The first visit migrates the previous single reading or version-1 library into the current document format, preserving the selected word and pace. The original single-reading snapshot is retained. Library migrations are atomic: a failed migration leaves old records intact. Keep the same hostname and port to retain access to existing data; browser storage belongs to an origin, not a route. Export and restore a library backup to move between origins or devices.

## Included

- A temporary sample demo from the landing page’s **Try it** button, plus paste-your-own text (up to 100,000 characters). The sample and its position are not saved to the library.
- Article, Guided, and Focus modes with one shared word position. Guided keeps the article visible while playback highlights each word and scrolls it into view.
- A word-to-focus transition, with an immediate transition for reduced-motion preferences.
- A stationary highlighted anchor, 100–700 WPM controls, sentence/paragraph pauses, play/pause, word stepping, and sentence replay.
- Automatic pause when the page is hidden. Resuming gives the current word a full presentation interval; missed frames never skip words.
- A local library of pasted passages and EPUB books, with a separate chapter/word position for each reading and a shared pace setting. Wait for “Saved on this device” before closing or refreshing after a change.
- Browser-local EPUB import with a review before adding the book, chapter navigation, semantic tables, and raster/SVG illustrations in article view. Playback pauses at tables, illustrations, unavailable sections, and chapter endings.
- Original EPUB downloads for newly imported books. Remaining unsupported content is marked in place and disclosed in the import report.
- Export the entire library or an individual reading as a Still JSON backup; restore adds readings and preserves existing progress. Removal asks for confirmation.
- Keyboard shortcuts outside inputs and buttons: Space plays/pauses, arrow keys step words, R replays the sentence, Escape returns to article view. Buttons retain normal keyboard behavior.

Click **Read** in article view to transition into focus and start playback. Choose **Guided** to play through the article with a moving highlight, or **Focus** for one word at a time. Changing modes pauses playback and keeps your position. Guided pauses at rich-content blocks; Continue resumes in Guided.

Open **Library** (the book icon in the header on small screens) to import a book or continue a saved reading. Pasting text adds a reading without replacing previous passages. Selecting a chapter starts it from the beginning; reopening a book resumes its last chapter and word.

At a context stop, choose **View table/illustration/section** to see its place in Article view, or **Continue after…** to resume at the next prose word. Adjacent non-prose blocks each require an explicit continuation. At the end of a chapter, choose **Next chapter** or **Read again**. Context stops are saved just like word positions.

## EPUB and backup limits

The importer supports DRM-free, reflowable EPUB 2/3 with EPUB navigation or NCX chapter labels, local PNG/JPEG/GIF/WebP images, SVG illustrations, and tables with headers, captions, and row/column spans. Prose and footnote text retain reading order; source typography and interactive links are not reproduced. Nonlinear spine sections keep notes and appendices available. Publisher-provided fallback chains are followed for unsupported spine formats.

Tables containing nested tables or media, formulas, audio/video, embedded documents, missing/remote illustrations, and unsupported spine formats become explicit unavailable-content blocks. The import review lists these limitations before the book is added. Source scripts are disabled, external content is never fetched, and originals remain downloadable. Fixed-layout books, encrypted reading content, malformed XML, missing chapter documents, and files beyond resource limits still fail import.

SVGs are sanitized with DOMPurify after removing scripts, foreign HTML, external references, and unsupported styling. Referenced local raster resources are embedded. The result is decoded as an image and rasterized to a PNG with a maximum 1,600px edge; raw SVG/HTML never enters the reader DOM or backup image fields. Simplified or unrenderable SVGs are disclosed in the import notes. PNG conversion can lose vector scalability, source fonts, and unsupported effects; the original stays available.

EPUB files must be at most 25 MB. Extraction allows at most 3,000 archive entries, 40 MB of selected expanded resources, and 5 MB per resource. A book may contain up to 500 chapters, 40,000 blocks and 100 illustrations per chapter, 100,000 prose/table characters per chapter, and 2 million text characters overall. Tables allow up to 200 rows, 50 cells per row, 5,000 cells total, and spans up to 100. The local library holds up to 100 readings. Backups now allow up to 100 MB to include original EPUB bytes and rendered illustrations; browser storage may impose a smaller limit. A small allowance is reserved for future progress changes.

Imported markup is parsed as inert XML and normalized into ordered text, image, table, and unavailable-content blocks. Scripts, source styles, and event handlers never enter the rendered document. Import and restore validate the complete result before adding it. Version-2 backups include rich blocks, original EPUBs when available, import notes, and chapter/block/word positions. Version-1 backups are migrated on restore. Existing readings and positions win during restore; a conflicting identifier with different content becomes a separate reading. Restoring into an empty library also restores the saved pace and active reading. Older imported books have no original EPUB stored; reimport the source file to retain it.

Book contents and progress use separate IndexedDB records. Saves are atomic and only write changed records. A revision check refuses stale writes from another tab; export unsaved changes and reload if that happens. A failed load never overwrites the saved library. A failed save leaves the in-memory reading exportable and shows a persistent warning.

## Check

```sh
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e http://127.0.0.1:5173
pnpm test:guided http://127.0.0.1:5173
pnpm test:library http://127.0.0.1:5173
pnpm test:rich-epub http://127.0.0.1:5173
pnpm test:a11y http://127.0.0.1:5173
```

Run `pnpm lint:fix` to apply safe lint fixes and `pnpm format` to format files. `pnpm install` installs the Husky pre-commit hook, which runs lint-staged on every commit: staged JavaScript and TypeScript files are lint-fixed, then formatted; other supported files are formatted. Unresolved lint warnings or errors block the commit. The generated route tree is excluded from both tools, and the pnpm lockfile is excluded from formatting.

The browser smoke check requires a running dev or preview server. Pass its actual base URL if Vite selected another port. It covers server rendering, landing-to-reader navigation, browser history, direct reader reloads, selection, fixed anchor alignment, playback, sentence replay, save/restore, keyboard controls, hidden-page pause, completion/restart, narrow layout, and reduced motion. Screenshots go to the ignored `.impeccable/review/` directory. Browser data created by this check is isolated from your own browser.

To check the production build locally, run `pnpm build`, then `pnpm preview`, and pass the printed preview URL to the smoke check.

The accessibility check runs axe WCAG A/AA scans across the landing page, both reader views, and dialogs at desktop and mobile widths. It also checks keyboard view switching, slider limits and announcements, dialog focus containment/return, and validation associations. Automated checks do not replace screen-reader or physical-device testing.

The library browser check covers legacy migration, multiple readings, EPUB order/labels/images, worker-based extraction, chapter resume and completion, backup round trips, merge behavior, invalid-file recovery, storage-write failure with export, and library accessibility at desktop, 390px, and 320px. Unit tests exercise the parser and archive limits, backup validation, transaction rollback, and stale-tab conflicts using generated EPUB fixtures. The production build was also checked with [Project Gutenberg's Alice's Adventures in Wonderland EPUB3](https://www.gutenberg.org/ebooks/11), including its cover, contents list, and chapter navigation. This coverage is not a claim of compatibility with every publisher's EPUB.

The rich EPUB browser check verifies review/cancel before import, table semantics, actual SVG rasterization, blocked scripts and external requests, context stops and exact continuation, adjacent stops, saved context locations, byte-for-byte original downloads, rich backup restore, and desktop/mobile accessibility. Unit tests also cover version-1 library/backup migration, migration rollback under storage failure, publisher fallbacks, and invalid rich data.

## Implementation

- `src/lib/reader.ts`: token positions, sentence boundaries, anchor selection, pacing, and saved-data validation.
- `src/lib/sample.ts` and `reader.test.ts`: sample prose and reader logic tests.
- `src/lib/library.ts`: reading/chapter model, backup validation, migration, merge, and progress.
- `src/lib/library-v1.ts`: frozen legacy schema validation for migration.
- `src/lib/reader-document.ts`: shared block/word locations and playback sequences with context stops.
- `src/lib/library-storage.ts`: atomic IndexedDB saves, separate content/position records, and revision checks.
- `src/lib/epub.ts`: bounded ZIP extraction and inert XHTML-to-reading normalization, loaded only when importing.
- `src/lib/epub-svg.ts`: self-contained SVG sanitization and bounded PNG conversion.
- `src/lib/reading-download.ts`: original-file encoding and downloads.
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
