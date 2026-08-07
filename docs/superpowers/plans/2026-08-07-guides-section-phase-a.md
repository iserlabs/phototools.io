# Guides Section (Phase A Infrastructure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Guides content infrastructure for phototools.io — MDX content collection, 31-locale model, routes, components, checks, and one real draft guide — with zero production-visible change.

**Architecture:** MDX files live in per-guide directories under `src/content/guides/<slug>/` (`en.mdx` = source of truth with full frontmatter; locale files carry only translatable fields). A server-only content module (`src/lib/guides/`) reads them with `gray-matter`, validates with Zod, and feeds static routes at `/[locale]/guides` and `/[locale]/guides/[slug]`. Bodies render via `@next/mdx` per-slug dynamic import with a tight embed allowlist. Chrome (nav/footer/homepage) is gated on live-guide existence threaded as a prop from the server locale layout.

**Tech Stack:** Next.js 16 App Router (Turbopack), `@next/mdx` + `remark-frontmatter` + `rehype-slug` (string plugin config), `gray-matter`, `github-slugger`, `unified`/`remark-parse`/`remark-mdx`, `image-size`, Zod 4, next-intl 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-07-guides-section-design.md` (read it before starting).

## Global Constraints

- Run every command from the repo root: `/Users/iser/workspace/iserlabs/applications/photo-tools`. Package manager is **npm**.
- 200-line limit on all `.ts`/`.tsx` files (test files and `.mdx` content exempt). Named exports only. CSS Modules with design tokens from `src/app/globals.css` — **never invent new CSS variables**; page widths use `--page-width-wide` (1760px), `--page-width-content` (1100px), `--page-width-prose` (800px).
- Every user-facing string goes through next-intl. New keys must land in **all 31 locales** (list in `src/lib/i18n/routing.ts`) in the same task, using `src/lib/i18n/glossary.photography.json` for photography terminology. Verify with `node scripts/check-translations.mjs` and `node scripts/find-english-leaks.mjs`.
- Locale-aware navigation only: import `Link`, `usePathname`, `useRouter` from `@/lib/i18n/navigation`, never from `next/link` / `next/navigation`.
- New packages imported from `src/` go in `dependencies` (ESLint `import/no-extraneous-dependencies` enforces this).
- Guide slugs: kebab-case, no dots (a dot would bypass the locale middleware matcher in `src/proxy.ts`).
- Guide images live under `public/images/guides/<slug>/` — this inherits the 1-year immutable cache header from `next.config.ts` (`/images/:path*`); `public/guides/` would not.
- Analytics: never call `posthog.capture` directly — add typed events in `src/lib/analytics/types.ts` and semantic wrappers in `src/lib/analytics/index.ts`.
- Draft-guide semantics: `status: 'draft'` renders in dev, hard-404s in prod, exempt from translation parity. `status: 'live'` requires all 31 locale files.
- Zero production-visible change until a guide goes live: with no live guides, `/guides` routes 404 and no nav/footer/homepage guide entries render.
- Commit after each task with conventional messages (`feat(guides): …`, `test(guides): …`). NEVER push or deploy.
- After file changes in `src/app/`, if the dev server misbehaves: `rm -rf .next` and restart.

---

### Task 1: MDX build wiring

**Files:**
- Modify: `package.json` (deps), `next.config.ts` (compose `withMDX`, add `pageExtensions`)
- Create: `src/mdx-components.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: the ability to `await import('@/content/guides/<slug>/<locale>.mdx')` from server components, with YAML frontmatter stripped from render (`remark-frontmatter`) and heading anchor ids added (`rehype-slug`). `src/mdx-components.tsx` exports `useMDXComponents(): MDXComponents` (required by `@next/mdx` App Router).

- [ ] **Step 1: Install dependencies**

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react gray-matter github-slugger image-size unified remark-parse remark-mdx remark-frontmatter rehype-slug unist-util-visit
npm install -D @types/mdx @types/mdast
```

- [ ] **Step 2: Read `next.config.ts`, then compose withMDX**

Read the whole file first. Add at the top:

```ts
import createMDX from '@next/mdx'
```

Add to the `nextConfig` object (top level):

```ts
pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
```

Before the export, create the wrapper (string plugin names — required by Turbopack; plugin options must stay serializable):

```ts
const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-frontmatter'],
    rehypePlugins: ['rehype-slug'],
  },
})
```

Compose it innermost in the existing chain, i.e. change
`withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), …)` to
`withSentryConfig(withBundleAnalyzer(withNextIntl(withMDX(nextConfig))), …)`.

Contingency: if `npm run build` fails resolving the string plugin names, replace them with imported plugin functions (`import remarkFrontmatter from 'remark-frontmatter'` etc.) and re-run — but try strings first; dev (Turbopack) requires them.

- [ ] **Step 3: Create `src/mdx-components.tsx`**

```tsx
import type { MDXComponents } from 'mdx/types'

// Guide embeds are injected per-render via the `components` prop in the guide
// page (they need the guide slug bound). This global map stays minimal.
const components: MDXComponents = {}

export function useMDXComponents(): MDXComponents {
  return components
}
```

- [ ] **Step 4: Verify**

Run: `npm run type-check && npm run build`
Expected: both succeed with no new warnings about MDX.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json next.config.ts src/mdx-components.tsx
git commit -m "feat(guides): wire @next/mdx with frontmatter + heading-slug plugins"
```

---

### Task 2: Guide types + Zod frontmatter schema + reserved slug guard

**Files:**
- Create: `src/lib/guides/types.ts`, `src/lib/guides/schema.ts`
- Test: `src/lib/guides/schema.test.ts`
- Modify: `src/lib/data/tools.test.ts` (reserved-slug guard)

**Interfaces:**
- Consumes: `getAllTools()` from `@/lib/data/tools`.
- Produces:
  - `types.ts`: `GuideCategory = 'techniques' | 'gear' | 'editing'`; `GuideStatus = 'live' | 'draft'`; `TocEntry { id: string; text: string; depth: 2 | 3 }`; `GuideFrontmatter`; `GuideLocaleFrontmatter`; `GuideListItem { slug, title, description, category, readTimeMinutes, updatedAt, heroImage? }`; `Guide extends GuideListItem { publishedAt, status, author?, relatedTools, relatedGuides, toc, body }`; `AUTHORS: Record<string, { name: string }>` containing `'kevin-lee': { name: 'Kevin Lee' }`.
  - `schema.ts`: `guideFrontmatterSchema` (Zod, strict), `localeFrontmatterSchema` (Zod, strict), `SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/`.

- [ ] **Step 1: Write the failing tests**

`src/lib/guides/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { guideFrontmatterSchema, localeFrontmatterSchema, SLUG_PATTERN } from './schema'

const valid = {
  title: 'Focus Stacking: A Complete Guide',
  description: 'How to get front-to-back sharpness with focus stacking.',
  category: 'techniques',
  relatedTools: ['focus-stacking-calculator'],
  publishedAt: '2026-08-15',
  updatedAt: '2026-08-15',
  status: 'draft',
}

describe('guideFrontmatterSchema', () => {
  it('accepts a minimal valid frontmatter', () => {
    expect(guideFrontmatterSchema.parse(valid)).toMatchObject({ category: 'techniques' })
  })
  it('rejects unknown tool slugs in relatedTools', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, relatedTools: ['not-a-tool'] })).toThrow()
  })
  it('rejects unknown keys (strict)', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, extra: 'nope' })).toThrow()
  })
  it('rejects bad category and bad status', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, category: 'news' })).toThrow()
    expect(() => guideFrontmatterSchema.parse({ ...valid, status: 'disabled' })).toThrow()
  })
  it('rejects non-ISO dates', () => {
    expect(() => guideFrontmatterSchema.parse({ ...valid, publishedAt: '15/08/2026' })).toThrow()
  })
  it('requires heroImage src under /images/guides/ and a non-empty alt', () => {
    expect(() =>
      guideFrontmatterSchema.parse({ ...valid, heroImage: { src: '/guides/x/hero.jpg', alt: 'x' } })
    ).toThrow()
    expect(
      guideFrontmatterSchema.parse({ ...valid, heroImage: { src: '/images/guides/x/hero.jpg', alt: 'Macro rig' } })
    ).toBeTruthy()
  })
})

describe('localeFrontmatterSchema', () => {
  it('accepts translatable keys only', () => {
    expect(
      localeFrontmatterSchema.parse({ title: 'T', description: 'D', sourceHash: 'abc123def456' })
    ).toBeTruthy()
    expect(() =>
      localeFrontmatterSchema.parse({ title: 'T', description: 'D', sourceHash: 'a', category: 'gear' })
    ).toThrow()
  })
})

describe('SLUG_PATTERN', () => {
  it('accepts kebab-case, rejects dots (proxy matcher) and uppercase', () => {
    expect(SLUG_PATTERN.test('macro-photography-getting-started')).toBe(true)
    expect(SLUG_PATTERN.test('v1.2-guide')).toBe(false)
    expect(SLUG_PATTERN.test('Macro')).toBe(false)
  })
})
```

Add to `src/lib/data/tools.test.ts` inside its existing describe:

```ts
it('never uses the reserved "guides" slug (route segment for the Guides section)', () => {
  for (const tool of TOOLS) {
    expect(tool.slug).not.toBe('guides')
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/guides/schema.test.ts src/lib/data/tools.test.ts`
Expected: schema tests FAIL (module not found); tools reserved-slug test PASSES (guardrail, no tool uses it today).

- [ ] **Step 3: Implement `types.ts` and `schema.ts`**

`src/lib/guides/types.ts`:

```ts
export type GuideCategory = 'techniques' | 'gear' | 'editing'
export type GuideStatus = 'live' | 'draft'

export interface TocEntry {
  id: string
  text: string
  depth: 2 | 3
}

export interface GuideHeroImage {
  src: string
  alt: string
}

export interface GuideFrontmatter {
  title: string
  description: string
  category: GuideCategory
  tags?: string[]
  relatedTools: string[]
  relatedGuides?: string[]
  publishedAt: string
  updatedAt: string
  status: GuideStatus
  author?: string
  heroImage?: GuideHeroImage
  sourceRef?: string
}

export interface GuideLocaleFrontmatter {
  title: string
  description: string
  heroImageAlt?: string
  sourceHash: string
}

export interface GuideListItem {
  slug: string
  title: string
  description: string
  category: GuideCategory
  readTimeMinutes: number
  updatedAt: string
  heroImage?: GuideHeroImage
}

export interface Guide extends GuideListItem {
  publishedAt: string
  status: GuideStatus
  author?: string
  relatedTools: string[]
  relatedGuides: string[]
  toc: TocEntry[]
  body: string
}

export const AUTHORS: Record<string, { name: string }> = {
  'kevin-lee': { name: 'Kevin Lee' },
}
```

