<!-- Managed by iserlabs/hub (managed/claude/rules/modern-web-guidance.md). Do NOT edit here. -->
# Modern Web Guidance — required for all frontend code

Before writing, changing, or reviewing any **HTML, CSS, or client-side
JavaScript/TypeScript** in this repo, invoke the `modern-web-guidance` skill
(vendored at `.claude/skills/modern-web-guidance/`): `search` for the use case,
`retrieve` the matching guide(s), and follow them, adapted to this repo's
framework (Next.js/React, Astro, or plain HTML).

- **In scope:** components and pages (`.tsx`, `.jsx`, `.astro`, `.html`),
  stylesheets and Tailwind classes, layout, forms, dialogs/menus/popovers,
  animation and scroll effects, images/fonts/loading strategy, client scripts,
  accessibility, and anything that can move Core Web Vitals (LCP, CLS, INP).
- **Applies to every kind of change:** new features, edits, refactors, bug
  fixes, Sentry auto-fixes, and code review.
- **Out of scope:** purely server-side code (route handlers, server actions
  with no UI, DB/ORM, email/API integrations), build/CI config, and non-web
  scripts.
- **Browser support:** follow the skill's default (Baseline Widely available
  needs no fallback; use the guide's fallback for anything newer) unless this
  repo's `CLAUDE.md` states a different policy.
- If no guide matches, say so and proceed. Never invent a guide or silently
  skip one that applies.
