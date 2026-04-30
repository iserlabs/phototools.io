# CLAUDE.md

## Project Overview

PhotoTools is an educational photography application — free calculators, simulators, and references plus a glossary. Built as a Next.js 16 App Router hub with a tool registry system. Deployed to Vercel at `www.phototools.io`.

**Business model**: SEO-driven traffic + advertisement revenue. All decisions should consider SEO impact (shareable URLs, metadata, semantic HTML, page titles) and ad placement compatibility (clean layout with predictable content regions, no layout shift).

## Tech Stack

- Next.js 16 (App Router, Turbopack dev)
- React 19 + TypeScript 6
- next-intl 4.x (i18n — 31 locales: en, es, ja, de, fr, nl, ko, pt, it, hi, zh, tr, pl, id, vi, th, ru, bn, zh-TW, uk, sv, da, nb, fi, cs, ro, hu, el, ms, fil, ca)
- Vitest + jsdom + @testing-library/react + @testing-library/jest-dom
- ESLint with typescript-eslint
- CSS Modules + CSS custom properties (design tokens)
- Canvas API for image rendering (FOV Simulator overlays)
- WebGL2 + GLSL shaders (Exposure Simulator, White Balance Visualizer, Perspective Compression Simulator)
- Vercel (deployment)

## Commands

- `npm run dev` — start dev server with Turbopack at `http://localhost:3200`
- `npm run build` — production build via `next build`
- `npm run start` — serve production build locally
- `npm test` — run Vitest tests (869 tests across 67 files)
- `npm run test:coverage` — run tests with coverage report
- `npm run type-check` — run TypeScript compiler in noEmit mode
- `npm run test:watch` — run tests in watch mode
- `npm run test:e2e` — run Playwright e2e tests (requires a build first)
- `npm run test:e2e:ui` — run Playwright tests with interactive UI
- `npm run lint` — run ESLint

## Architecture

All source code lives under `src/`, with `@/` aliased to `src/` in tsconfig.json and vitest.config.ts.

- **App Router**: All routes under `src/app/[locale]/`. Root layout (`src/app/layout.tsx`) imports globals.css and provides `<html>`/`<body>`. Locale layout (`src/app/[locale]/layout.tsx`) validates the locale, calls `setRequestLocale()`, wraps children in `NextIntlClientProvider`, and renders providers. Homepage at `src/app/[locale]/page.tsx`. Each tool at `src/app/[locale]/[slug]/page.tsx`. Glossary at `src/app/[locale]/learn/glossary/page.tsx`. Additional pages: `/[locale]/about`, `/[locale]/contact`, `/[locale]/privacy`, `/[locale]/terms`. API route (not locale-prefixed): `src/app/api/contact/route.ts`.
- **Locale Routing**: Routing Middleware (`src/proxy.ts` — `proxy.ts` is the Next.js 16 name for middleware.ts) handles locale detection (URL prefix → `NEXT_LOCALE` cookie → `Accept-Language` header → fallback `en`). All pages are locale-prefixed: `/en/fov-simulator`, `/es/fov-simulator`, etc. Tool slugs stay in English across all locales.
- **Tool Co-location**: Each tool's components live in `src/app/[locale]/[slug]/_components/` alongside its `page.tsx`. The `_` prefix makes it a private folder (not a route segment). Page files import from `./_components/...` using relative paths. When importing types from tool `_components/` in `src/lib/`, use `@/app/[locale]/...` path.
- **Shared Components**: `src/components/` contains only shared/reusable code: `layout/` (Nav, Footer, ThemeProvider, ThemeToggle) and `shared/` (LearnPanel, ChallengeCard, ControlPanel, FocalLengthField, ApertureField, DistanceField, ToolIcon, InfoTooltip, ShareModal, ToolActions, FileDropZone, PhotoUploadPanel, ScenePicker, DraftBanner, JsonLd, DoFDiagram, DoFCanvas, AnimatedGrid, ModeToggle, AdUnit, AdScripts, MobileAdBanner, LanguageSwitcher, ApertureLogo, Calculator, FaqSection, RelatedTools).
- **Tool Registry**: `src/lib/data/tools.ts` defines all tools with slug, name, description, `dev`/`prod` status fields (`'live'`/`'draft'`/`'disabled'`), and category. `getLiveTools()` returns live tools. `getVisibleTools()` returns live + draft. `getToolBySlug()` looks up by slug. `getAllTools()` returns all tools regardless of status.
- **Education System**: `src/lib/data/education/` contains per-tool education skeletons (non-translatable data: IDs, difficulty levels, correct answers, option values). All translatable education text lives in `src/lib/i18n/messages/en/education/*.json`. `LearnPanel` and `ChallengeCard` render by combining skeleton data with translations.
- **Pure Math Modules**: `src/lib/math/` contains pure functions for FOV, DOF, exposure (including shader math for CoC, motion blur, noise), diffraction, star trails, color (color.ts, color-harmony.ts, color-hsl.ts, color-kelvin.ts), histogram, compression, frame (frame.ts, frame-border.ts, frame-texture.ts), and grid (grid.ts, grid-basic.ts, grid-golden.ts) calculations. Each has co-located `.test.ts` files. TDD approach — math is tested independently from UI.
- **Data**: `src/lib/data/` centralizes all pure data. Shared data files (with tests): tool registry, education skeletons, sensors, focal lengths, scenes, glossary, camera settings (apertures/shutter speeds/ISOs), ND filters, white balance presets, FAQ. Per-tool data files: `frameStudio.ts`, `exposureScenes.ts`, `fovSimulator.ts`, `colorSchemeGenerator.ts`, `exifViewer.ts`, `starTrailCalculator.ts`, `dofSimulator.ts`, `hyperfocalSimulator.ts`, `perspectiveCompression.ts`, `equivalentSettings.ts`, `focusStacking.ts`.

