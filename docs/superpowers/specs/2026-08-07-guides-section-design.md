# Guides Section — Design Spec

**Date:** 2026-08-07
**Status:** Approved design, pending implementation plan

## Purpose

Add a long-form Guides section to phototools.io: SEO-first educational
photography content (techniques, gear, editing) in a neutral, gear-agnostic
voice, cross-linked with the existing tools. Content is adapted from the
askrobin.io/@iser corpus (191+ articles; local markdown sources in Robin's
workspace). Personal-voice content (critiques, trip reports, project essays)
stays on askrobin/iser.io and does not migrate.

## Decisions log

| Decision | Choice |
|---|---|
| Purpose | Hybrid: curated SEO guides on phototools; personal content stays put |
| Scope | Techniques + gear + editing |
| i18n | **Full translation — all 31 locales** (revised from English-only during design) |
| Content flow | Flagship launch (8–12 guides) + category waves |
| Host site | phototools.io (rejected: separate photoguides domain, personal portfolio) |
| Format | MDX content collection with typed frontmatter |
| URL structure | `/[locale]/guides` + `/[locale]/guides/[slug]`; no category pages at launch |
| Byline | **Deferred** — optional `author` frontmatter field; design degrades gracefully |
| Voice | Neutral, educational, **gear-neutral** (see Adapt stage) |

## 1. Content model & storage

Per-guide directories under `src/content/guides/`:

```
src/content/guides/<slug>/
  en.mdx     source of truth: full frontmatter + English body
  es.mdx     translatable frontmatter only (title, description, heroImage alt) + body
  …          × 31 locales
```

- Structural metadata lives **only** in `en.mdx`: `category`
  (`techniques | gear | editing`), `tags`, `relatedTools` (validated against
  the tool registry at build — unknown slug fails the build), `relatedGuides`
  (validated against guide slugs), `publishedAt`, `updatedAt`,
  `status` (`live | draft`), `author` (optional), `heroImage` (`{src, alt}`;
  `src` structural, `alt` translatable), `sourceRef` (provenance note, never
  rendered).
- Locale files carry only: `title`, `description`, `heroImageAlt` (when hero
  exists), `sourceHash` (short hash of the English body **plus translatable
  frontmatter** — title, description, hero alt — the translation was made
  from), plus the translated body. The content module merges structural
  (en) + translatable (locale) at read time.
- Frontmatter is Zod-validated during static generation; invalid frontmatter
  fails the build.
- `.mdx` files are content, exempt from the 200-line code rule.
- Content module `src/lib/guides/` exposes `getLiveGuides(locale)`,
  `getGuideBySlug(slug, locale)`, `getGuidesForTool(toolSlug, locale)` —
  mirroring the tool-registry API shape. Locale-aware: titles/descriptions
  come from the locale's file.

### Translation policy (strict parity)

- A guide may be `live` only when **all 31 locale files exist** and
  `scripts/check-guide-translations.mjs` passes. No runtime fallback logic.
  A guide missing translations stays `draft`.
- **Drafts are exempt** from parity — a draft may be English-only.
- `check-guide-translations.mjs` (runs in CI beside `check-translations.mjs`)
  enforces:
  1. Parity: every live guide has all 31 locale files.
  2. Allowed keys: locale files contain only the translatable keys.
  3. **Component-tag parity:** each locale file contains the same set of JSX
     component tags — `<Callout>`, `<Figure>`, `<ToolCard>`, and any future
     embed — with identical structural attributes (`src`, `slug`, `type`) as
     `en.mdx`; only prose, alt, and caption text may differ.
  4. **Staleness (warning, non-blocking):** each locale file's `sourceHash`
     is compared against the current English hash; a mismatch is reported as
     a CI-visible warning, not a failure — otherwise a typo fix in `en.mdx`
     would block CI until 30 re-translations land. Rule: stale translations
     must be refreshed before the next publish wave. Checks 1–3 are hard
     failures.
- Translations are agent-generated (en → 30 locales) using
  `src/lib/i18n/glossary.photography.json` for canonical terminology, with
  spot review of high-traffic locales.

## 2. Visibility & routing

- Routes: `/[locale]/guides` (index) and `/[locale]/guides/[slug]`, fully
  static via `generateStaticParams` (all locales × live slugs; drafts
  additionally rendered in dev with the existing `DraftBanner`).
- In prod, `draft` guides 404 and are excluded from index, nav, and sitemap.
- **Zero live guides ⇒ the entire section 404s** (`/guides` included) and no
  nav/footer/homepage entries render. Gating is `getLiveGuides()` non-empty —
  automatic, no feature flag. No thin empty pages, ever.
- The static `guides` segment wins over the dynamic `/[locale]/[slug]` tool
  route (Next.js static-over-dynamic priority). `guides` becomes a **reserved
  slug**: a tool-registry test asserts no tool may claim it.
