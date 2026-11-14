---
name: Still
description: A quiet paper surface for article and paced reading; provisional implementation identity.
colors:
  paper: "#f7f5ef"
  ink: "#302f2a"
  muted: "#706d64"
  line: "#dedbd2"
  accent: "#a7462f"
  tint: "#f0ded3"
  active-word-ink: "#7b3525"
  control-surface: "#fffefa"
  switch-track: "#edeae2"
  primary-hover: "#514d40"
  ghost-hover: "#eae6dd"
  error: "#9a2b21"
typography:
  headline:
    fontFamily: "'Source Serif 4 Variable', Georgia, serif"
    fontSize: "clamp(28px, 3.3vw, 39px)"
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: "-.035em"
  body:
    fontFamily: "'Source Serif 4 Variable', Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.85
  title:
    fontFamily: "'Source Serif 4 Variable', Georgia, serif"
    fontSize: "31px"
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: "-.025em"
  label:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  word: "3px"
  switch-button: "5px"
  field: "6px"
  button: "7px"
  switch: "8px"
  dialog: "12px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0 24px"
    height: "47px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
  input:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px"
  view-switch:
    backgroundColor: "{colors.switch-track}"
    rounded: "{rounded.switch}"
    padding: "4px"
  active-word:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.active-word-ink}"
    rounded: "{rounded.word}"
---

# Design System: Still

## Overview

**Creative North Star: "A Quiet Reading Desk"**

Still is a quiet, warm paper reading surface. Serif prose carries the attention; compact sans-serif controls support choosing a pace and returning to context. The article remains open and flat, with no stock imagery.

This is an implementation record, not user-confirmed branding. The working name, metaphor, descriptive color names and visual direction are provisional. `src/styles.css` defines the shared theme and document defaults; Tailwind classes in `src/routes/` and `src/components/` define the layouts and component styling; `src/routes/reader.tsx` coordinates interaction and transitions, with reading surfaces and controls in `src/components/reader/`. Frontmatter records observed values, not a new token API or a promised global spacing scale.

**Key Characteristics:**

- Warm paper and restrained terracotta emphasis.
- Source Serif 4 reading text with Manrope controls.
- A single brief word transition connects article and focus views.

## Colors

The palette pairs warm neutrals with a restrained terracotta accent; exact values are in the frontmatter.

### Primary

- **Terracotta** (`accent`): anchor letter, progress fill, brand mark, range control and keyboard focus.
- **Warm clay wash** (`tint`) and **deep clay ink** (`active-word-ink`): current word within article prose.

### Neutral

- **Warm paper** (`paper`): page, dock and dialogs.
- **Soft charcoal** (`ink`): prose and primary button background; **warm charcoal** (`primary-hover`) marks primary hover.
- **Stone gray** (`muted`): supporting labels; **paper seam** (`line`): dividers and progress track.
- **Pale cream** (`control-surface`): fields and selected view; **warm inset** (`switch-track`): view switch track; **warm gray wash** (`ghost-hover`): icon hover.

Error text uses the dedicated red (`error`). Other one-off border and selection colors remain local utility values or document defaults rather than forming a new palette scale.

## Typography

**Reading and heading font:** Source Serif 4 Variable, with Georgia and serif fallbacks.
**Control font:** Manrope Variable, with sans-serif fallback.

The serif provides an unhurried reading rhythm; the compact sans-serif separates interface instructions from prose. Frontmatter captures desktop article, headline, dialog title and primary label roles. Article text steps down to 21px at 800px and 20px at 520px, retaining 1.85 line height and a maximum 680px container. Titles use balanced wrapping; long content may wrap anywhere.

Focus words use the serif with a base size of 76px, or 52px when the stage is narrower than 600px. Measurement shrinks long words to fit either side of the anchor, with an 8px minimum. The selected anchor letter stays centered on the guide, rather than centering the complete word. Small supporting labels range from 8–12px in the current implementation; this records the existing UI, not an accessibility certification.

## Layout

The header has a 1320px maximum width; the reader shell is 1000px with desktop padding of 51px 40px 210px. The article is a centered 680px column. The fixed paper dock is at most 1060px wide and uses three columns for pace, playback and position. Article paragraph spacing is 25px. The Tailwind utilities preserve these contextual spacing values, using the standard spacing scale where values match.