## Key Directories

```
src/
  app/
    layout.tsx            Root layout — imports globals.css, provides <html>/<body>
    globals.css           Global styles and CSS custom properties (design tokens)
    sitemap.ts            Multi-locale sitemap with hreflang alternates
    robots.ts             Robots.txt
    opengraph-image.tsx   Root OG image
    api/contact/          Contact form API route (not locale-prefixed)
    [locale]/             All locale-prefixed routes
      layout.tsx          Locale layout — validates locale, NextIntlClientProvider
      page.tsx            Homepage
      [slug]/             Each tool (e.g. /en/fov-simulator)
        page.tsx          Route entry point
        _components/      Tool-specific UI components (co-located)
      learn/glossary/     Photography glossary
      about/, contact/, privacy/, terms/  Info pages
  components/
    layout/               Nav (mega-menu), Footer, ThemeProvider, ThemeToggle
    shared/               LearnPanel, ChallengeCard, ControlPanel, LanguageSwitcher, ApertureLogo, Calculator, FaqSection, RelatedTools, etc.
  lib/
    i18n/
      routing.ts          Locale list, defineRouting config, locale metadata
      navigation.ts       Locale-aware Link, usePathname, useRouter, redirect
      request.ts          Message loader — merges all JSON files per locale
      redirects.ts        Centralized redirect rules (consumed by next.config.ts)
      metadata.ts         getAlternates() helper for canonical + hreflang in page metadata
      messages/en/        English translations (source of truth, 41 files)
      messages/es/        Spanish translations (41 files)
      messages/ja/        Japanese translations (41 files)
      messages/de/        German translations (41 files)
      messages/fr/        French translations (41 files)
    math/                 Pure calculation modules
    data/                 All pure data: shared + per-tool
    data/education/       Per-tool education skeletons, types, barrel export
    ads.ts                Ad configuration and feature flags
    utils/                Query sync, EXIF parsing, canvas/image export helpers
    types.ts              Shared TypeScript types
    og.tsx + og-layout.tsx  OpenGraph image generation
  proxy.ts               Routing Middleware — locale detection, zh-TW redirect
  e2e/                    Playwright e2e test specs
scripts/
  check-translations.mjs  Verify all locales have complete key coverage
public/                   Images, icons, manifest
```