- Unpublishing a live guide goes through `src/lib/i18n/redirects.ts` (301 to
  `/guides` or a successor guide), not a bare 404.
- Category index pages (`/guides/techniques` etc.) are deferred until counts
  justify them (wave 2+).

## 3. Rendering (MDX)

- Officially documented Next 16 filesystem-collection pattern. Two
  candidates: `@next/mdx` with per-slug dynamic import, or `next-mdx-remote`.
  **The implementation plan pins one** after verifying against installed docs
  (`node_modules/next/dist/docs/01-app/02-guides/mdx.md`). Content lives
  under `src/` so both candidates work with the `@/` alias.
- Frontmatter read with `gray-matter` for listings either way.
- MDX component map: headings get anchor ids; raw markdown images route
  through `<Figure>`; internal links use the locale-aware `Link` from
  `@/lib/i18n/navigation`.
- **Embed allowlist (v1, deliberately tight):**
  - `<Callout type="tip|warning">` — styled asides
  - `<Figure src alt caption?>` — server component; reads intrinsic
    dimensions from disk at build and renders `next/image`. All guide images
    are local files under `public/guides/<slug>/`. One path for every image;
    no dimension guessing, no CLS.
  - `<ToolCard slug>` — rich CTA card for a tool; name/description/icon from
    the registry (translated via the `tools` namespace).
- True interactive in-prose embeds (e.g. a mini DoF widget) are out of v1
  scope, except **one showcase embed in the flagship macro guide** if it does
  not threaten the launch.

## 4. Pages & components

**Layout exception (deliberate):** guides are documents and scroll naturally,
joining glossary/about/privacy in the content-page pattern. The "no page
scroll on desktop" rule is a tool-page rule and does not apply. Do not "fix"
guide scrolling.

**Guide index** (`/[locale]/guides`): static server component. Header, then
three category sections (Techniques / Gear / Editing), each a grid of cards:
hero thumbnail, translated title/description, read time, updated date.
Existing design tokens only; no new CSS variables.

**Guide page** (`/[locale]/guides/[slug]`):

- Article column (~720px measure) + right rail: table of contents (built at
  build time from the h2/h3 MDX heading AST; scroll-spy via
  IntersectionObserver adapted from the analyzer's `SectionAnchorNav`
  pattern), related-tools cards, related guides. TOC collapses on mobile.
- Breadcrumbs (Home → Guides → title) with `BreadcrumbList` JSON-LD (also
  clears the P2 roadmap item).
- Byline block renders only when `author` is set.
- Read time computed per locale at build via `Intl.Segmenter` word
  segmentation (correct for CJK/Thai; `words ÷ 200` is not).
- Hero image renders with `priority` (LCP element); in-body `Figure` images
  lazy-load.
- **Ads:** template-owned slots only — end-of-article `AdUnit` + right-rail
  slot beneath related tools (desktop). No mid-prose injection in v1; may
  return later via an explicit marker component if revenue data justifies it.

**Flywheel, reverse direction:** each tool's server `page.tsx` may call
`getGuidesForTool(slug, locale)` and pass a serializable
`guides: {slug, title}[]` prop into `LearnPanel`, which renders a "Guides"
links block only when non-empty. Wiring is **incremental** — at launch, only
tools referenced by flagship guides; a default empty prop keeps unwired tools
unchanged.

**Site integration at launch:** nav gets a top-level "Guides" link (plain
link, no mega-menu); footer gets a Guides column; homepage gets a compact
guides teaser. All render only when live guides exist.

**Instrumentation (PostHog):** `guide_tool_click` (ToolCard/related-tools
clicks on guide pages) and `tool_guide_click` (LearnPanel guides-block clicks
on tool pages), each carrying both slugs. This is the flywheel metric.

## 5. i18n chrome & SEO

- New `messages/{locale}/guides.json` (~20 short strings: nav label, index
  header, category names/blurbs, "min read" ICU plural, "Updated", "On this
  page", "Related tools", "Related guides", "Back to guides", homepage teaser
  strings). Registered in `src/lib/i18n/request.ts`, mirrored across all 31
  locales, covered by `check-translations.mjs` automatically.
- **Standard alternates:** guides use `getAlternates()` exactly like every
  other page — full 31-locale hreflang, self-canonical per locale. No special
  cases. Sitemap lists all locale variants with hreflang alternates,
  `lastmod` from `updatedAt`.
- Per-locale metadata: title + meta description from the locale file. OG
  images via the existing generated `og-layout` with the translated title;
  hero-photo OG images are a later nicety.
- Structured data per guide per locale: `Article` JSON-LD with `inLanguage`,
  `datePublished`/`dateModified`, `image`, `author` as `Person` when byline
  exists else PhotoTools as `Organization`; plus `BreadcrumbList`.
