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

The user approved the original reader, a local library with EPUB import and backup/restore, and a rich-content extension for tables, SVG illustrations, import reports, and original-file preservation. The landing page’s Try it button opens a temporary sample demo outside the saved library. The reader retains pasted text, Article, Guided, and Focus modes, word transition, adjustable pace, sentence replay, and saved positions. All three modes share chapter/block/word locations. Guided plays through the full article with a word highlight and keeps the current word visible. Tables and illustrations remain visible in Article view; Guided and Focus modes pause at them and resumes after an explicit continuation. Remaining unsupported sections have visible placeholders and import notes, with original EPUB downloads for newly imported books. Fixed-layout and encrypted books remain unsupported. Readers can also open an article from a link: Still's server fetches the page and the browser extracts its text, without images for now. Existing readings and older backups migrate without changing the selected word. See README for format and size limits. Accounts, cloud sync, quizzes, adaptive pacing, and dashboards remain deferred.

## Product Principles

- Preserve context and make rereading effortless.
- Do not imply that display speed measures comprehension or that suppressing inner speech improves reading.
- Keep all reading modes on a single document and word position.
- Reading text stays on the device. Link imports pass one page through Still's server, which keeps neither the address nor the page.

## Evidence on Hand

The conversation defines the scope and cites reading research. The bundled sample is original demonstration prose, not study material or a validated comprehension test.

## Open Decisions

Product name and visual identity are provisional implementation choices. Use “Still” as the working name. No deployment or cross-device sync is promised.