## Internationalization (i18n)

Uses **next-intl** with **31 locales**:

- **Original 5**: English (en), Spanish (es), Japanese (ja), German (de), French (fr)
- **First wave (11)**: Dutch (nl), Korean (ko), Portuguese (pt), Italian (it), Hindi (hi), Simplified Chinese (zh), Turkish (tr), Polish (pl), Indonesian (id), Vietnamese (vi), Thai (th)
- **Second wave (15)**: Russian (ru), Bengali (bn), Traditional Chinese (zh-TW), Ukrainian (uk), Swedish (sv), Danish (da), Norwegian Bokmål (nb), Finnish (fi), Czech (cs), Romanian (ro), Hungarian (hu), Greek (el), Malay (ms), Filipino (fil), Catalan (ca)

The 31-locale set is defined in `src/lib/i18n/routing.ts` along with `localeNames` (display names for the language switcher) and `localeOpenGraph` (BCP-47 → OG locale mapping). The `LanguageSwitcher` sorts locales alphabetically by display name and shows a scrollable dropdown (`max-height: 60vh`).

### How it works

**Routing:** All routes are locale-prefixed (`/en/fov-simulator`, `/es/fov-simulator`, `/zh-TW/fov-simulator`, etc.). The proxy at `src/proxy.ts` (Next.js Routing Middleware, formerly `middleware.ts`) detects locale from URL → cookie → Accept-Language → fallback `en`, and adds a 308 redirect for lowercase `/zh-tw/*` → `/zh-TW/*` since Next.js routing is case-sensitive and `zh-TW` is the only hyphenated locale. Config lives in `src/lib/i18n/routing.ts` (locale list, `defineRouting`). Navigation uses locale-aware wrappers from `src/lib/i18n/navigation.ts` — always import `Link`, `usePathname`, `useRouter`, `redirect` from `@/lib/i18n/navigation`, NOT from `next/link` or `next/navigation`.

**Layouts:** Root layout (`src/app/layout.tsx`) provides `<html>`, `<body>`, and imports `globals.css`. It does NOT use any next-intl APIs. Locale layout (`src/app/[locale]/layout.tsx`) calls `setRequestLocale(locale)`, wraps children in `NextIntlClientProvider`. Any client component using next-intl hooks (like `usePathname` from navigation, `useLocale`, `useTranslations`) MUST be rendered inside the `NextIntlClientProvider`.

**Messages:** Translatable strings live in JSON files under `src/lib/i18n/messages/{locale}/` (41 files per locale, 1271 total across 31 locales). The message loader (`src/lib/i18n/request.ts`) dynamically imports all files for the request's locale and merges them into namespaces. English is the source of truth — other locales mirror the exact same key structure. **Translation discipline:** see `src/lib/i18n/glossary.photography.json` for the canonical photography terms in all 31 locales (used as the reference glossary by translation agents).

**Tool names/descriptions** are translated via the `tools` namespace (`tools.{slug}.name`, `tools.{slug}.description`). The homepage and nav read from translations, not from the hardcoded `tool.name`/`tool.description` in the tool registry. Tool slugs in URLs stay in English across all locales.

**Translation coverage:** Run `node scripts/check-translations.mjs` to verify all 31 locales have complete key coverage vs English. Run `node scripts/find-english-leaks.mjs` to detect English text that leaked into translated files (heuristic with allowlist for brand/tech codes — exits non-zero on HARD leaks). Run `node scripts/translation-status.mjs` for a per-locale file-count + last-modified summary.

**Namespaces** (top-level key in each JSON file → how components access strings):

