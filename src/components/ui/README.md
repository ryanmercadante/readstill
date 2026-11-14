# Still UI components

These components were installed from the official [shadcn Base UI registry](https://ui.shadcn.com/docs/components) with `shadcn@4.23.0`, using the `base-nova` style in `components.json`.

The component composition, prop forwarding, and Base UI primitives are retained. Components use Tailwind CSS 4 utilities, compiled by `@tailwindcss/vite`, with the shadcn theme mapped to Still's palette and typography in `src/styles.css`. Button and toggle variants use `class-variance-authority`; `cn` is the registry's class-merging helper. The existing reader layout and prose CSS remain in place.

Tailwind's theme and utilities are imported without Preflight, following the [official existing-project option](https://tailwindcss.com/docs/preflight#disabling-preflight). This preserves the document defaults that the existing design relies on. The component utilities define their own borders, spacing, and typography.

Local adaptations:

- Button variants map to Still's primary, outlined, icon, and text-link styles. The quiet sample action uses the `text` variant. Navigation links use `buttonVariants` on a real link.
- Dialog content owns the portal and backdrop. Reader dialogs supply their existing close buttons and explicit final-focus target.
- Slider accepts `thumbProps` for its input label, description, and spoken WPM value. Scalar values render one thumb; array values render one per entry. Its hidden native input and pointer/keyboard behavior belong to Base UI.
- Toggle groups use Base UI's single-selection and roving keyboard focus. The reader keeps the active view selected when the current item is pressed again.
- Input, textarea, and label retain their native form semantics. Validation associations are supplied at the form.

Adding a registry component is supported. Its generated Tailwind styles can use the existing shadcn theme tokens; adapt its dimensions to the design before using it. Do not overwrite these customized components without reviewing the diff. Run `npm run test:e2e -- <base-url>` and `npm run test:a11y -- <base-url>` against a running server after changing interactive components.
