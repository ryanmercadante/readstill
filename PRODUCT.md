# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TanStack Start, React, TypeScript, Vite, shadcn Base UI components, Tailwind CSS, Motion, browser-local storage. A landing page at `/` leads to the reader at `/reader`. Local implementation first; deployment is outside this build.

## Users

People experimenting with paced reading of English prose on a phone or computer. The audience assumption is exploratory, not a validated market finding.

## Product Purpose

Test whether a reader can comfortably understand prose while switching between a normal article and one-word-at-a-time playback.

## Capabilities and Constraints

The user approved the original reader and a follow-up local library with EPUB import, chapter navigation, per-reading resume, and backup/restore. The reader retains its ready-to-read sample, pasted text, article and focus modes, shared word position, word-to-focus transition, adjustable WPM, play/pause, and sentence replay. Pasted passages now join the library. Chapter changes and returning to article mode pause playback. EPUB import is limited to DRM-free, reflowable prose with supported raster illustrations; unsupported meaningful content causes an explicit error. See README for format and size limits. URL import, accounts, cloud sync, quizzes, adaptive pacing, and dashboards remain deferred.

## Product Principles

- Preserve context and make rereading effortless.
- Do not imply that display speed measures comprehension or that suppressing inner speech improves reading.
- Keep both views on a single document and word position.
- Text stays on the device in this MVP.

## Evidence on Hand

The conversation defines the scope and cites reading research. The bundled sample is original demonstration prose, not study material or a validated comprehension test.

## Open Decisions

Product name and visual identity are provisional implementation choices. Use “Still” as the working name. No deployment or cross-device sync is promised.
