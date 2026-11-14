# Still: MVP to product handoff

Prepared after the first MVP and its move into this repository, November 2026.

## Start here

The MVP works, and the user described the first pass as “amazing” and said it “works really well.” The next conversation should explore productizing it, including a possible move to TanStack Start. This is an accepted interaction prototype, not evidence yet of improved reading speed, comprehension, or product-market fit.

Work in this repository, not the original scratch project. The original was left intact when the implementation was copied here. At handoff, this repository is on `main` with no commits and no configured Git remote. The intended GitHub repository is `ryanmercadante/still`; its connection/publication has not been established locally. No deployment has been performed.

Read these existing artifacts instead of treating this handoff as a replacement specification:

- [README](../README.md): features, setup, checks, implementation map, and limitations.
- [PRODUCT](../PRODUCT.md): approved MVP scope, principles, and open decisions.
- [DESIGN](../DESIGN.md): current visual system and interaction design.
- [package.json](../package.json): actual dependencies and commands; npm and its lockfile are the current package tooling.

The previous dev server used `http://127.0.0.1:5174`. Check whether it is still running before starting another. The smoke script accepts the server URL as an argument; see the README. IndexedDB is origin-specific, so changing hostname or port will appear to lose saved reading data even when the old origin still retains it.

## What the user is trying to build

The initial inspiration was rapid serial visual presentation (RSVP): show one word at a time at an adjustable rate, with a colored letter that gives the eyes a fixed anchor. Spritz and its “Optimal Recognition Point” were reference points, not a requirement to reproduce a proprietary implementation. The highlighted letter is not necessarily the middle letter or a vowel.

The distinctive interaction is moving between a normal passage and focused playback without losing context. The user specifically wanted an animation from the selected word in the full passage to the large word in focus mode. Preserve that interaction as the product grows.

“Still” is a working name: the gaze can remain still while words move, and the interface feels quiet. The user liked the implementation and asked about the name; no final naming, domain, or trademark decision has been made.

The user also expressed interest in eventually importing EPUB books and reading articles this way. Those remain follow-up ideas, not implemented features or an approved comprehensive roadmap.

## Scientific posture

Keep the product grounded in comprehension and user control. The original intuition about training away inner speech should not become a marketing claim. Neither suppressing subvocalization nor highlighting one letter has been established here as a way to improve reading.

Research discussed in the original conversation provides useful constraints:

