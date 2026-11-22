# Still on web, iOS, and Android

**Planning draft.** Keep the self-hostable web reader free forever. Build a streamlined Expo app for iOS and Android that opens directly to Library and Reader. Offer an optional account for people who want Still to store their library and keep their place across devices.

The current web app already has a local library, three reading modes, and versioned backup and restore. It runs on Cloudflare Workers, and the browser owns the saved readings. The working tree also includes offline PWA launch. Native apps, accounts, a sync service, and a portable server distribution are planned work. See the [web implementation notes](../README.md) and [reader state ownership](READER_STATE.md).

## Business requirements

| Offering          | What a reader gets                                                                                                                                               | Who operates it                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Free reader       | Use the public web app, PWA, or native app without signing up. Read offline, import supported material, keep exact progress, and export or restore the library.  | The device holds the library. Still operates the public website and its link importer. |
| Self-hosted Still | Run the web reader indefinitely. Proposed extension: run optional accounts, file storage, and sync for an instance, and connect the official apps to it.         | The operator controls the instance, its data, backups, and upgrades.                   |
| Still Cloud       | One subscription for web, iOS, and Android. Save a book once, resume at the same word on another device, and recover the synced library on a replacement device. | Still operates accounts, storage, sync, recovery, and customer support.                |

- Introduce the account when a reader chooses **Sync my library**. Show the destination and what will be uploaded. Keep local books readable and exportable when someone cancels, goes offline, or reaches their storage allowance.
- Start with one paid plan. Test **$3 monthly or $30 annually** as a price hypothesis. Set the included storage and cloud retrieval window from pilot costs and usage. Publish both before charging, along with cancellation, export, and deletion terms.
- Validate demand with people who read on two devices. Measure how many pay, complete their first handoff, and use it again four weeks later. Track storage, transfers, payment fees, and support cost per paying account. Collect pilot feedback by consent and keep book titles, URLs, and reading contents out of business metrics.
- Before taking payments, decide how web and store purchases map to one entitlement and how subscribers restore it. Record the billing, privacy, and software distribution decisions for each storefront.

## Self-host requirements

- Ship a documented web-only configuration and an optional sync configuration. **Proposed first supported install:** Docker Compose on one HTTPS host with persistent volumes. An operator should be able to install from a tagged release without a Still Cloud account, commercial API key, or Cloudflare account.
- Serve the web app and article/image importer from the operator’s origin. Make the canonical URL, allowed origins, rate limits, storage paths, and registration policy configurable. Carry the existing public-URL checks, redirect validation, file limits, and rate limits into the portable importer.
- Let a native user enter their instance URL when enabling sync. Show which server owns the account. Store credentials per instance and ask before copying a library to a different destination. The instance must keep working while Still Cloud is unreachable.
- Document upgrades, supported client versions, database migrations, and how to restore matching metadata and files from a backup. Ship an example configuration with the existing branding and license terms explained. **Acceptance:** install on a clean host, connect a phone, import an illustrated EPUB, back up the instance, restore on a second host, and recover the book and exact position.

## Technical requirements

- **Mobile experience.** Open to Library with Continue Reading and one Add action. Reader supports Article, Guided, and Focus at a shared chapter, block, and word. Keep the landing page, About page, and installation guidance on the web. Verify dynamic text sizes, screen reader controls, reduced motion, and Guided scrolling on iOS and Android.
- **Local durability.** Commit a checkpoint locally when reading pauses, the app backgrounds, or the reader exits. A saved checkpoint must survive force-close and offline relaunch. A slow or failed sync must allow continued reading and local saves.
- **Import and portability.** Support paste, DRM-free reflowable EPUB, article links, and existing backup formats. Local imports and downloaded readings work offline. URL imports require network access. Retain rich-content stops, illustrations, original EPUBs when available, import limits, and migration of older books that lack original bytes. Bring files and URLs from the system share sheet into the same import review, including when the app starts cold.
- **Accounts and data lifecycle.** Scope all metadata, files, and credentials to the chosen account and instance. Cover recovery, sign-out on a shared device, account deletion, quota exhaustion, and export. Decide the cloud encryption and key-recovery model before uploading real reader libraries. Explain who can access stored content and what recovery can restore.

## Architecture requirements