At 800px and below, the heading stacks, dock position details disappear and dock controls become two columns. At 520px and below, the view switch fills its row, prose is inset 23px, the play label disappears, step buttons stack and dialogs use 23px padding. Header tagline and extra keyboard hints also disappear. Short screens at most 740px high and 800px wide compress the focus heading to a single line and the stage to `clamp(96px, 20dvh, 160px)`, and hide secondary context. At 1500px and above, reader top padding becomes 65px. The dock includes safe-area bottom padding; the body minimum width is 320px.

## Elevation & Depth

The reading surface is flat. Tonal changes separate controls; thin rules organize the header, reading details and dock. Shadows have two structural roles: the selected view has a small lift (`0 2px 5px #332d2010`), and modal dialogs float above a translucent backdrop (`0 18px 65px #28221830`). The active word's lateral shadow extends its highlight by 3px and is not elevation.

## Shapes

Corners are gently curved: word highlights, fields, buttons, view switch and dialogs use the observed frontmatter radii. Most controls have thin borders or tonal backgrounds. The working mark is two terracotta bars beside a serif lowercase wordmark and colored period; this is not a finalized logo. Focus uses two short vertical guide marks, and progress uses a thin horizontal line.

## Components

### Buttons

Quiet and compact. Primary actions use charcoal on paper, a 47px minimum height and the primary hover color. Secondary actions have a 1px border; ghost icon buttons are transparent with a warm hover wash. Icon buttons normally have a 40px minimum width and 42px minimum height; the compact step controls have smaller mobile dimensions. Disabled buttons use 0.38 opacity. Keyboard focus uses a 2px terracotta outline offset by 5px.

### Inputs / Fields

Pale cream fields have a 1px border, rounded field corners and 12px padding. The passage textarea uses 17px serif text, 1.8 line height, a 220px minimum height and vertical resizing. Labels remain sans-serif. Error messages are red with textual explanation. The pace control is a shadcn Base UI slider with a terracotta thumb and 25-WPM steps; its nested native input carries the accessible name and WPM value.

### Navigation

Article and Focus are a two-button group with `aria-pressed` state. The selected view has a cream fill, charcoal text and a small shadow; the inactive view uses `#68655d` for sufficient contrast against the switch track. A shadcn Base UI ToggleGroup supplies roving keyboard focus and single selection; pressing the selected item keeps that view active. The group becomes full width on phones. The header provides the wordmark, About action and Paste text action.

### Article and Focus Reader

Article words are selectable reading positions, with a clay current-word highlight; selecting text does not move the reading position. Play from article moves into focus and then starts playback. Switching back to the passage returns paused and brings the active word into view. One floating word moves and changes size between the two positions over 0.42 seconds with `cubic-bezier(0.16, 1, 0.3, 1)`. The source/target word is hidden during that flight. Reduced motion, missing measurements or an offscreen source skip the flight. Playback word changes have no added animation.

### Dock and Dialogs

The persistent dock holds the thin progress line, Base UI pace slider, replay/play/step actions and local-save status. Keyboard shortcuts support space, arrow keys, R and Escape outside interactive controls and dialogs. Paste and About are modal dialogs on a dark translucent backdrop; both pause reading when opened and return focus to the play button. Dialogs have a 600px maximum width and viewport-bounded scrolling. There is no card or chip system in this implementation.

### Component implementation

Shared controls live in `src/components/ui/`, installed from shadcn’s Base UI registry and styled with Tailwind utilities mapped to Still’s existing tokens. Dialogs retain their focus traps and explicit return-to-play focus; form errors are linked to invalid inputs. The play action’s accessible name is “Read passage” so it contains the visible “Read” label. The landing CTA remains a native link styled with the shared button variants. Geometry, typography, and the reader transition are preserved. See `src/components/ui/README.md` for the local adaptations.

## Do's and Don'ts

### Do:

- Do preserve the shared active word when moving between views.
- Do use serif type for reading and sans-serif type for controls.
- Do retain visible keyboard focus and the reduced-motion bypass.

### Don't:

- Don't treat this provisional identity as user-confirmed branding.
- Don't add stock imagery to the implemented reading surface.
- Don't animate every playback word; the implemented motion connects views.