`src/lib/guides/schema.ts`:

```ts
import { z } from 'zod'
import { getAllTools } from '@/lib/data/tools'

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

const heroImageSchema = z.strictObject({
  src: z.string().startsWith('/images/guides/'),
  alt: z.string().min(1),
})

const toolSlug = z.string().refine(
  (slug) => getAllTools().some((t) => t.slug === slug),
  (slug) => ({ message: `unknown tool slug "${slug}" in relatedTools` })
)

export const guideFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['techniques', 'gear', 'editing']),
  tags: z.array(z.string().min(1)).optional(),
  relatedTools: z.array(toolSlug),
  relatedGuides: z.array(z.string().regex(SLUG_PATTERN)).optional(),
  publishedAt: isoDate,
  updatedAt: isoDate,
  status: z.enum(['live', 'draft']),
  author: z.string().optional(),
  heroImage: heroImageSchema.optional(),
  sourceRef: z.string().optional(),
})

export const localeFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().min(1),
  heroImageAlt: z.string().min(1).optional(),
  sourceHash: z.string().min(1),
})
```

(If Zod 4 rejects the two-argument `refine` form, use `.superRefine((slug, ctx) => { … ctx.addIssue({ code: 'custom', message: … }) })`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/guides/schema.test.ts src/lib/data/tools.test.ts`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guides/types.ts src/lib/guides/schema.ts src/lib/guides/schema.test.ts src/lib/data/tools.test.ts
git commit -m "feat(guides): guide types, strict frontmatter schemas, reserved-slug guard"
```

---

### Task 3: Read time (Intl.Segmenter)

**Files:**
- Create: `src/lib/guides/read-time.ts`
- Test: `src/lib/guides/read-time.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `getReadTimeMinutes(body: string, locale: string): number` — segmenter-based word count ÷ 200 wpm, `Math.max(1, Math.ceil(...))`.

- [ ] **Step 1: Write the failing test**

`src/lib/guides/read-time.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getReadTimeMinutes } from './read-time'

describe('getReadTimeMinutes', () => {
  it('counts Latin words and rounds up', () => {
    const body = Array(250).fill('word').join(' ')
    expect(getReadTimeMinutes(body, 'en')).toBe(2)
  })
  it('never returns less than 1 minute', () => {
    expect(getReadTimeMinutes('short text', 'en')).toBe(1)
  })
  it('segments CJK text without whitespace', () => {
    const body = '写真の露出を理解することは重要です。'.repeat(100)
    expect(getReadTimeMinutes(body, 'ja')).toBeGreaterThan(1)
  })
  it('segments Thai text without whitespace', () => {
    const body = 'การถ่ายภาพมาโครต้องใช้ความอดทน'.repeat(120)
    expect(getReadTimeMinutes(body, 'th')).toBeGreaterThan(1)
  })
  it('ignores punctuation-only segments', () => {
    expect(getReadTimeMinutes('... --- !!!', 'en')).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/guides/read-time.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/guides/read-time.ts`:

```ts
const WORDS_PER_MINUTE = 200

/** Strips MDX/JSX tags and markdown syntax noise before counting. */
function toPlainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>\[\]()!-]/g, ' ')
}

export function getReadTimeMinutes(body: string, locale: string): number {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })
  let words = 0
  for (const segment of segmenter.segment(toPlainText(body))) {
    if (segment.isWordLike) words += 1
  }
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/guides/read-time.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guides/read-time.ts src/lib/guides/read-time.test.ts
git commit -m "feat(guides): locale-aware read time via Intl.Segmenter"
```

---

### Task 4: TOC extraction

**Files:**
- Create: `src/lib/guides/toc.ts`
- Test: `src/lib/guides/toc.test.ts`

**Interfaces:**
- Consumes: `TocEntry` from `./types`.
- Produces: `extractToc(body: string): TocEntry[]` — h2/h3 entries with ids matching what `rehype-slug` generates at render (both use `github-slugger`).

- [ ] **Step 1: Write the failing test**

`src/lib/guides/toc.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { extractToc } from './toc'

