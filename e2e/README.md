# Browser tests

These are Playwright Test specs. Every test gets a fresh browser context and IndexedDB; no test depends on another test or on a personal library. `pnpm test` continues to run the Vitest unit suite.

## Run

```sh
pnpm exec playwright install chromium # once, and after Playwright upgrades
pnpm test:e2e
pnpm test:e2e reader.spec.ts --project=chromium
pnpm test:e2e --grep "pending autoplay"
pnpm test:e2e:ui
pnpm exec playwright test --debug reader.spec.ts
pnpm exec playwright show-report
```

The default command builds and typechecks the current checkout, starts its production preview at `http://127.0.0.1:4173`, and shuts it down afterward. It deliberately refuses to reuse an existing server on that port. Browser installation is separate so normal runs do not need network access.

To test an already-running server instead, set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm test:e2e`. That explicitly skips the build and managed server. Pass Playwright options after the command; a positional URL is no longer supported.

The `chromium` project runs every spec. `mobile-chromium` repeats accessibility, layout, Guided, and keyboard/modal coverage with touch emulation and a narrow viewport. Some layout tests additionally cover 320 × 568. This is Chromium emulation, not physical-device or Safari coverage.

## Coverage

| Spec                    | Behavior protected                                                                                                                                              | Replaces                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `navigation.spec.ts`    | SSR, 404s, client navigation, history/reload, temporary sample isolation                                                                                        | `smoke.mjs`, `library-smoke.mjs`                                |
| `reader.spec.ts`        | All reading modes, shared position, play/pause/step/replay, completion, persistence, selection and interruptions                                                | `smoke.mjs`, `guided-smoke.mjs`                                 |
| `transitions.spec.ts`   | Animated word flight, anchor alignment, cancellation of pending autoplay                                                                                        | `smoke.mjs`, `shortcuts-smoke.mjs`                              |
| `guided.spec.ts`        | Article playback, highlight scrolling, selection pauses                                                                                                         | `guided-smoke.mjs`                                              |
| `library.spec.ts`       | Legacy migration, sample removal, multiple readings, removal, backups, invalid imports, save/load failures, stale tabs                                          | `library-smoke.mjs`                                             |
| `epub.spec.ts`          | Spine order, extraction worker, chapter resume/completion, review, rich content and adjacent stops, SVG sanitization, original downloads and backup restoration | `library-smoke.mjs`, `rich-epub-smoke.mjs`                      |
| `shortcuts.spec.ts`     | Legend, reader/mode/pace keys, dialog focus containment/return, input suppression and paste validation                                                          | `accessibility.mjs`, `shortcuts-smoke.mjs`                      |
| `theme.spec.ts`         | Defaults, cookie persistence, server HTML, no-JS rendering and blocked cookies                                                                                  | `theme.mjs`                                                     |
| `layout.spec.ts`        | Navbar fit/stickiness, short-phone Focus layout and reduced motion                                                                                              | `smoke.mjs`, `theme.mjs`                                        |
| `accessibility.spec.ts` | axe WCAG scans in both themes across routes, modes, dialogs, import feedback and rich content                                                                   | `accessibility.mjs`, `library-smoke.mjs`, `rich-epub-smoke.mjs` |

`fixtures/test.ts` provides small shared user actions, accessibility auditing, and automatic failure on uncaught browser errors. Specs own their behavior assertions. Generated EPUBs live in `fixtures/books.ts`, built from the same archive fixture builder used by the parser unit tests. Storage fixtures seed old records before the app hydrates; failure tests deliberately inject browser storage errors.

Use accessible roles and labels for interactions, and web-first assertions to wait for visible outcomes. Playback interruption tests use Playwright's clock to advance time while proving the position stays fixed. Install the clock before navigation; allow hydration to finish before freezing it. When frozen, advancing the clock also drives requestAnimationFrame, so wait for the observable transition/playback boundary before advancing playback time. Keep real-time coverage for scrolling and normal animation. Avoid arbitrary sleeps and retries that hide failures.

Before reloading after a library change, wait for “Saved on this device.” This includes changing the active reading and removing a reading: the UI updates before its IndexedDB transaction finishes. Failure tests deliberately skip this confirmation and assert the warning and preserved data instead.

The GitHub Actions workflow runs lint, formatting, Vitest, and both browser projects on pull requests and pushes to `main`. It uploads the HTML report and test artifacts. Failed tests retain a trace and screenshot locally too; open them through `pnpm exec playwright show-report`. Retries are disabled. The default server build includes TypeScript checks for app code, specs, fixtures, and configuration.

These tests preserve observable behavior for future refactoring; they do not prove exhaustive equivalence. Keep parser limits, malformed-data permutations, timing calculations, and storage transaction details in fast unit tests. Add browser regressions around user-visible failures. Automated accessibility scans still need manual screen-reader testing.