| Namespace | JSON location | Access pattern |
|-----------|--------------|----------------|
| `common` | `messages/en/common.json` | `useTranslations('common')` → `t('nav.tools')` |
| `home` | `messages/en/home.json` | `useTranslations('home')` → `t('hero.title')` |
| `tools` | `messages/en/tools.json` | `useTranslations('tools')` → `t('fov-simulator.name')` |
| `glossary` | `messages/en/glossary.json` | `useTranslations('glossary')` → `t('entries.aperture.term')` |
| `metadata` | `messages/en/metadata.json` | `getTranslations('metadata')` (server) |
| `about`, `contact`, `privacy`, `terms` | `messages/en/<name>.json` | `useTranslations('<name>')` |
| `education.<tool-slug>` | `messages/en/education/<tool-slug>.json` | `useTranslations('education.<tool-slug>')` → `t('beginner')` |
| `toolUI.<tool-slug>` | `messages/en/tools/<tool-slug>.json` | `useTranslations('toolUI.<tool-slug>')` → `t('labelName')` |

Education files are merged into a single `education` namespace; tool UI files are merged into a single `toolUI` namespace. Both use `<tool-slug>` as a sub-key.

### Adding new strings

**To an existing tool** — add keys to the tool's JSON file in ALL 31 locales:
1. Add key to `src/lib/i18n/messages/en/tools/<tool-slug>.json` under the `toolUI.<tool-slug>` object
2. Add the same key with translated values to all 30 other locale folders (use the photography glossary in `src/lib/i18n/glossary.photography.json` for canonical terminology)
3. In component: `const t = useTranslations('toolUI.<tool-slug>')` → `t('newKey')`
4. Run `node scripts/check-translations.mjs` and `node scripts/find-english-leaks.mjs` to verify

**To a new tool** — files must be created in ALL 31 locales and registered:
1. Create `src/lib/i18n/messages/{locale}/tools/<tool-slug>.json` with `{ "toolUI": { "<tool-slug>": { ... } } }` for each of the 31 locales
2. Create `src/lib/i18n/messages/{locale}/education/<tool-slug>.json` with `{ "education": { "<tool-slug>": { ... } } }` for each locale
3. **Register both files in `src/lib/i18n/request.ts`**: add an import to the `Promise.all` array, add the variable to the `toolUIMessages` and/or `educationMessages` reducer array. **If you skip this step, the strings will not load and you'll get `MISSING_MESSAGE` errors at runtime.**
4. Add the tool's name/description to `messages/{locale}/tools.json` under the `tools` namespace for each locale
5. Run `node scripts/check-translations.mjs` to verify coverage and `node scripts/find-english-leaks.mjs` to detect leaks

**To shared UI** (nav, footer, actions, etc.) — add keys to `messages/{locale}/common.json` under the appropriate sub-object in ALL locales.

**Server components / metadata** — use `const t = await getTranslations('namespace')` (async).

**Rich text** — `t.rich('key', { link: (chunks) => <a href="...">{chunks}</a> })` for inline markup.

### Redirects

All redirect rules are centralized in `src/lib/i18n/redirects.ts`. Static redirects (legacy paths, old domain) are consumed by `next.config.ts`. Dynamic locale redirects are handled by middleware. Never add redirect logic outside this file.

### What NOT to put in i18n

- **Canvas/WebGL data** — sensors, scenes, focal lengths, ND filters, WB presets keep English text directly in `src/lib/data/` files because `useTranslations` isn't available in draw functions.
- **Education skeletons** (`src/lib/data/education/`) store only non-translatable data (IDs, difficulty, correctOption, optionValues). All text is in the education JSON files.
- **Glossary** (`src/lib/data/glossary.ts`) stores entry IDs and optional relatedTool slugs. Terms and definitions are in `messages/{locale}/glossary.json`.
- **Tool slugs** — URL slugs stay in English across all locales. Never translate slugs.

### Conditional Fonts (Japanese & Bengali)

`Noto Sans JP` and `Noto Sans Bengali` are loaded conditionally via `next/font` in `[locale]/layout.tsx` and applied via `[lang="ja"]` and `[lang="bn"]` CSS rules in `globals.css`. Other locales use the default font stack. Both fonts use `display: swap` and the smallest applicable subset to minimize CWV impact.