- Deferred to wave 2: `HowTo` schema, per-guide FAQ (optional `faq`
  frontmatter feeding the existing `FaqSection`).

## 6. Content pipeline

Sources: Robin's publish index
(`~/workspace/robin/robin-assistant-v3/user-data/observability/publish/index.jsonl`,
634 records) maps every askrobin page to its local markdown source, category,
and assets. **Repo independence:** Robin's files are read at adaptation time
only; content is copied into `src/content/guides/`. The photo-tools build
never depends on paths outside the repo.

Five stages per guide:

1. **Select** — from categories Field Guides / Lens Analysis / Gear &
   Comparisons / Color Grading / Tools & Setup. Evergreen instructional
   pieces qualify; trip reports and personal-voice pieces do not.
2. **Adapt** — substantial rewrite into neutral educational voice: new
   structure for search intent (keyword-informed H2/H3s via lightweight
   manual research — search suggest, People-Also-Ask; no tooling
   dependency), front-loaded intro, embeds placed, title + meta description
   written. **Gear-neutral rule:** guides teach principles applicable to any
   camera system. Kevin's specific gear (Nikon Z bodies, specific lenses) is
   stripped or generalized to focal lengths, magnification ratios, and
   feature classes. Specific products may appear only as illustrative
   examples in gear guides — never as the frame of the article.
   **Duplicate-content stance:** adaptation must be substantial (different
   structure, voice, length) or the guide competes with its askrobin
   original; for close derivatives, unpublish or canonicalize the original
   (owner's call per guide at review). **Kevin reviews every flagship
   adaptation** — this is the quality gate.
3. **Assets** — photos exported to `public/guides/<slug>/`: long edge
   ≤ 2000px, compressed, **all EXIF/GPS stripped** (shooting locations are
   personal data). Alt text written. Own photography — licensing clean.
4. **Translate** — agent batch en → 30 locale files; glossary-pinned
   terminology; `check-guide-translations.mjs` green.
5. **Publish** — flip `status: live`, commit. Index, sitemap, nav, and tool
   back-links update automatically from the content module.

### Flagship set (8–12 guides, macro as anchor cluster)

Final selection with Kevin at stage 1. Candidate shape:

- **Techniques (4–5):** macro getting-started (anchor), focus stacking
  (→ focus-stacking-calculator), polarized-crystal macro (distinctive
  content few sites have), bird-photography workflow, flash basics.
- **Gear (2–3):** choosing a macro lens (distilled from lens analyses,
  gear-neutral framing), tripods for long telephoto, teleconverters in
  practice.
- **Editing (2–3):** golden-hour color grading, anatomy of a grade.

Every flagship maps to ≥1 `relatedTools` entry so the flywheel is live from
day one.

## 7. Testing

- **Unit:** content module — Zod schema, en+locale merge, `getGuidesForTool`,
  `Intl.Segmenter` read time (CJK/Thai cases), reserved-slug guard,
  draft/live filtering. Fixture guide directories, not real content.
- **Script:** `check-guide-translations.mjs` in CI beside
  `check-translations.mjs`.
- **Component:** MDX component map rendering, TOC extraction, `Article` +
  `BreadcrumbList` JSON-LD presence.
- **E2E:** staged. Phase A: `/guides` 404s and nav shows no Guides link.
  Phase B: full `guides.spec.ts` — index navigation, TOC scroll-spy,
  ToolCard → tool page, LearnPanel guides block → guide; smoke checks
  (200, no console errors, content) for `/guides` + one guide across a
  locale sample.
- **Existing tests updated:** sitemap (guide URLs), metadata/alternates.

## 8. Rollout & success criteria

- **Phase A — infrastructure:** ships with one real guide in `draft`
  (English-only, dev-visible). Tests green; zero production-visible change.
- **Phase B — flagship launch:** 8–12 guides through the full pipeline, flip
  live in one batch. Nav/footer/teaser/sitemap/back-links appear as a
  consequence. Submit updated sitemap and request indexing for flagships in
  Search Console.
- **Phase C — waves:** remaining corpus by category; category index pages
  when counts justify.

**Success criteria:** flagships indexed within ~2 weeks of Phase B;
impressions/clicks trending up across 90 days; PostHog `guide_tool_click` /
`tool_guide_click` showing real guide↔tool traffic; translation parity green
in CI continuously. **Wave 2 proceeds only if Phase B shows indexing and
non-zero organic clicks.**

## Non-goals (v1)

Category index pages; `HowTo`/FAQ schema; interactive in-prose embeds beyond
the one showcase; mid-article ads; per-guide hero OG images; RSS; comments.

## Open questions

1. **Byline** — Kevin undecided; optional `author` field means either answer
   is a frontmatter edit, not a redesign.
2. **askrobin originals** — per-guide call at review: keep public, unpublish,
   or canonicalize toward the phototools guide.