| Boundary               | Responsibility and proposed implementation                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared reader core     | TypeScript document and checkpoint types, tokenization, pacing, playback transitions, backup validation, and migrations. Inject lifecycle and timing dependencies where playback currently observes browser visibility. The same fixture must produce the same reading location on all platforms.                                                                          |
| Web and native clients | Keep TanStack Start, the browser UI, and IndexedDB for web. Use Expo/React Native for mobile navigation and screens. Evaluate SQLite for native records and app-private files for EPUBs and illustrations. Prototype Guided layout and EPUB normalization early because the current implementations use browser layout, DOM parsing, and image decoding.                   |
| Sync service           | One versioned protocol for managed and self-hosted instances. Keep per-user metadata and checkpoints separate from larger document and asset transfers. Download the normalized document with stable block IDs so a different importer version cannot shift the selected word. Transfer each asset once per account and verify it before marking a book available offline. |
| Hosting and billing    | Use the same sync semantics in both deployments. Keep identity scoped to the instance. Apply subscription entitlements and quotas at the managed service boundary. Choose the production database and blob store after measuring the pilot workload and rehearsing a portable restore.                                                                                     |

**Handoff flow.** Save a local edit and a pending sync operation together. On reconnect, retry with a stable operation ID. The server checks the account, document version, and last acknowledged revision, then returns an acknowledgement and change cursor. Other devices pull changes since their cursor. A progress update should transfer only a checkpoint. During initial sign-in, explicitly merge the local and remote libraries and keep recoverable copies if content differs.

**Concurrent reading.** A deliberate rewind is valid progress. If two offline devices change the same checkpoint from the same base revision, preserve both locations and let the reader choose when they next open the book. Avoid moving the cursor during active playback. Propagate deletions as versioned records so an old device reconnecting cannot silently restore a removed book. Test retries, interrupted file transfers, clock skew, and reconnect after deletion against both hosting configurations.

## Repository requirements

The repository is a pnpm workspace (`apps/*`, `packages/*`) with one lockfile. Layout as the second client and service arrive:

| Location                                 | Ownership                                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                               | Web routes, PWA, site, browser adapters, Cloudflare deployment, and Playwright tests. Root scripts delegate to it.                                                         |
| `apps/mobile`                            | Expo project, native Library and Reader, local persistence, platform share handlers, and mobile integration tests.                                                         |
| `packages/reader-core`                   | Extract the reader types and logic consumed by both clients, together with their existing tests. Keep React DOM, Expo, IndexedDB, and server imports outside this package. |
| `packages/sync-protocol` and `apps/sync` | Add when sync work begins. Own wire formats, compatibility fixtures, service implementation, migrations, and account isolation tests.                                      |
| `deploy/self-host`                       | Versioned Compose configuration, example environment, upgrade notes, and backup/restore procedure tied to a release.                                                       |

Register real packages in the workspace as they are introduced. Keep existing root web commands working. CI should run shared reader fixtures, web regression tests, and native tests for changes to the core. Add sync contract and self-host restore tests when those deliverables land. Keep web staging and tagged production releases working throughout. Version mobile builds independently and test service changes with the previous supported client because app store updates and self-host upgrades arrive at different times.

## Delivery sequence

| Milestone                           | Acceptance                                                                                                                                                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Offline native reading           | In the same repo, launch Expo into Library, paste a passage, advance in Reader, pause, force-close, and reopen offline at the saved word on iOS and Android. Reuse the web reader’s checkpoint and pacing fixtures. Run the existing web suite after extraction.     |
| 2. Native reading and import parity | Exercise all three modes, accessible controls, illustrated EPUBs, link import, and an incoming share on physical devices. Export a reading from web, restore it on mobile, and return it to web at the exact position.                                               |
| 3. Portable web release             | Install the free web-only configuration on a clean host. Confirm offline PWA launch, local storage, and link imports work independently of Still-operated services. This milestone can proceed alongside mobile work.                                                |
| 4. Two-device sync pilot            | Choose the privacy and recovery model. Connect web and mobile to the same test account. Read offline on both, resolve competing checkpoints, delete a book, and restore the library to a fresh device. Repeat against a self-hosted instance using the official app. |
| 5. Paid pilot and release decision  | Set the quota, retention window, and pilot success criteria. Exercise purchase, restore, cancellation, export, and deletion. Run the four-week pilot and use repeat handoffs, paid retention, and cost per account to decide whether to launch or revise the offer.  |

**First implementation issue:** build milestone 1 around a single pasted passage. Its deliverable is a working handoff between native Library and Reader that survives an offline restart on both platforms. That gives the team a real second client to guide extraction of shared code.