### Legal Translation Disclaimer

Privacy and Terms pages render `commonT('legalTranslationDisclaimer')` as a callout `<aside>` for non-English locales, telling users that the translation is for convenience and the English version is legally binding. The disclaimer key is in every locale's `common.json`.

## Data Management

All pure data (constants, presets, lookup tables, configuration arrays) lives in `src/lib/data/`. UI plumbing (`PARAM_SCHEMA`, `DEFAULT_STATE`, component-specific config) stays co-located in `_components/`.

- **Shared data** — data used by 2+ tools gets its own file (e.g. `camera.ts` exports `APERTURES` used by star-trail and hyperfocal tools).
- **Per-tool data** — tool-specific constants get a file named after the tool (e.g. `fovSimulator.ts`, `frameStudio.ts`).
- **i18n for data** — user-facing prose goes to i18n JSON files (`src/lib/i18n/messages/en/`), not data files. Data files consumed by canvas/WebGL keep English text directly (sensors, scenes, etc.) since `useTranslations` isn't available in draw functions.
- **When adding a new tool**: extract all constants, presets, and lookup tables into `src/lib/data/<toolSlug>.ts`. Only leave UI wiring in `_components/`.

## Tool Visibility

Each tool in `src/lib/data/tools.ts` has separate `dev` and `prod` status fields with three states: `'live'`, `'draft'`, or `'disabled'`.

- **`live`** — fully accessible, appears in nav, homepage, and footer.
- **`draft`** — appears in nav/homepage as "Coming Soon" (disabled); still reachable by direct URL with a draft banner.
- **`disabled`** — hidden from all menus, not shown anywhere.
- **Development** (`npm run dev`): uses the `dev` status field.
- **Production** (`npm run build`): uses the `prod` status field.
- To publish a tool, set its `prod` status to `'live'`.

## Educational Layer

Each tool has a **LearnPanel** (right sidebar) with:
- **Beginner explanation** — 2-3 sentence intro for newcomers
- **Deeper explanation** — physics/optics/math behind the concept (plain string or array of `{ heading, text }` sections)
- **Key factors** — what controls the effect
- **Pro tips** — practical real-world advice (amber callout)
- **Challenges** — 3-5 progressive multiple-choice questions with pass/fail feedback, try-again on wrong answers, reset all progress, persisted to localStorage
- **Tooltips** — hover info icons on control labels (via `InfoTooltip` component)

Education skeletons in `src/lib/data/education/content*.ts` define non-translatable structure (IDs, difficulty, correct answers). All user-facing text is in `src/lib/i18n/messages/en/education/*.json`. To add education content for a new tool, add a `ToolEducationSkeleton` entry and a corresponding JSON file.

## Design

- **No page scroll (desktop only).** On desktop, the application must fit within the viewport (100vh). The page never scrolls — only individual panels (controls, canvas, LearnPanel) scroll internally via `overflow-y: auto`. On mobile, pages are allowed to scroll naturally.
- **FOV Simulator is the reference implementation.** All tools should match its look and feel: dark surface panels, compact controls, same spacing/typography tokens, and consistent use of `var(--accent)` for interactive elements.
- **Three-column layout**: Tool pages render content (left/center) + LearnPanel (right sidebar, collapsible). Each tool manages its own layout and includes LearnPanel directly.
- **Tool icons**: Each tool has an inline SVG icon (`components/shared/ToolIcon.tsx`) displayed on homepage cards, nav mega-menu items, and tool page headers. Icons are mapped by slug.
- **Nav mega-menu**: Tools dropdown groups tools by category (Visualizers, Calculators, Reference, File Tools) with icon + name + description per item.

## Advertising

GoogleAdSense integration managed via `src/lib/ads.ts` (configuration and feature flags). Components: `AdUnit` (individual ad slots), `MobileAdBanner` (responsive mobile banner), `AdScripts` (script injection in layout). Environment variables: `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_COOKIEYES_ID`. Ad units are hidden until real slot IDs are configured.