describe('extractToc', () => {
  it('extracts h2 and h3, skips h1 and h4', () => {
    const body = '# Title\n\n## Setup\n\ntext\n\n### Lighting\n\n#### Deep\n\n## Shooting\n'
    expect(extractToc(body)).toEqual([
      { id: 'setup', text: 'Setup', depth: 2 },
      { id: 'lighting', text: 'Lighting', depth: 3 },
      { id: 'shooting', text: 'Shooting', depth: 2 },
    ])
  })
  it('dedupes ids like rehype-slug (github-slugger counters)', () => {
    const body = '## Setup\n\n## Setup\n'
    expect(extractToc(body).map((e) => e.id)).toEqual(['setup', 'setup-1'])
  })
  it('handles MDX with JSX blocks without crashing', () => {
    const body = '## Intro\n\n<Callout type="tip">Use a tripod.</Callout>\n\n## Gear\n'
    expect(extractToc(body).map((e) => e.text)).toEqual(['Intro', 'Gear'])
  })
  it('flattens inline markup inside headings', () => {
    const body = '## Using `f/8` and *beyond*\n'
    expect(extractToc(body)[0].text).toBe('Using f/8 and beyond')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/guides/toc.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/guides/toc.ts`:

```ts
import GithubSlugger from 'github-slugger'
import type { Heading } from 'mdast'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import type { TocEntry } from './types'

function headingText(node: Heading): string {
  let text = ''
  visit(node, ['text', 'inlineCode'], (child) => {
    text += (child as { value: string }).value
  })
  return text
}

export function extractToc(body: string): TocEntry[] {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(body)
  const slugger = new GithubSlugger()
  const entries: TocEntry[] = []
  visit(tree, 'heading', (node: Heading) => {
    if (node.depth !== 2 && node.depth !== 3) return
    const text = headingText(node)
    entries.push({ id: slugger.slug(text), text, depth: node.depth })
  })
  return entries
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/guides/toc.test.ts`
Expected: PASS. If the dedupe test produces different ids than `setup-1`, check github-slugger version behavior and align the test with what `rehype-slug` actually emits (they must match — that is the invariant).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guides/toc.ts src/lib/guides/toc.test.ts
git commit -m "feat(guides): build-time TOC extraction matching rehype-slug ids"
```

---

### Task 5: Content module (reader + merge + queries)

**Files:**
- Create: `src/lib/guides/content.ts`, fixtures under `src/lib/guides/__fixtures__/`
- Test: `src/lib/guides/content.test.ts`

**Interfaces:**
- Consumes: `guideFrontmatterSchema`, `localeFrontmatterSchema`, `SLUG_PATTERN` (Task 2); `getReadTimeMinutes` (Task 3); `extractToc` (Task 4); `Locale` from `@/lib/i18n/routing`.
- Produces (all take optional trailing `contentDir = GUIDES_CONTENT_DIR`):
  - `GUIDES_CONTENT_DIR: string` (`path.join(process.cwd(), 'src/content/guides')`)
  - `getAllGuideSlugs(contentDir?): string[]`
  - `getVisibleGuides(locale, contentDir?): GuideListItem[]` — live + (draft in dev), sorted `publishedAt` desc
  - `getLiveGuides(locale, contentDir?): GuideListItem[]` — live only
  - `hasVisibleGuides(contentDir?): boolean`
  - `getGuide(slug, locale, contentDir?): Guide | null` — null when unknown or not visible
  - `getGuidesForTool(toolSlug, locale, contentDir?): Array<{ slug: string; title: string }>`
- Module starts with `import 'server-only'` (aliased in vitest).

- [ ] **Step 1: Create fixtures**

`src/lib/guides/__fixtures__/live-guide/en.mdx`:

```mdx
---
title: Fixture Live Guide
description: A live guide fixture for tests.
category: techniques
relatedTools: [focus-stacking-calculator]
publishedAt: 2026-01-10
updatedAt: 2026-02-01
status: live
---

## First Section

Some body text with enough words to count.

## Second Section

More text here.
```

`src/lib/guides/__fixtures__/live-guide/es.mdx`:

```mdx
---
title: Guía fija en vivo
description: Una guía fija para pruebas.
sourceHash: aaaaaaaaaaaa
---

## Primera sección

Texto del cuerpo en español.
```

`src/lib/guides/__fixtures__/draft-guide/en.mdx`:

```mdx
---
title: Fixture Draft Guide
description: A draft guide fixture.
category: gear
relatedTools: [focus-stacking-calculator, dof-simulator]
publishedAt: 2026-03-01
updatedAt: 2026-03-01
status: draft
---

## Only Section

Draft body.
```

- [ ] **Step 2: Write the failing tests**

`src/lib/guides/content.test.ts`:

```ts
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getAllGuideSlugs, getGuide, getGuidesForTool, getLiveGuides, getVisibleGuides, hasVisibleGuides } from './content'

const FIXTURES = path.join(__dirname, '__fixtures__')

describe('content module (NODE_ENV=test behaves like prod: drafts hidden)', () => {
  it('lists all slugs from directory names', () => {
    expect(getAllGuideSlugs(FIXTURES).sort()).toEqual(['draft-guide', 'live-guide'])
  })
  it('getLiveGuides returns only live guides with locale titles', () => {
    const en = getLiveGuides('en', FIXTURES)
    expect(en.map((g) => g.slug)).toEqual(['live-guide'])
    expect(en[0].title).toBe('Fixture Live Guide')
    expect(en[0].readTimeMinutes).toBeGreaterThanOrEqual(1)
    const es = getLiveGuides('es', FIXTURES)
    expect(es[0].title).toBe('Guía fija en vivo')
  })
  it('getVisibleGuides hides drafts outside development', () => {
    expect(getVisibleGuides('en', FIXTURES).map((g) => g.slug)).toEqual(['live-guide'])
    expect(hasVisibleGuides(FIXTURES)).toBe(true)
  })
  it('getGuide merges structural (en) + translatable (locale) and computes toc/body', () => {
    const guide = getGuide('live-guide', 'es', FIXTURES)
    expect(guide).not.toBeNull()
    expect(guide?.category).toBe('techniques')
    expect(guide?.title).toBe('Guía fija en vivo')
    expect(guide?.toc.map((e) => e.id)).toEqual(['primera-sección'])
    expect(guide?.body).toContain('Primera sección')
  })
  it('getGuide returns null for drafts (prod behavior) and unknown slugs', () => {
    expect(getGuide('draft-guide', 'en', FIXTURES)).toBeNull()
    expect(getGuide('nope', 'en', FIXTURES)).toBeNull()
  })
  it('getGuide falls back to en body when a locale file is missing', () => {
    const guide = getGuide('live-guide', 'ja', FIXTURES)
    expect(guide?.title).toBe('Fixture Live Guide')
  })
  it('getGuidesForTool matches relatedTools across live guides only', () => {
    expect(getGuidesForTool('focus-stacking-calculator', 'en', FIXTURES)).toEqual([
      { slug: 'live-guide', title: 'Fixture Live Guide' },
    ])
    expect(getGuidesForTool('dof-simulator', 'en', FIXTURES)).toEqual([])
  })
  it('empty/missing content dir yields empty results, not throws', () => {
    const empty = path.join(__dirname, '__fixtures__', 'does-not-exist')
    expect(getAllGuideSlugs(empty)).toEqual([])
    expect(hasVisibleGuides(empty)).toBe(false)
  })
})
```

Note: the TOC id `primera-sección` — github-slugger keeps non-Latin word characters. If the actual slug differs, align the fixture expectation with real output (invariant is rehype-slug parity, not a specific transliteration).

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/guides/content.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `content.ts`**

```ts
import 'server-only'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { Locale } from '@/lib/i18n/routing'
import { getReadTimeMinutes } from './read-time'
import { guideFrontmatterSchema, localeFrontmatterSchema, SLUG_PATTERN } from './schema'
import { extractToc } from './toc'
import type { Guide, GuideFrontmatter, GuideListItem } from './types'

export const GUIDES_CONTENT_DIR = path.join(process.cwd(), 'src/content/guides')

function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function getAllGuideSlugs(contentDir: string = GUIDES_CONTENT_DIR): string[] {
  if (!existsSync(contentDir)) return []
  return readdirSync(contentDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && SLUG_PATTERN.test(e.name))
    .map((e) => e.name)
}

function readEnFrontmatter(slug: string, contentDir: string): { fm: GuideFrontmatter; body: string } {
  const raw = readFileSync(path.join(contentDir, slug, 'en.mdx'), 'utf8')
  const { data, content } = matter(raw)
  return { fm: guideFrontmatterSchema.parse(data), body: content }
}

function readLocaleFile(
  slug: string,
  locale: Locale,
  contentDir: string
): { title: string; description: string; heroImageAlt?: string; body: string } | null {
  const file = path.join(contentDir, slug, `${locale}.mdx`)
  if (!existsSync(file)) return null
  const { data, content } = matter(readFileSync(file, 'utf8'))
  const fm = localeFrontmatterSchema.parse(data)
  return { title: fm.title, description: fm.description, heroImageAlt: fm.heroImageAlt, body: content }
}

function isVisible(fm: GuideFrontmatter): boolean {
  return fm.status === 'live' || isDev()
}

function toListItem(slug: string, fm: GuideFrontmatter, locale: Locale, contentDir: string): GuideListItem {
  // Locale-file fallback to en is reachable only for dev drafts — the parity
  // check forbids live guides with missing locale files.
  const loc = locale === 'en' ? null : readLocaleFile(slug, locale, contentDir)
  const enBody = readEnFrontmatter(slug, contentDir).body
  const body = loc?.body ?? enBody
  const heroImage = fm.heroImage
    ? { src: fm.heroImage.src, alt: loc?.heroImageAlt ?? fm.heroImage.alt }
    : undefined
  return {
    slug,
    title: loc?.title ?? fm.title,
    description: loc?.description ?? fm.description,
    category: fm.category,
    readTimeMinutes: getReadTimeMinutes(body, locale),
    updatedAt: fm.updatedAt,
    heroImage,
  }
}

function visibleEntries(contentDir: string): Array<{ slug: string; fm: GuideFrontmatter }> {
  return getAllGuideSlugs(contentDir)
    .map((slug) => ({ slug, fm: readEnFrontmatter(slug, contentDir).fm }))
    .filter(({ fm }) => isVisible(fm))
    .sort((a, b) => b.fm.publishedAt.localeCompare(a.fm.publishedAt))
}

export function getVisibleGuides(locale: Locale, contentDir: string = GUIDES_CONTENT_DIR): GuideListItem[] {
  return visibleEntries(contentDir).map(({ slug, fm }) => toListItem(slug, fm, locale, contentDir))
}

export function getLiveGuides(locale: Locale, contentDir: string = GUIDES_CONTENT_DIR): GuideListItem[] {
  return visibleEntries(contentDir)
    .filter(({ fm }) => fm.status === 'live')
    .map(({ slug, fm }) => toListItem(slug, fm, locale, contentDir))
}

export function hasVisibleGuides(contentDir: string = GUIDES_CONTENT_DIR): boolean {
  return visibleEntries(contentDir).length > 0
}

export function getGuide(slug: string, locale: Locale, contentDir: string = GUIDES_CONTENT_DIR): Guide | null {
  if (!getAllGuideSlugs(contentDir).includes(slug)) return null
  const { fm, body: enBody } = readEnFrontmatter(slug, contentDir)
  if (!isVisible(fm)) return null
  const loc = locale === 'en' ? null : readLocaleFile(slug, locale, contentDir)
  const body = loc?.body ?? enBody
  const item = toListItem(slug, fm, locale, contentDir)
  return {
    ...item,
    publishedAt: fm.publishedAt,
    status: fm.status,
    author: fm.author,
    relatedTools: fm.relatedTools,
    relatedGuides: fm.relatedGuides ?? [],
    toc: extractToc(body),
    body,
  }
}

export function getGuidesForTool(
  toolSlug: string,
  locale: Locale,
  contentDir: string = GUIDES_CONTENT_DIR
): Array<{ slug: string; title: string }> {
  return visibleEntries(contentDir)
    .filter(({ fm }) => fm.status === 'live' && fm.relatedTools.includes(toolSlug))
    .map(({ slug, fm }) => {
      const loc = locale === 'en' ? null : readLocaleFile(slug, locale, contentDir)
      return { slug, title: loc?.title ?? fm.title }
    })
}
```

If this file exceeds 200 lines, split `toListItem`/`readEnFrontmatter`/`readLocaleFile` into `src/lib/guides/read.ts` and re-export.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/guides/content.test.ts`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/guides/content.ts src/lib/guides/content.test.ts src/lib/guides/__fixtures__
git commit -m "feat(guides): server-only content module with en+locale merge"
```

---

### Task 6: check-guide-translations script

**Files:**
- Create: `scripts/check-guide-translations.mjs`
- Test: `scripts/check-guide-translations.test.mjs`, fixtures under `scripts/__fixtures__/guide-translations/`

**Interfaces:**
- Consumes: guide content layout on disk; locale list discovered from `src/lib/i18n/messages/` directory names (same convention as `check-translations.mjs`).
- Produces: `checkGuides(contentDir, localesDir)` returning `{ errors: string[], warnings: string[] }`, and `computeSourceHash(enRaw: string): string` (sha256 of en body + title + description + heroImage.alt, first 12 hex chars). CLI: exit 1 on errors; warnings print but exit 0.

- [ ] **Step 1: Create fixtures**

`scripts/__fixtures__/guide-translations/messages/` — create empty dirs `en`, `es`, `ja` (three locales keeps the fixture small; the real run discovers all 31). Add a `.gitkeep` file in each.

`scripts/__fixtures__/guide-translations/content/good-live/en.mdx`:

```mdx
---
title: Good Guide
description: Complete guide.
category: techniques
relatedTools: []
publishedAt: 2026-01-01
updatedAt: 2026-01-01
status: live
---

## Intro

<Callout type="tip">Text</Callout>
```

`scripts/__fixtures__/guide-translations/content/good-live/es.mdx` and `ja.mdx` — both:

```mdx
---
title: Título
description: Descripción.
sourceHash: PLACEHOLDER
---

## Introducción

<Callout type="tip">Texto</Callout>
```

(Compute the real `sourceHash` for `es.mdx` in the test via the exported `computeSourceHash`; leave `ja.mdx` with the wrong hash `PLACEHOLDER` to exercise the staleness warning. To keep fixtures static: after implementing, run the script once, print the correct hash, and bake it into `es.mdx`.)

`scripts/__fixtures__/guide-translations/content/bad-live/en.mdx` — same frontmatter shape as `good-live`, `status: live`, body `## Intro\n\n<Callout type="tip">Text</Callout>`. It has only an `es.mdx` sibling (`ja.mdx` missing entirely — parity error). That `es.mdx` frontmatter contains the required keys (`title: Malo`, `description: Mala.`, `sourceHash: bbbbbbbbbbbb`) PLUS the illegal key `category: gear` (allowed-keys error), and its body is `## Intro` with the `<Callout>` **omitted** (tag-parity error).

`scripts/__fixtures__/guide-translations/content/draft-only-en/en.mdx` — `status: draft`, body `## Intro`, no locale siblings (must produce no errors).

- [ ] **Step 2: Write the failing test**

`scripts/check-guide-translations.test.mjs`:

```js
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkGuides, computeSourceHash } from './check-guide-translations.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'guide-translations')
const CONTENT = path.join(ROOT, 'content')
const MESSAGES = path.join(ROOT, 'messages')

describe('checkGuides', () => {
  it('passes a complete live guide and a draft without siblings', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    const relevant = errors.filter((e) => e.includes('good-live') || e.includes('draft-only-en'))
    expect(relevant).toEqual([])
  })
  it('errors on missing locale file for a live guide', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    expect(errors.some((e) => e.includes('bad-live') && e.includes('ja.mdx'))).toBe(true)
  })
  it('errors on illegal frontmatter keys in a locale file', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    expect(errors.some((e) => e.includes('bad-live') && e.includes('category'))).toBe(true)
  })
  it('errors on component-tag mismatch', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    expect(errors.some((e) => e.includes('bad-live') && e.includes('Callout'))).toBe(true)
  })
  it('warns (not errors) on stale sourceHash', () => {
    const { errors, warnings } = checkGuides(CONTENT, MESSAGES)
    expect(warnings.some((w) => w.includes('good-live') && w.includes('ja.mdx'))).toBe(true)
    expect(errors.some((e) => e.includes('stale'))).toBe(false)
  })
  it('computeSourceHash is stable and 12 hex chars', () => {
    const h = computeSourceHash('---\ntitle: T\ndescription: D\n---\nbody')
    expect(h).toMatch(/^[0-9a-f]{12}$/)
    expect(computeSourceHash('---\ntitle: T\ndescription: D\n---\nbody')).toBe(h)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/check-guide-translations.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the script**

`scripts/check-guide-translations.mjs`:

```js
// Guide translation parity checker.
// Hard failures (exit 1): live guide missing locale files, illegal locale
// frontmatter keys, missing required locale keys, component-tag mismatch.
// Warnings (exit 0): stale sourceHash — refresh before the next publish wave.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import matter from 'gray-matter'

const ALLOWED_LOCALE_KEYS = new Set(['title', 'description', 'heroImageAlt', 'sourceHash'])
const REQUIRED_LOCALE_KEYS = ['title', 'description', 'sourceHash']
const TAG_PATTERN = /<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g
const STRUCTURAL_ATTRS = ['src', 'slug', 'type']

export function computeSourceHash(enRaw) {
  const { data, content } = matter(enRaw)
  const basis = [content, data.title ?? '', data.description ?? '', data.heroImage?.alt ?? ''].join('\n')
  return createHash('sha256').update(basis).digest('hex').slice(0, 12)
}

function componentSignature(body) {
  const tags = []
  for (const m of body.matchAll(TAG_PATTERN)) {
    const attrs = STRUCTURAL_ATTRS.map((a) => {
      const found = m[2].match(new RegExp(`${a}="([^"]*)"`))
      return found ? `${a}=${found[1]}` : null
    }).filter(Boolean)
    tags.push(`${m[1]}(${attrs.join(',')})`)
  }
  return tags.sort().join('|')
}

export function checkGuides(contentDir, messagesDir) {
  const errors = []
  const warnings = []
  const locales = readdirSync(messagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((l) => l !== 'en')
  if (!existsSync(contentDir)) return { errors, warnings }

  for (const slug of readdirSync(contentDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const enPath = path.join(contentDir, slug, 'en.mdx')
    if (!existsSync(enPath)) {
      errors.push(`${slug}: missing en.mdx`)
      continue
    }
    const enRaw = readFileSync(enPath, 'utf8')
    const en = matter(enRaw)
    const expectedHash = computeSourceHash(enRaw)
    const enSignature = componentSignature(en.content)
    if (en.data.status !== 'live') continue

    for (const locale of locales) {
      const file = path.join(contentDir, slug, `${locale}.mdx`)
      if (!existsSync(file)) {
        errors.push(`${slug}: live guide missing ${locale}.mdx`)
        continue
      }
      const loc = matter(readFileSync(file, 'utf8'))
      for (const key of Object.keys(loc.data)) {
        if (!ALLOWED_LOCALE_KEYS.has(key)) errors.push(`${slug}/${locale}.mdx: illegal frontmatter key "${key}"`)
      }
      for (const key of REQUIRED_LOCALE_KEYS) {
        if (!loc.data[key]) errors.push(`${slug}/${locale}.mdx: missing required key "${key}"`)
      }
      const locSignature = componentSignature(loc.content)
      if (locSignature !== enSignature) {
        errors.push(
          `${slug}/${locale}.mdx: component-tag mismatch (Callout/Figure/ToolCard set or structural attrs differ from en.mdx)`
        )
      }
      if (loc.data.sourceHash && loc.data.sourceHash !== expectedHash) {
        warnings.push(`${slug}/${locale}.mdx: stale translation (sourceHash ${loc.data.sourceHash} != ${expectedHash})`)
      }
    }
  }
  return { errors, warnings }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  const { errors, warnings } = checkGuides('src/content/guides', 'src/lib/i18n/messages')
  for (const w of warnings) console.warn(`WARN  ${w}`)
  for (const e of errors) console.error(`ERROR ${e}`)
  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s).`)
    process.exit(1)
  }
  console.log(`Guide translations OK — ${warnings.length} warning(s).`)
}
```

Bake the correct `sourceHash` into `es.mdx` of the `good-live` fixture: run `node -e "import('./scripts/check-guide-translations.mjs').then(m => console.log(m.computeSourceHash(require('fs').readFileSync('scripts/__fixtures__/guide-translations/content/good-live/en.mdx','utf8'))))"` and replace `PLACEHOLDER` in `es.mdx` (leave `ja.mdx` stale).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run scripts/check-guide-translations.test.mjs && node scripts/check-guide-translations.mjs`
Expected: tests PASS; CLI prints `Guide translations OK — 0 warning(s).` (no real content yet).

- [ ] **Step 6: Commit**

```bash
git add scripts/check-guide-translations.mjs scripts/check-guide-translations.test.mjs scripts/__fixtures__
git commit -m "feat(guides): translation parity check script (hard parity, soft staleness)"
```

---

### Task 7: Analytics events

**Files:**
- Modify: `src/lib/analytics/types.ts`, `src/lib/analytics/index.ts`
- Test: extend the existing analytics test file next to `index.ts` (find it via `ls src/lib/analytics/*.test.ts`; if none exists for the wrappers, add cases to the nearest existing analytics test or create `src/lib/analytics/guides-events.test.ts`)

**Interfaces:**
- Consumes: existing `dispatch(eventName, properties)` internals of `index.ts` (mirror `trackNavClick` exactly).
- Produces:
  - `types.ts`: `GuideToolClickEvent = { guide_slug: string; tool_slug: string; source: 'tool-card' | 'related-rail' }`, `ToolGuideClickEvent = { tool_slug: string; guide_slug: string }`, plus two arms added to the `AnalyticsEvent` union (`'guide_tool_click'`, `'tool_guide_click'`), both names added to `POSTHOG_ONLY_EVENTS`.
  - `index.ts`: `trackGuideToolClick(props: GuideToolClickEvent): void`, `trackToolGuideClick(props: ToolGuideClickEvent): void`.

- [ ] **Step 1: Read `src/lib/analytics/types.ts` and `src/lib/analytics/index.ts` fully.** Locate `NavClickEvent`, the `AnalyticsEvent` union, `POSTHOG_ONLY_EVENTS`, and the `trackNavClick` wrapper.

- [ ] **Step 2: Write the failing test** (adapt the import/mocking style of the existing analytics tests — read one first and copy its setup):

```ts
import { describe, expect, it, vi } from 'vitest'

describe('guide analytics wrappers', () => {
  it('exports trackGuideToolClick and trackToolGuideClick', async () => {
    const mod = await import('./index')
    expect(typeof mod.trackGuideToolClick).toBe('function')
    expect(typeof mod.trackToolGuideClick).toBe('function')
  })
})
```

If the existing analytics tests assert dispatch payloads via provider mocks, add equivalent payload assertions for both events in the same style.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/analytics`
Expected: new test FAILS (missing exports); existing tests PASS.

- [ ] **Step 4: Implement** — in `types.ts` add next to `NavClickEvent`:

```ts
export type GuideToolClickEvent = {
  guide_slug: string
  tool_slug: string
  source: 'tool-card' | 'related-rail'
}

export type ToolGuideClickEvent = {
  tool_slug: string
  guide_slug: string
}
```

Add union arms following the existing pattern (`| { name: 'guide_tool_click'; properties: GuideToolClickEvent }` and the `tool_guide_click` equivalent), and add both event names to `POSTHOG_ONLY_EVENTS`. In `index.ts` add wrappers mirroring `trackNavClick`:

```ts
export function trackGuideToolClick(props: GuideToolClickEvent): void {
  dispatch('guide_tool_click', props)
}

export function trackToolGuideClick(props: ToolGuideClickEvent): void {
  dispatch('tool_guide_click', props)
}
```

- [ ] **Step 5: Run tests + type-check, then commit**

Run: `npx vitest run src/lib/analytics && npm run type-check`
Expected: PASS.

```bash
git add src/lib/analytics
git commit -m "feat(guides): typed guide_tool_click / tool_guide_click analytics events"
```

---

### Task 8: i18n chrome — guides.json + common/metadata keys × 31 locales

**Files:**
- Create: `src/lib/i18n/messages/<locale>/guides.json` for all 31 locales
- Modify: `src/lib/i18n/messages/<locale>/common.json` (all 31), `src/lib/i18n/messages/<locale>/metadata.json` (all 31), `src/lib/i18n/request.ts` (register `'guides'` in `CORE_FILES`)

**Interfaces:**
- Consumes: locale list from `src/lib/i18n/routing.ts`; terminology from `src/lib/i18n/glossary.photography.json`.
- Produces: the `guides` namespace (`useTranslations('guides')`), `common.nav.guides`, `common.footer.guides`, `common.learn.guidesTitle`, `common.draft.guideBanner`, `metadata.guides.{title,description}` — in every locale.

- [ ] **Step 1: Write `src/lib/i18n/messages/en/guides.json`** (root key `"guides"`, matching the core-file convention):

```json
{
  "guides": {
    "indexTitle": "Photography Guides",
    "indexSubtitle": "In-depth, gear-neutral photography guides — techniques, gear advice, and editing walkthroughs, each paired with our free interactive tools.",
    "categories": {
      "techniques": {
        "name": "Techniques",
        "blurb": "Field-tested shooting techniques, from macro to birds in flight."
      },
      "gear": {
        "name": "Gear",
        "blurb": "How to choose equipment by the criteria that matter — not the brand."
      },
      "editing": {
        "name": "Editing",
        "blurb": "Post-processing and color grading, explained from first principles."
      }
    },
    "readTime": "{minutes, plural, one {# min read} other {# min read}}",
    "updated": "Updated {date}",
    "onThisPage": "On this page",
    "relatedTools": "Try the tools",
    "relatedGuides": "Related guides",
    "backToGuides": "All guides",
    "byLabel": "By {name}",
    "teaserTitle": "Photography Guides",
    "teaserSubtitle": "Long-form guides that pair with the tools",
    "teaserCta": "Browse all guides"
  }
}
```

- [ ] **Step 2: Add English keys to `en/common.json` and `en/metadata.json`**

In `common.json`: `nav.guides: "Guides"`, `footer.guides: "Guides"`, `learn.guidesTitle: "Related guides"`, `draft.guideBanner: "Preview — This guide is not yet public"` (place each inside the existing sub-object).
In `metadata.json` under the `metadata` root: `"guides": { "title": "Photography Guides — Techniques, Gear & Editing", "description": "Free in-depth photography guides: shooting techniques, gear-buying advice, and editing walkthroughs — gear-neutral and paired with interactive tools." }`.

- [ ] **Step 3: Register the namespace** — in `src/lib/i18n/request.ts` add `'guides'` to the `CORE_FILES` array (line ~5).

- [ ] **Step 4: Translate into the other 30 locales**

For each locale in `routing.ts` except `en`: create `guides.json` and add the four `common.json` keys and the `metadata.json` entry, translating naturally (not word-for-word), using `src/lib/i18n/glossary.photography.json` for photography terms. Keep ICU syntax intact in `readTime` (`{minutes, plural, one {…} other {…}}` — some locales need more plural categories, e.g. `few`/`many` for `ru`/`pl`/`uk`/`cs`/`ro`; add them). Keep `{date}` / `{name}` placeholders verbatim.

- [ ] **Step 5: Verify**

Run: `node scripts/check-translations.mjs && node scripts/find-english-leaks.mjs && npx vitest run src/lib/i18n && npm run type-check`
Expected: all green — every locale complete, no hard English leaks, translation structure tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n
git commit -m "feat(guides): i18n chrome for the guides section across 31 locales"
```

---

### Task 9: Embed components (Callout, Figure, ToolCard)

**Files:**
- Create: `src/components/guides/Callout.tsx` + `Callout.module.css`, `src/components/guides/Figure.tsx` + `Figure.module.css`, `src/components/guides/ToolCard.tsx` + `ToolCard.module.css`
- Test: `src/components/guides/Callout.test.tsx`, `src/components/guides/ToolCard.test.tsx`

**Interfaces:**
- Consumes: `getToolBySlug`, `getToolStatus` from `@/lib/data/tools`; `ToolIcon` from `@/components/shared/ToolIcon`; `Link` from `@/lib/i18n/navigation`; `trackGuideToolClick` (Task 7); `imageSize` from `image-size`.
- Produces:
  - `Callout({ type, children }: { type: 'tip' | 'warning'; children: ReactNode })` — server-compatible.
  - `Figure({ src, alt, caption }: { src: string; alt: string; caption?: string })` — **server component**, reads intrinsic dimensions from `public/` at build.
  - `ToolCard({ slug, guideSlug }: { slug: string; guideSlug?: string })` — **client component**, renders nothing for unknown/disabled tools, fires `trackGuideToolClick` on click.

These live in a new `src/components/guides/` directory (guide-only building blocks, not `shared/` — nothing else uses them).

- [ ] **Step 1: Write the failing tests**

`src/components/guides/Callout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Callout } from './Callout'

describe('Callout', () => {
  it('renders children with the type styling hook', () => {
    render(<Callout type="tip">Use a tripod.</Callout>)
    const el = screen.getByText('Use a tripod.').closest('aside')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('tip')
  })
})
```

`src/components/guides/ToolCard.test.tsx` (wrap in `NextIntlClientProvider` — copy the provider setup pattern from an existing shared-component test, e.g. `RelatedTools`; supply the `tools` namespace messages from `@/lib/i18n/messages/en/tools.json`):

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import messages from '@/lib/i18n/messages/en/tools.json'
import { ToolCard } from './ToolCard'

function renderCard(slug: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ToolCard slug={slug} guideSlug="test-guide" />
    </NextIntlClientProvider>
  )
}

describe('ToolCard', () => {
  it('renders name and link for a known tool', () => {
    renderCard('fov-simulator')
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('/fov-simulator'))
  })
  it('renders nothing for an unknown tool slug', () => {
    const { container } = renderCard('does-not-exist')
    expect(container.innerHTML).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/guides`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/components/guides/Callout.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from './Callout.module.css'

interface CalloutProps {
  type: 'tip' | 'warning'
  children: ReactNode
}

export function Callout({ type, children }: CalloutProps) {
  return <aside className={`${styles.callout} ${styles[type]}`}>{children}</aside>
}
```

`Callout.module.css` (tokens only — check `globals.css` for the exact amber/accent variables the LearnPanel pro-tips callout uses and reuse them):

```css
.callout {
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  padding: var(--space-sm) var(--space-md);
  margin: var(--space-md) 0;
  background: var(--surface-2, rgba(255, 255, 255, 0.04));
  font-size: var(--text-sm);
}
.warning {
  border-left-color: #f59e0b;
}
```

(Before writing, `grep -n "surface" src/app/globals.css` — use the real surface token names; `#f59e0b` matches DraftBanner's amber.)

`src/components/guides/Figure.tsx`:

```tsx
import { readFileSync } from 'node:fs'
import path from 'node:path'
import Image from 'next/image'
import { imageSize } from 'image-size'
import styles from './Figure.module.css'

interface FigureProps {
  src: string
  alt: string
  caption?: string
}

export function Figure({ src, alt, caption }: FigureProps) {
  const buffer = readFileSync(path.join(process.cwd(), 'public', src))
  const { width, height } = imageSize(buffer)
  return (
    <figure className={styles.figure}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        sizes="(max-width: 1023px) 100vw, 720px"
        className={styles.image}
      />
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  )
}
```

`Figure.module.css`:

```css
.figure {
  margin: var(--space-lg) 0;
}
.image {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
.caption {
  margin-top: var(--space-xs);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-align: center;
}
```

(Verify `--text-secondary` exists in `globals.css`; substitute the repo's actual muted-text token.)

`src/components/guides/ToolCard.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { trackGuideToolClick } from '@/lib/analytics'
import { getToolBySlug, getToolStatus } from '@/lib/data/tools'
import { ToolIcon } from '@/components/shared/ToolIcon'
import { Link } from '@/lib/i18n/navigation'
import styles from './ToolCard.module.css'

interface ToolCardProps {
  slug: string
  guideSlug?: string
}

export function ToolCard({ slug, guideSlug }: ToolCardProps) {
  const t = useTranslations('tools')
  const tool = getToolBySlug(slug)
  if (!tool || getToolStatus(tool) === 'disabled') return null
  return (
    <Link
      href={`/${tool.slug}`}
      prefetch={false}
      className={styles.card}
      onClick={() => {
        if (guideSlug) trackGuideToolClick({ guide_slug: guideSlug, tool_slug: tool.slug, source: 'tool-card' })
      }}
    >
      <ToolIcon slug={tool.slug} width={20} height={20} />
      <span className={styles.text}>
        <span className={styles.name}>{t(`${tool.slug}.name`)}</span>
        <span className={styles.description}>{t(`${tool.slug}.description`)}</span>
      </span>
    </Link>
  )
}
```

(Before writing, read `src/components/shared/RelatedTools.tsx` and its CSS module — if the dynamic `t()` keys need the `as Parameters<typeof t>[0]` cast there, apply the same cast here. Style `ToolCard.module.css` after RelatedTools' `.card` styles: same border, radius, hover.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/guides && npm run type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/guides
git commit -m "feat(guides): Callout, Figure, and ToolCard embed components"
```

---

### Task 10: Guide index page

**Files:**
- Create: `src/app/[locale]/guides/page.tsx`, `src/app/[locale]/guides/page.module.css`, `src/components/guides/GuideCard.tsx` + `GuideCard.module.css`

**Interfaces:**
- Consumes: `getVisibleGuides`, `hasVisibleGuides` (Task 5); `getAlternates`; `guides` + `metadata.guides` namespaces (Task 8).
- Produces: `/[locale]/guides` static page — 404 when no visible guides; category sections; `GuideCard({ guide, locale }: { guide: GuideListItem; locale: string })` server component.

- [ ] **Step 1: Implement `GuideCard.tsx`** (server component; date formatted with `Intl.DateTimeFormat`):

```tsx
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/lib/i18n/navigation'
import type { GuideListItem } from '@/lib/guides/types'
import styles from './GuideCard.module.css'

interface GuideCardProps {
  guide: GuideListItem
  locale: string
}

export function GuideCard({ guide, locale }: GuideCardProps) {
  const t = useTranslations('guides')
  const updated = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(guide.updatedAt))
  return (
    <Link href={`/guides/${guide.slug}`} prefetch={false} className={styles.card}>
      {guide.heroImage && (
        <Image src={guide.heroImage.src} alt={guide.heroImage.alt} width={640} height={360} className={styles.thumb} />
      )}
      <span className={styles.body}>
        <span className={styles.title}>{guide.title}</span>
        <span className={styles.description}>{guide.description}</span>
        <span className={styles.meta}>
          {t('readTime', { minutes: guide.readTimeMinutes })} · {t('updated', { date: updated })}
        </span>
      </span>
    </Link>
  )
}
```

`GuideCard.module.css` — card grid item: token-based border (`1px solid var(--border, …)` — verify the border token in `globals.css`), radius 8px, hover elevation matching homepage tool cards (read `src/app/[locale]/page.module.css` for the exact hover pattern and copy it).

- [ ] **Step 2: Implement the index page**

`src/app/[locale]/guides/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GuideCard } from '@/components/guides/GuideCard'
import { getVisibleGuides } from '@/lib/guides/content'
import type { GuideCategory } from '@/lib/guides/types'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import styles from './page.module.css'

const CATEGORY_ORDER: GuideCategory[] = ['techniques', 'gear', 'editing']

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.guides')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description }, alternates: getAlternates('/guides', locale as Locale) }
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const guides = getVisibleGuides(locale as Locale)
  if (guides.length === 0) notFound()
  const t = await getTranslations('guides')
  return (
    <div className={styles.outer}>
      <header className={styles.header}>
        <h1>{t('indexTitle')}</h1>
        <p className={styles.subtitle}>{t('indexSubtitle')}</p>
      </header>
      {CATEGORY_ORDER.map((category) => {
        const inCategory = guides.filter((g) => g.category === category)
        if (inCategory.length === 0) return null
        return (
          <section key={category} className={styles.categorySection}>
            <h2>{t(`categories.${category}.name`)}</h2>
            <p className={styles.blurb}>{t(`categories.${category}.blurb`)}</p>
            <div className={styles.grid}>
              {inCategory.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} locale={locale} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

`page.module.css` — content-page shell copied from the glossary pattern:

```css
.outer {
  max-width: var(--page-width-content);
  margin: 0 auto;
  padding: var(--space-xl) var(--space-md);
}
.subtitle {
  color: var(--text-secondary);
  max-width: var(--page-width-prose);
}
.categorySection {
  margin-top: var(--space-xl);
}
.blurb {
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}
```

(Verify token names against `globals.css` before writing; substitute the repo's actual spacing/text tokens if these differ.)

- [ ] **Step 3: Verify in dev and prod modes**

Run: `npm run dev` then open `http://localhost:3200/en/guides`.
Expected NOW (no content yet): **404** — correct, `getVisibleGuides` is empty. This page becomes viewable in Task 15 when the draft guide lands.
Run: `npm run type-check && npx vitest run`
Expected: PASS (no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/guides src/components/guides/GuideCard.tsx src/components/guides/GuideCard.module.css
git commit -m "feat(guides): guides index page with category sections (404 when empty)"
```

---

### Task 11: TOC sidebar with scroll-spy

**Files:**
- Create: `src/components/guides/GuideToc.tsx` + `GuideToc.module.css`
- Test: `src/components/guides/GuideToc.test.tsx`

**Interfaces:**
- Consumes: `TocEntry` from `@/lib/guides/types`; `guides.onThisPage` string.
- Produces: `GuideToc({ entries }: { entries: TocEntry[] })` — client component; renders anchor list; highlights the active heading. **Important:** desktop scrolling happens inside `<main>` (`ThemeProvider.module.css .main`), NOT `window` — use `IntersectionObserver` with the default viewport root (headings inside the scrolled `<main>` still intersect the viewport correctly) and `scrollIntoView({ behavior: 'smooth' })` for clicks, never `window.scrollTo`.

- [ ] **Step 1: Write the failing test**

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import guidesMessages from '@/lib/i18n/messages/en/guides.json'
import { GuideToc } from './GuideToc'

const entries = [
  { id: 'setup', text: 'Setup', depth: 2 as const },
  { id: 'lighting', text: 'Lighting', depth: 3 as const },
]

describe('GuideToc', () => {
  it('renders one anchor per entry with depth styling', () => {
    render(
      <NextIntlClientProvider locale="en" messages={guidesMessages}>
        <GuideToc entries={entries} />
      </NextIntlClientProvider>
    )
    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup')
    expect(screen.getByRole('link', { name: 'Lighting' }).className).toContain('depth3')
  })
  it('renders nothing with fewer than 2 entries', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={guidesMessages}>
        <GuideToc entries={[entries[0]]} />
      </NextIntlClientProvider>
    )
    expect(container.innerHTML).toBe('')
  })
})
```

(jsdom lacks `IntersectionObserver` — if the existing test setup doesn't stub it, add a minimal stub in this test file: `vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guides/GuideToc.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TocEntry } from '@/lib/guides/types'
import styles from './GuideToc.module.css'

interface GuideTocProps {
  entries: TocEntry[]
}

export function GuideToc({ entries }: GuideTocProps) {
  const t = useTranslations('guides')
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (entries.length < 2) return
    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: '0px 0px -70% 0px' }
    )
    for (const entry of entries) {
      const el = document.getElementById(entry.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [entries])

  if (entries.length < 2) return null

  return (
    <nav className={styles.toc} aria-label={t('onThisPage')}>
      <span className={styles.heading}>{t('onThisPage')}</span>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={`${styles.link} ${styles[`depth${entry.depth}`]} ${activeId === entry.id ? styles.active : ''}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth' })
                history.replaceState(null, '', `#${entry.id}`)
              }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

`GuideToc.module.css`: compact list, `font-size: var(--text-xs)`, `.depth3 { padding-left: var(--space-sm) }`, `.active { color: var(--accent) }`, muted default link color.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guides/GuideToc.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/GuideToc.tsx src/components/guides/GuideToc.module.css src/components/guides/GuideToc.test.tsx
git commit -m "feat(guides): TOC sidebar with viewport-based scroll-spy"
```

---

### Task 12: Guide article page

**Files:**
- Create: `src/app/[locale]/guides/[slug]/page.tsx`, `page.module.css`, `src/components/guides/GuideJsonLd.tsx`, `src/components/guides/RelatedGuides.tsx` (+ module css), `src/components/guides/MdxA.tsx`

**Interfaces:**
- Consumes: `getGuide`, `getVisibleGuides` (Task 5); `GuideToc` (Task 11); `Callout`/`Figure`/`ToolCard` (Task 9); `AdUnit`; `DraftBanner` (extended below); `AUTHORS`; `getAlternates`; `localeOpenGraph` if needed.
- Produces:
  - Static route `/[locale]/guides/[slug]` with `generateStaticParams` + `export const dynamicParams = false`.
  - `GuideJsonLd({ guide, locale, slug }: { guide: Guide; locale: string; slug: string })` — server component emitting `Article` + `BreadcrumbList` `<script type="application/ld+json">` (inline-script pattern from the glossary page).
  - `RelatedGuides({ slugs, locale }: { slugs: string[]; locale: Locale })` — server component listing related guides by translated title (renders null when empty).
  - `DraftBanner` gains an optional prop: `messageKey?: 'banner' | 'guideBanner'` (default `'banner'`), reading `common.draft` as today.

- [ ] **Step 1: Extend DraftBanner** — modify `src/components/shared/DraftBanner.tsx`:

```tsx
'use client'
import { useTranslations } from 'next-intl'
import styles from './DraftBanner.module.css'

interface DraftBannerProps {
  messageKey?: 'banner' | 'guideBanner'
}

export function DraftBanner({ messageKey = 'banner' }: DraftBannerProps) {
  const t = useTranslations('common.draft')
  return (
    <div className={styles.banner} role="status">
      {t(messageKey)}
    </div>
  )
}
```

(`common.draft.guideBanner` exists in all 31 locales from Task 8.)

- [ ] **Step 2: Implement `GuideJsonLd.tsx`**

```tsx
import type { Guide } from '@/lib/guides/types'
import { AUTHORS } from '@/lib/guides/types'

const BASE_URL = 'https://www.phototools.io'

interface GuideJsonLdProps {
  guide: Guide
  locale: string
  slug: string
  breadcrumbHome: string
  breadcrumbGuides: string
}

export function GuideJsonLd({ guide, locale, slug, breadcrumbHome, breadcrumbGuides }: GuideJsonLdProps) {
  const author = guide.author && AUTHORS[guide.author]
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    inLanguage: locale,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    ...(guide.heroImage ? { image: `${BASE_URL}${guide.heroImage.src}` } : {}),
    author: author
      ? { '@type': 'Person', name: author.name }
      : { '@type': 'Organization', name: 'PhotoTools' },
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: breadcrumbHome, item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: breadcrumbGuides, item: `${BASE_URL}/${locale}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${BASE_URL}/${locale}/guides/${slug}` },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  )
}
```

(Breadcrumb strings come from existing keys: `common.breadcrumb.home` — verify the key exists via `grep -n "breadcrumb" src/lib/i18n/messages/en/common.json`; the guides crumb uses `common.nav.guides`.)

- [ ] **Step 3: Implement `RelatedGuides.tsx`** (server; titles via `getGuide` per slug):

```tsx
import { useTranslations } from 'next-intl'
import { getGuide } from '@/lib/guides/content'
import type { Locale } from '@/lib/i18n/routing'
import { Link } from '@/lib/i18n/navigation'
import styles from './RelatedGuides.module.css'

interface RelatedGuidesProps {
  slugs: string[]
  locale: Locale
}

export function RelatedGuides({ slugs, locale }: RelatedGuidesProps) {
  const t = useTranslations('guides')
  const guides = slugs.map((s) => ({ slug: s, guide: getGuide(s, locale) })).filter((g) => g.guide !== null)
  if (guides.length === 0) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{t('relatedGuides')}</h2>
      <ul className={styles.list}>
        {guides.map(({ slug, guide }) => (
          <li key={slug}>
            <Link href={`/guides/${slug}`} prefetch={false} className={styles.link}>
              {guide!.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

(If mixing `useTranslations` with fs reads in one server component trips the compiler, split: page passes translated heading as a prop instead.)

- [ ] **Step 3b: Implement `MdxA.tsx`** — internal markdown links get the locale-aware `Link`, external links open safely:

```tsx
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from '@/lib/i18n/navigation'

export function MdxA({ href = '', children }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} prefetch={false}>
        {children}
      </Link>
    )
  }
  if (href.startsWith('#')) {
    return <a href={href}>{children}</a>
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
```

- [ ] **Step 4: Implement the article page**

`src/app/[locale]/guides/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AdUnit } from '@/components/shared/AdUnit'
import { DraftBanner } from '@/components/shared/DraftBanner'
import { Callout } from '@/components/guides/Callout'
import { Figure } from '@/components/guides/Figure'
import { GuideJsonLd } from '@/components/guides/GuideJsonLd'
import { MdxA } from '@/components/guides/MdxA'
import { GuideToc } from '@/components/guides/GuideToc'
import { RelatedGuides } from '@/components/guides/RelatedGuides'
import { ToolCard } from '@/components/guides/ToolCard'
import { getGuide, getVisibleGuides } from '@/lib/guides/content'
import { AUTHORS } from '@/lib/guides/types'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import styles from './page.module.css'

export const dynamicParams = false

export function generateStaticParams() {
  return getVisibleGuides('en').map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const guide = getGuide(slug, locale as Locale)
  if (!guide) return {}
  return {
    title: guide.title,
    description: guide.description,
    openGraph: { title: guide.title, description: guide.description },
    alternates: getAlternates(`/guides/${slug}`, locale as Locale),
  }
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const guide = getGuide(slug, locale as Locale)
  if (!guide) notFound()
  const t = await getTranslations('guides')
  const commonT = await getTranslations('common')
  const { default: Body } = await import(`@/content/guides/${slug}/${locale}.mdx`).catch(
    () => import(`@/content/guides/${slug}/en.mdx`)
  )
  const author = guide.author ? AUTHORS[guide.author] : undefined
  const updated = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(guide.updatedAt))
  return (
    <div className={styles.outer}>
      <GuideJsonLd
        guide={guide}
        locale={locale}
        slug={slug}
        breadcrumbHome={commonT('breadcrumb.home')}
        breadcrumbGuides={commonT('nav.guides')}
      />
      <article className={styles.article}>
        {guide.status === 'draft' && <DraftBanner messageKey="guideBanner" />}
        <header>
          <h1>{guide.title}</h1>
          <p className={styles.meta}>
            {author && <span>{t('byLabel', { name: author.name })} · </span>}
            {t('readTime', { minutes: guide.readTimeMinutes })} · {t('updated', { date: updated })}
          </p>
          {guide.heroImage && (
            <Image
              src={guide.heroImage.src}
              alt={guide.heroImage.alt}
              width={1600}
              height={900}
              priority
              sizes="(max-width: 1023px) 100vw, 800px"
              className={styles.hero}
            />
          )}
        </header>
        <div className={styles.body}>
          <Body
            components={{
              Callout,
              Figure,
              ToolCard: (props: { slug: string }) => <ToolCard {...props} guideSlug={slug} />,
              // Raw markdown ![alt](src) routes through Figure (dimension-read
              // + next/image); markdown links get locale-aware routing.
              img: (props: { src?: string; alt?: string }) => (
                <Figure src={props.src ?? ''} alt={props.alt ?? ''} />
              ),
              a: MdxA,
            }}
          />
        </div>
        <AdUnit slot="" format="leaderboard" channel="guide_article_end" />
      </article>
      <aside className={styles.rail}>
        <GuideToc entries={guide.toc} />
        {guide.relatedTools.length > 0 && (
          <section className={styles.railSection}>
            <h2 className={styles.railHeading}>{t('relatedTools')}</h2>
            {guide.relatedTools.map((toolSlug) => (
              <ToolCard key={toolSlug} slug={toolSlug} guideSlug={slug} />
            ))}
          </section>
        )}
        <RelatedGuides slugs={guide.relatedGuides} locale={locale as Locale} />
        <AdUnit slot="" format="rectangle" channel="guide_sidebar" />
      </aside>
    </div>
  )
}
```

Note on hero dimensions: the hero uses fixed 1600×900 rendering box semantics; guide hero images must be exported at 16:9. (The in-body `Figure` reads real dimensions; the hero is the one place with a fixed contract — record it in the content pipeline.)

`page.module.css`:

```css
.outer {
  display: flex;
  gap: 24px;
  max-width: var(--page-width-content);
  margin: 0 auto;
  padding: var(--space-xl) var(--space-md);
}
.article {
  flex: 1;
  min-width: 0;
  max-width: var(--page-width-prose);
}
.meta {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
.hero {
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-top: var(--space-md);
}
.body {
  margin-top: var(--space-lg);
  line-height: 1.7;
}
.body h2 {
  margin-top: var(--space-xl);
  scroll-margin-top: var(--space-lg);
}
.body h3 {
  margin-top: var(--space-lg);
  scroll-margin-top: var(--space-lg);
}
.rail {
  width: 300px;
  min-width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  align-self: flex-start;
  padding-top: var(--space-md);
}
.railSection {
  margin-top: var(--space-lg);
}
.railHeading {
  font-size: var(--text-sm);
  margin-bottom: var(--space-sm);
}
@media (max-width: 1023px) {
  .outer {
    flex-direction: column;
    padding: 20px 16px;
  }
  .rail {
    width: auto;
    min-width: 0;
    position: static;
  }
}
```

(Token names verified against `globals.css` before writing, as in Task 10.)

- [ ] **Step 5: Verify build**

Run: `npm run type-check && npm run build`
Expected: build succeeds; with zero visible guides `generateStaticParams` returns `[]` and no guide pages are emitted — that is correct Phase A behavior.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/guides/[slug] src/components/guides/GuideJsonLd.tsx src/components/guides/RelatedGuides.tsx src/components/guides/RelatedGuides.module.css src/components/shared/DraftBanner.tsx
git commit -m "feat(guides): guide article page with MDX body, TOC rail, JSON-LD, ads"
```

---

### Task 13: Chrome integration (nav, footer, homepage teaser) + LearnPanel guides block

**Files:**
- Modify: `src/app/[locale]/layout.tsx`, `src/components/layout/ThemeProvider.tsx`, `src/components/layout/Nav.tsx`, `src/components/layout/Footer.tsx`, `src/components/shared/LearnPanel.tsx`, `src/app/[locale]/page.tsx`
- Create: `src/components/guides/GuidesTeaser.tsx` + `GuidesTeaser.module.css`
- Test: `src/components/shared/LearnPanel` guides-block cases in the existing LearnPanel test file (or new `src/components/shared/LearnPanelGuides.test.tsx`)

**Interfaces:**
- Consumes: `hasVisibleGuides`, `getVisibleGuides` (Task 5); `trackToolGuideClick` (Task 7); `common.nav.guides` / `common.footer.guides` / `common.learn.guidesTitle` / `guides.teaser*` strings (Task 8).
- Produces:
  - `ThemeProvider` gains prop `hasGuides?: boolean` (default `false`), forwards to Nav and Footer.
  - `Nav` gains prop `hasGuides?: boolean`; renders a Guides link (pattern-copied from the Glossary link, `trackNavClick({ target: 'guides', source: 'mega-menu' })`) only when true.
  - `Footer` gains prop `hasGuides?: boolean`; renders a Guides link in the info row only when true.
  - `LearnPanel` gains prop `guides?: Array<{ slug: string; title: string }>` (default `[]`); when non-empty renders a links block (heading `common.learn.guidesTitle`) firing `trackToolGuideClick({ tool_slug: slug, guide_slug })` per click. **No tool page wiring in Phase A** — wiring happens per-tool in Phase B via: server `page.tsx` computes `getGuidesForTool(toolSlug, locale)` → passes into the tool's root client component → down to both LearnPanel renders (desktop + mobile).
  - `GuidesTeaser({ locale }: { locale: Locale })` — server component; renders null when no visible guides; otherwise section with up to 3 `GuideCard`s + CTA link to `/guides`.

- [ ] **Step 1: Read all six files to modify.** Note the exact ThemeProvider props/JSX, Nav's Glossary link block, Footer's info row, LearnPanel's closing sections (before `FaqSection`), and the homepage's main sections in `page.tsx`.

- [ ] **Step 2: Write the failing LearnPanel test** (copy the existing LearnPanel test's provider/mocking setup — read it first; it needs education skeleton data for a real slug):

```tsx
it('renders the guides block when guides prop is non-empty', () => {
  renderLearnPanel({ slug: 'fov-simulator', guides: [{ slug: 'macro-guide', title: 'Macro Guide' }] })
  expect(screen.getByText('Related guides')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Macro Guide' })).toHaveAttribute('href', expect.stringContaining('/guides/macro-guide'))
})

it('renders no guides block by default', () => {
  renderLearnPanel({ slug: 'fov-simulator' })
  expect(screen.queryByText('Related guides')).not.toBeInTheDocument()
})
```

Run: `npx vitest run src/components/shared` — new cases FAIL.

- [ ] **Step 3: Implement all modifications**

`ThemeProvider.tsx` — add to props interface `hasGuides?: boolean` (default `false`); pass `<Nav … hasGuides={hasGuides} />` and `<Footer hasGuides={hasGuides} />`.

`src/app/[locale]/layout.tsx` — import `hasVisibleGuides` from `@/lib/guides/content`; where `<ThemeProvider>` is rendered add `hasGuides={hasVisibleGuides()}`.

`Nav.tsx` — extend `NavProps` with `hasGuides?: boolean`; after the Glossary link add:

```tsx
{hasGuides && (
  <Link
    href="/guides"
    className={styles.navLink}
    data-ph-capture-attribute-source="mega-menu"
    onClick={() => trackNavClick({ target: 'guides', source: 'mega-menu' })}
  >
    {t('guides')}
  </Link>
)}
```

`Footer.tsx` — add `hasGuides?: boolean` prop; add before the glossary link:

```tsx
{hasGuides && (
  <Link
    href="/guides"
    className={styles.link}
    data-ph-capture-attribute-source="footer"
    onClick={() => trackNavClick({ target: 'guides', source: 'footer' })}
  >
    {t('guides')}
  </Link>
)}
```

`LearnPanel.tsx` — add to props `guides?: Array<{ slug: string; title: string }>`; before the `FaqSection` render:

```tsx
{guides.length > 0 && (
  <section className={styles.guidesBlock}>
    <h3>{t('guidesTitle')}</h3>
    <ul>
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link
            href={`/guides/${guide.slug}`}
            prefetch={false}
            onClick={() => trackToolGuideClick({ tool_slug: slug, guide_slug: guide.slug })}
          >
            {guide.title}
          </Link>
        </li>
      ))}
    </ul>
  </section>
)}
```

(Add `.guidesBlock` to `LearnPanel.module.css` matching the panel's existing section styling; `t` here is the `common.learn` translator already in the component.)

`GuidesTeaser.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { GuideCard } from '@/components/guides/GuideCard'
import { getVisibleGuides } from '@/lib/guides/content'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import styles from './GuidesTeaser.module.css'

export async function GuidesTeaser({ locale }: { locale: Locale }) {
  const guides = getVisibleGuides(locale).slice(0, 3)
  if (guides.length === 0) return null
  const t = await getTranslations('guides')
  return (
    <section className={styles.section}>
      <h2>{t('teaserTitle')}</h2>
      <p className={styles.subtitle}>{t('teaserSubtitle')}</p>
      <div className={styles.grid}>
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} locale={locale} />
        ))}
      </div>
      <Link href="/guides" prefetch={false} className={styles.cta}>
        {t('teaserCta')}
      </Link>
    </section>
  )
}
```

`src/app/[locale]/page.tsx` — render `<GuidesTeaser locale={locale as Locale} />` after the main tools grid section (read the file for the exact insertion point; add the import).

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run type-check && npm run build`
Expected: all PASS; prod build shows no nav/footer/homepage change (no visible guides yet).

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/layout.tsx src/app/[locale]/page.tsx src/components/layout src/components/shared/LearnPanel.tsx src/components/shared/LearnPanel.module.css src/components/guides/GuidesTeaser.tsx src/components/guides/GuidesTeaser.module.css src/components/shared/*.test.tsx
git commit -m "feat(guides): gated chrome — nav/footer links, homepage teaser, LearnPanel guides block"
```

---

### Task 14: Sitemap + OG image

**Files:**
- Modify: `src/app/sitemap.ts` (async + guide entries), `src/app/sitemap.test.ts`, `src/lib/og.tsx` (add `generateGuideOgImage`)
- Create: `src/app/[locale]/guides/[slug]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `getLiveGuides` (Task 5); `OgBackground`/`OgBranding`/`OgAccentLine` from `@/lib/og-layout`; `getGuide` for the OG route.
- Produces: `sitemap()` becomes `async`; emits `/guides` (priority 0.8, weekly) and `/guides/<slug>` (priority 0.7, monthly, `lastModified` from `updatedAt`) across all locales with hreflang — **only when live guides exist**. `generateGuideOgImage({ title, categoryLabel }): Promise<ImageResponse>`.

- [ ] **Step 1: Extend the sitemap test** (read `src/app/sitemap.test.ts` first; make every call `await sitemap()`):

```ts
it('omits guide URLs when no guides are live', async () => {
  const entries = await sitemap()
  expect(entries.some((e) => e.url.includes('/guides'))).toBe(false)
})
```

Run: `npx vitest run src/app/sitemap.test.ts` — FAILS (sitemap not yet async / test update pending). Fix the existing assertions to `await` in the same edit.

- [ ] **Step 2: Implement sitemap changes** — change the default export to `async function sitemap(): Promise<MetadataRoute.Sitemap>`; import `getLiveGuides` from `@/lib/guides/content`; before `allPaths`:

```ts
const liveGuides = getLiveGuides('en')
const guidePaths =
  liveGuides.length > 0
    ? [
        { path: '/guides', changeFrequency: 'weekly' as const, priority: 0.8 },
        ...liveGuides.map((g) => ({
          path: `/guides/${g.slug}`,
          changeFrequency: 'monthly' as const,
          priority: 0.7,
          lastModified: new Date(g.updatedAt),
        })),
      ]
    : []
const allPaths = [...staticPaths, ...toolPaths, ...guidePaths]
```

In the flatMap, use the per-entry override: `lastModified: ('lastModified' in pathEntry && pathEntry.lastModified) || LAST_CONTENT_UPDATE` (adjust destructuring accordingly).

- [ ] **Step 3: Add `generateGuideOgImage` to `src/lib/og.tsx`** (reuse the existing layout primitives — read the file and mirror `generateOgImage`'s structure):

```tsx
export async function generateGuideOgImage(opts: { title: string; categoryLabel: string }) {
  return new ImageResponse(
    (
      <OgBackground>
        <OgDiamonds emoji="📖" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
          <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.7 }}>
            {opts.categoryLabel}
          </div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{opts.title}</div>
        </div>
        <OgAccentLine />
        <OgBranding />
      </OgBackground>
    ),
    { width: 1200, height: 630 }
  )
}
```

Before finalizing, read `src/lib/og.tsx`'s existing `generateOgImage` and align exact colors, positions, and the order of `OgAccentLine`/`OgBranding` children so guide OG images match the tool OG family (Satori constraints: inline styles, flex only — no CSS modules).

- [ ] **Step 4: Create `src/app/[locale]/guides/[slug]/opengraph-image.tsx`** (mirrors the tool OG route pattern):

```tsx
import { generateGuideOgImage } from '@/lib/og'
import { getGuide } from '@/lib/guides/content'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/lib/i18n/routing'

export const alt = 'PhotoTools'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const guide = getGuide(slug, locale as Locale)
  if (!guide) return new Response('Not Found', { status: 404 })
  const t = await getTranslations({ locale, namespace: 'guides' })
  return generateGuideOgImage({ title: guide.title, categoryLabel: t(`categories.${guide.category}.name`) })
}
```

- [ ] **Step 5: Verify + commit**

Run: `npx vitest run src/app/sitemap.test.ts && npm run type-check && npm run build`
Expected: PASS.

```bash
git add src/app/sitemap.ts src/app/sitemap.test.ts src/lib/og.tsx src/app/[locale]/guides/[slug]/opengraph-image.tsx
git commit -m "feat(guides): guide entries in sitemap (async) and generated OG images"
```

---

### Task 15: The draft macro guide (real content) + image assets

**Files:**
- Create: `src/content/guides/macro-photography-getting-started/en.mdx`, `public/images/guides/macro-photography-getting-started/subject.jpg`

**Interfaces:**
- Consumes: everything above.
- Produces: one real, visible-in-dev draft guide exercising every embed and layout feature — the Phase A acceptance artifact and the Phase B pipeline's first input.

- [ ] **Step 1: Create the image asset** — copy the existing e2e fixture as a stand-in (real photography lands in Phase B's asset stage):

```bash
mkdir -p public/images/guides/macro-photography-getting-started
cp src/e2e/fixtures/test-image.jpg public/images/guides/macro-photography-getting-started/subject.jpg
```

- [ ] **Step 2: Write `en.mdx`** — real, gear-neutral educational content (~900–1200 words), NOT lorem ipsum. Frontmatter:

```yaml
---
title: "Macro Photography: A Practical Getting-Started Guide"
description: "Learn macro photography from scratch — magnification, working distance, depth of field at close range, lighting, and focus stacking, explained for any camera system."
category: techniques
tags: [macro, close-up, focus-stacking]
relatedTools: [focus-stacking-calculator, dof-simulator, diffraction-calculator]
publishedAt: 2026-08-07
updatedAt: 2026-08-07
status: draft
sourceRef: "phase-a starter — replace via Phase B adapt stage"
---
```

Body requirements (write the actual prose, gear-neutral per the spec — principles by focal length/magnification/feature class, no brand framing):
- `##` sections: What Makes Macro Different / Magnification and Working Distance / Depth of Field at Close Range / Lighting / Focus Stacking / Getting Started Checklist — with at least one `###` subsection (exercises TOC depth)
- At least one `<Callout type="tip">` and one `<Callout type="warning">`
- One `<Figure src="/images/guides/macro-photography-getting-started/subject.jpg" alt="..." caption="..." />`
- One `<ToolCard slug="focus-stacking-calculator" />` placed in-prose in the Focus Stacking section

- [ ] **Step 3: Verify the full feature in dev**

Run: `rm -rf .next && npm run dev`, then check `http://localhost:3200/en/guides` (index renders, draft card present), `http://localhost:3200/en/guides/macro-photography-getting-started` (draft banner, TOC scroll-spy, Callouts, Figure, ToolCard link → tool page, related tools rail), `http://localhost:3200/ja/guides/macro-photography-getting-started` (Japanese chrome, English body fallback — dev-only draft behavior), and the homepage + nav (Guides entries visible **in dev**).

- [ ] **Step 4: Verify prod invisibility**

Run: `npm run build && npm run start`, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/en/guides`
Expected: `404`. Also `curl -s http://localhost:3200/en | grep -c '/guides'` → `0`. Stop the server.

- [ ] **Step 5: Run all checks and commit**

Run: `node scripts/check-guide-translations.mjs && npx vitest run && npm run type-check`
Expected: parity check passes (draft = exempt), all tests green.

```bash
git add src/content/guides public/images/guides
git commit -m "feat(guides): draft macro getting-started guide exercising all embeds"
```

---

### Task 16: Phase A e2e + CI + docs

**Files:**
- Create: `src/e2e/tools/guides-phase-a.spec.ts`
- Modify: `.github/workflows/deploy.yml`, `CLAUDE.md`, `docs/superpowers/specs/2026-08-07-guides-section-design.md` (factual correction)

**Interfaces:**
- Consumes: prod build behavior (Tasks 10–15).
- Produces: CI-enforced Phase A invariants; documented guides architecture.

- [ ] **Step 1: Write the e2e spec** (runs against prod build like all e2e):

```ts
import { expect, test } from '@playwright/test'

// Phase A invariant: with zero LIVE guides, the entire guides section is
// invisible in production. Replace this spec with the full guides.spec.ts
// interaction suite when the first guide goes live (Phase B).
test.describe('guides section — Phase A (no live guides)', () => {
  test('guides index returns 404', async ({ page }) => {
    const response = await page.goto('/en/guides')
    expect(response?.status()).toBe(404)
  })

  test('guide article routes return 404', async ({ page }) => {
    const response = await page.goto('/en/guides/macro-photography-getting-started')
    expect(response?.status()).toBe(404)
  })

  test('nav and footer show no guides link', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('nav a[href$="/guides"]')).toHaveCount(0)
    await expect(page.locator('footer a[href$="/guides"]')).toHaveCount(0)
  })

  test('homepage shows no guides teaser', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('a[href$="/en/guides"]')).toHaveCount(0)
  })
})
```

- [ ] **Step 2: Run e2e**

Run: `npm run build && npm run test:e2e -- src/e2e/tools/guides-phase-a.spec.ts` (kill port first if needed: `lsof -ti:3200 | xargs kill -9`)
Expected: all 4 PASS.

- [ ] **Step 3: Add the CI step** — in `.github/workflows/deploy.yml`, directly after `- run: node scripts/check-translations.mjs` add:

```yaml
      - run: node scripts/check-guide-translations.mjs
```

- [ ] **Step 4: Correct the spec + document in CLAUDE.md**

In the spec (`docs/superpowers/specs/2026-08-07-guides-section-design.md`), fix the routing rationale: replace the sentence claiming "The static `guides` segment wins over the dynamic `/[locale]/[slug]` tool route (Next.js static-over-dynamic priority)" with: "Tool routes are literal directories under `src/app/[locale]/` (there is no dynamic tool route), so `guides` is a free segment; the reserved-slug test in `tools.test.ts` guards against a future tool claiming it."

In `CLAUDE.md`, add a `## Guides` section after the Lightroom Catalog Analyzer section covering, briefly: content location (`src/content/guides/<slug>/<locale>.mdx`, en = source of truth), the content module (`src/lib/guides/`), draft/live + parity semantics (`node scripts/check-guide-translations.mjs`), the embed allowlist, the chrome gating (`hasVisibleGuides()` threaded via ThemeProvider), and the scroll exception (guide pages scroll as documents inside `<main>`).

- [ ] **Step 5: Full verification + commit**

Run: `npm run lint && npm run type-check && node scripts/check-translations.mjs && node scripts/check-guide-translations.mjs && npx vitest run && npm run build && npm run test:e2e`
Expected: everything green.

```bash
git add src/e2e/tools/guides-phase-a.spec.ts .github/workflows/deploy.yml CLAUDE.md docs/superpowers/specs/2026-08-07-guides-section-design.md
git commit -m "test(guides): Phase A e2e invariants, CI parity check, docs"
```

---

## Out of scope (Phase B/C — content pipeline, not this plan)

Flagship adaptation from the Robin corpus (with Kevin's per-guide review), real photo assets (EXIF/GPS-stripped, 16:9 heroes), agent translation batches to 30 locales, flipping guides live, tool-page LearnPanel wiring, the full `guides.spec.ts` interaction e2e + smoke entries, Search Console submission, category index pages, HowTo/FAQ schema, interactive showcase embed.