- [Rayner et al., 2016](https://journals.sagepub.com/doi/10.1177/1529100615623267): review of speed-reading claims and the speed/comprehension tradeoff. This is the main grounding source already linked in the app and README.
- [Schotter et al., 2014](https://pubmed.ncbi.nlm.nih.gov/24747167/): preventing rereading harmed comprehension in the studied paradigm. This motivates easy context recovery; it does not prove our replay controls compensate for RSVP's limitations.
- [Busler and Lazarte, 2017](https://pubmed.ncbi.nlm.nih.gov/28252991/): pauses at linguistic boundaries helped recall in the studied RSVP conditions. It does not validate the exact pause multipliers in this app.
- [Acklin and Papesh, 2017](https://pubmed.ncbi.nlm.nih.gov/29461715/): comprehension costs at the high RSVP rates studied. Do not generalize those findings to every pace or every reader.

These are sources discussed previously, not a new systematic review. Revisit the papers before making detailed scientific or promotional claims. Current anchor placement and timing are explicitly heuristics. Display WPM is a presentation setting, not measured effective reading speed.

## Implementation details worth preserving

The README maps the main files. Inspect them before changing architecture. A few details are especially easy to lose during a migration:

- Article and focus share one word index. Selecting a word seeks and pauses. The view toggle does not start playback; the explicit Read action does. Returning to the article pauses.
- Animation completion must not restart playback after the page becomes hidden or a dialog opens. A pending-play intent is cleared for these events; browser regression checks cover this.
- Playback uses `requestAnimationFrame` and elapsed time. It does not skip words to catch up after a delayed frame, and resuming gives the current word a full interval.
- Reduced-motion preferences bypass the word-flight animation. Focus alignment measures the highlighted letter, including when font size changes for long words.
- Persistence is a versioned current-reading snapshot under `still.current-reading.v1`, not a library. Save status reflects the asynchronous write. Replacing text replaces the current reading, and browser storage is not a backup.
- Tokens currently describe one plain-text document with flat word indexes, paragraphs, and sentence starts. They are not yet durable book locations, chapters, or a rich document format.

The app currently has no backend, upload endpoint, or telemetry. Preserve accurate privacy wording if future server features change that.

## Verification and remaining uncertainty

During the implementation and repository move, a fresh dependency install, production build, five reader unit tests, and the Chromium browser smoke check passed. These are prior results; the handoff itself changes documentation only and does not rerun application tests.

The README describes browser coverage. The smoke script also exercises cancellation of pending autoplay during transitions and narrow layouts, including 320 × 568. Screenshots are ignored local artifacts rather than committed product assets.

Still unverified: physical phones, Safari behavior, a full assistive-technology review, longer real-world reading sessions, and comprehension or retention benefits. Automated narrow-viewport checks are not physical-device testing. The demonstration prose is not a validated comprehension assessment.

## Proposed product direction

These are discussion proposals for the next thread, not decisions already made with the user.

Start with a clear promise: bring your own reading, choose a comfortable pace, and recover context whenever needed. The strongest next evidence is whether people voluntarily use it again on material they actually want to read.

Suggested sequence:

1. **Learn from real use and make the existing reader dependable.** Try a small pilot, roughly 5–10 readers, on their own devices. Observe mode switching, loss of place, rereading, fatigue, and return use. Address concrete mobile, accessibility, storage, and long-text problems. Consider export/backup before users entrust substantial reading to local storage.
2. **Add a small local library and EPUB import.** Start with DRM-free, reflowable prose. Decide the normalized document model, chapter navigation, stable resume locations, and removal/export behavior before wiring in a parser. Decide how footnotes, images, tables, and other non-prose content remain available in article view. Do not silently discard meaningful content to make it fit focus mode. EPUB.js was discussed as a candidate, not selected; evaluate current maintenance, parsing behavior, and untrusted-content handling.
3. **Add article URL import if it solves a demonstrated need.** A server fetch/extraction route may be useful. Mozilla Readability was discussed as a candidate; validate its DOM/runtime requirements for the chosen host. Include paste fallback for extraction failures. Plan fetch limits, URL validation, and treatment of untrusted content as part of this feature.
4. **Consider accounts and cross-device sync only when needed.** They introduce identity, persistence, conflict handling, and privacy decisions. They are not prerequisites for EPUB import or a useful local reader.
5. **Consider a separate practice/evaluation experience.** If testing reading outcomes, use fresh comparable passages and reviewed comprehension questions, vary presentation order, and distinguish RSVP practice gains from transfer to normal reading. A simple external pilot can precede in-app quizzes or dashboards.

Decide which first audience matters most: curious RSVP experimenters, habitual article readers, or people reading books. That choice should determine the next import workflow and the first product milestone.

## TanStack Start: a candidate, not a settled migration

The user explicitly wants to consider TanStack Start now that the interaction works. The current React/TypeScript/Vite app was deliberately sufficient for proving that interaction. A framework migration should serve the next product slice.

Discuss Start alongside the desired public site, routes, article extraction, and eventual server-backed data. If the next slice is entirely browser-local EPUB import and a library, that does not by itself require a backend framework. If server features are imminent, moving the app shell first could be a useful foundation.

Before deciding, check current official Start documentation and deployment support. Cloudflare Workers was discussed as a possible host, not chosen or configured. Verify importer and extraction dependencies against the actual runtime; do not assume Node-oriented DOM libraries work unchanged in Workers.

If the user chooses Start, keep the migration bounded:

1. Establish routes and the application shell while retaining the reader's current behavior and visual design.
2. Keep tokenization/pacing logic independent of routing and server APIs.
3. Audit browser-only IndexedDB, layout measurements, animation, and visibility effects for server rendering and hydration. Restore local data without overwriting it with defaults.
4. Preserve the storage schema or implement an explicit migration. A new production origin cannot automatically read the old localhost database; plan export/import if needed.
5. Run the existing unit, build, and browser checks against the migrated app, especially shared position, fixed anchor alignment, save/restore, reduced motion, and transition cancellation.
6. Add the selected product feature in a separate slice so framework changes and behavior changes are reviewable independently.

Do not bundle an auth system, database, new component library, or package-manager switch into the migration without a concrete need. Hosting, monetization, account requirements, analytics, and the final framework choice remain open.

## Suggested skills

- **impeccable:impeccable** for product/interface refinement, using the existing PRODUCT and DESIGN artifacts as context.
- **playwright** for browser verification when changing the reader or application shell.
- **cloudflare** and **workers-best-practices** if Cloudflare is selected for deployment or server functionality.
- **firecrawl-research-papers** for further reading research, and **app-6a314a73f8ac819195b0d55e36b9c609:read-docs** for current framework/importer documentation, if available in the new session.

Use only skills relevant to the selected slice. No delegated agents are needed merely to resume this work.

## Suggested opening prompt for the next thread

> Read docs/HANDOFF.md and the linked project documents. The Still MVP works and I want to productize it. Help me choose the next focused milestone and decide whether moving to TanStack Start now supports it. Preserve the article-to-focus interaction and science-conscious framing. Inspect the current code, discuss the tradeoffs, and then implement the agreed slice. EPUB import and article reading are follow-up interests; accounts and sync are not decided.