## Observability

Three external services provide production monitoring:

- **Sentry** (`@sentry/nextjs`) — client + server error tracking, performance tracing. Config: `sentry.client.config.ts`, `sentry.server.config.ts`, `src/instrumentation.ts`. Tunnel via `/monitoring` route (bypasses ad blockers). Source maps uploaded at build time via `withSentryConfig()`.
- **Axiom** — log aggregation via Vercel Marketplace log drain (zero code). Receives structured JSON from `src/lib/logger.ts` (server-only). 10-day retention on free tier.
- **BetterStack** — uptime monitoring. Pings `/api/health` and homepage every 3 minutes. Critical alerts → email + Discord.

**Structured Logger** (`src/lib/logger.ts`): server-only, `import 'server-only'` enforced. Three levels: `info`, `warn`, `error`. Required `module` param for Axiom filtering. JSON in production, pretty-print in development. See `src/lib/logger.test.ts` for usage patterns.

**Environment variables** (Vercel, Production + Preview only): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## Security Headers

`next.config.ts` defines CSP, HSTS, and other security headers. `unsafe-eval` is included in CSP `script-src` only in development (React requires it for dev tooling). Never add `unsafe-eval` in production.

## Share & Embed

`components/shared/ShareModal.tsx` generates share/embed links with current query parameters via `window.location.search`. The FOV Simulator has its own ShareModal (`fov-simulator/_components/ShareModal.tsx`) using `stateToQueryString()`.

## Conventions

- **CSS Modules** for component styles (e.g. `Component.module.css`), design tokens via CSS custom properties defined in `src/app/globals.css`. Always check `globals.css` for available variables before using them — don't invent new variable names.
- **`'use client'`** directive on interactive components; server components by default
- **TDD for math**: all `lib/math/` modules have thorough unit tests
- **Named exports** for all components
- **Shared components first**: Before building tool-specific UI, check `src/components/shared/` for existing components. When two or more tools need similar UI (e.g. file upload, scene selector, share modal), extract a shared component. Familiarize yourself with what each shared component does so you reuse them consistently.
- **DRY**: Avoid duplicating logic, styles, constants, or markup. Extract shared utilities, components, and data modules. When adding a feature, check if similar patterns already exist in the codebase and reuse them.
- **200-line file limit**: Keep all `.ts`/`.tsx` files under 200 lines (test files exempt). If a file grows beyond this, break it into smaller focused modules (e.g. extract hooks, sub-components, helpers, constants, or types into separate files).
- **Test files** co-located next to source files (`*.test.ts`)
- **67 test files, 869 tests** covering math, data, education, ads, i18n (including all 31 locales), sitemap, metadata helpers, observability, and component integration
- **After file changes in `src/app/`**, clear `.next` cache (`rm -rf .next`) and restart dev server to avoid stale MIME type and 404 errors
- **i18n strings required**: Whenever a new user-facing string is added or an existing one is modified, create or update the corresponding translation in the appropriate JSON file under `src/lib/i18n/messages/en/`. Never hardcode user-facing text directly in components — always use `useTranslations` (client) or `getTranslations` (server) to reference translation keys.
- **Privacy Sandbox is deprecated** — do not discuss, recommend, or implement any Privacy Sandbox APIs (Topics, Attribution Reporting, Protected Audience, etc.)

## E2E Testing (Playwright)

Playwright integration tests live in `src/e2e/` and run against a production build (`npm run build` + `npm run start`). Config: `playwright.config.ts`.

### Structure

```
src/e2e/
  smoke/all-pages.spec.ts        Parameterized smoke tests for all pages (200 status, no console errors, content rendering, no desktop scroll)
  tools/fov-simulator.spec.ts    FOV Simulator interaction tests
  tools/color-scheme.spec.ts     Color Scheme Generator interaction tests
  tools/sensor-size.spec.ts      Sensor Size Comparison interaction tests
  tools/star-trail.spec.ts       Star Trail Calculator interaction tests
  tools/white-balance.spec.ts    White Balance Visualizer interaction tests
  tools/dof-simulator.spec.ts    Depth of Field Simulator interaction tests
  tools/exposure-simulator.spec.ts  Exposure Simulator interaction tests
  tools/hyperfocal.spec.ts       Hyperfocal Distance Simulator interaction tests
  tools/nd-filter.spec.ts        ND Filter Calculator interaction tests
  fixtures/test-image.jpg        Minimal JPEG fixture for upload tests
```

### Running

1. Build first: `npm run build`
2. Run tests: `npm run test:e2e` (or `npx playwright test`)
3. If port 3200 is in use: `lsof -ti:3200 | xargs kill -9` then retry
4. Run a single spec: `npx playwright test src/e2e/tools/fov-simulator.spec.ts`
5. Debug mode: `npx playwright test --debug`
6. View last report: `npx playwright show-report`

### Common Pitfalls When Writing/Fixing Tests

- **Duplicate DOM elements**: Every tool page renders controls twice — once in the desktop sidebar (`<aside>`) and once in a mobile controls section. Always scope selectors to avoid matching both. Use `page.locator('aside').first()` or `page.locator('[class*="sidebar"]').first()`.
- **LearnPanel challenge buttons**: The LearnPanel sidebar contains challenge questions with answer buttons (e.g. "24mm", "Complementary") that share text with tool control buttons. Use `sidebar.locator('button:text-is("...")')` scoped to the controls panel, not the full page.
- **CSS Modules hashed classes**: Class names are hashed at build time. Never match exact class names. Use `[class*="partialName"]` attribute selectors (e.g. `[class*="paletteBarSwatch"]`, `[class*="editForm"]`, `[class*="copyGroup"]`).
- **Hidden file inputs**: File upload uses a hidden `<input type="file">` inside `FileDropZone`. Use `page.locator('input[type="file"]').setInputFiles(...)` directly.
- **Ref-based state (no re-render)**: Some components use refs instead of state (e.g. `PhotoPicker`'s `imageLoaded`). When a ref controls visibility, the DOM won't update after async operations. Fix with `page.evaluate()` to force styles, then `click({ force: true })`.
- **Canvas/WebGL tools**: These render to `<canvas>`, not DOM elements. Use screenshot comparison (`canvas.screenshot()` + `Buffer.compare`) to verify visual changes.
- **ESM module context**: Test files use ESM. Use `import { fileURLToPath } from 'url'` and `path.dirname(fileURLToPath(import.meta.url))` instead of `__dirname`.
- **Console error filtering**: Smoke tests assert no console errors, but filter benign ones: favicon 404, cookieyes, adsense, adsbygoogle, `_vercel/speed-insights`. Add new benign patterns to the filter in `src/e2e/smoke/all-pages.spec.ts` as needed.
- **i18n translated text**: UI labels come from `next-intl` message files (`src/lib/i18n/messages/en/`). If a placeholder or label changes, check the translation JSON, not just the component source.
- **Select elements use value, not label**: For `<select>` dropdowns (e.g. sensor picker), use `selectOption('value_id')` not `selectOption({ label: '...' })`.

### CI

Playwright runs in GitHub Actions after `npm run build`. See `.github/workflows/deploy.yml`. CI installs Chromium + Firefox, runs all tests, and uploads `playwright-report/` as an artifact on failure.

## Logs

- **Dev logs**: `.next/dev/logs/next-development.log` — written automatically by Turbopack when `npm run dev` is running. Read this file when asked to "check the dev logs".
- **Prod logs**: Use `vercel logs <url>` or check the Vercel dashboard. Use `vercel logs --follow` for live tailing.

## Deployment

- Vercel auto-deploys from `main` branch
- GitHub Actions CI: `npm ci` → `npm audit` → `npm run lint` → `npm test` → `npm run build`
- Custom domain: `www.phototools.io` (apex `phototools.io` redirects to www)
- NEVER push to remote or deploy without explicit user instruction
