# Color Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the live Color Scheme Generator as the Color Analyzer: drop a photo, place up to 8 sample points, see them on the HSL wheel, pick a harmony, and get per-sample nudge guidance; the old key-colour generator survives as the "no samples" state.

**Architecture:** Pure math in `src/lib/math/` (fit, naming, clustering, patch averaging) with co-located vitest tests; a single client state owner `ColorAnalyzer.tsx` derives everything with `useMemo`; canvas wheel and DOM markers over a display canvas; samples are read from a fixed-size offscreen analysis canvas. Rename first as a pure mechanical commit so every later task lands on the new slug.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, next-intl (31 locales), Vitest + jsdom + Testing Library, Playwright. npm (not pnpm). Dev server `npm run dev` on :3200.

**Spec:** `docs/superpowers/specs/2026-09-27-color-analyzer-design.md`

## Global Constraints

- Repo: `~/workspace/iserlabs/applications/photo-tools`, branch `feat/color-analyzer`. Package manager is **npm**. `docs/superpowers/` is gitignored; `git add -f` plan/spec files.
- Node ≥ 22. Commands: `npm test` (vitest), `npm run type-check`, `npm run lint`, `npm run test:e2e` (needs `npm run build` first), `node scripts/check-translations.mjs`, `node scripts/find-english-leaks.mjs`.
- Every route lives under `src/app/[locale]/`. Import `Link`, `usePathname`, `useRouter` from `@/lib/i18n/navigation`, never `next/link`.
- Tool slug in URLs stays English in all locales. New slug: `color-analyzer`. Old slug `color-scheme-generator` must 308 to it.
- All translatable strings live in JSON under `src/lib/i18n/messages/<locale>/`; `toolUI.color-analyzer.*` for tool UI, `education.color-analyzer.*` for LearnPanel, `tools.color-analyzer.{name,description}`, `metadata.color-analyzer.{title,description}`. All 31 locales must have identical key sets (`translations.test.ts` enforces).
- Pure data in `src/lib/data/`, pure math in `src/lib/math/`, tests co-located `foo.ts` → `foo.test.ts`.
- Desktop tool pages never scroll the page (`height: calc(100vh - 44px)`; panels scroll internally). Mobile breakpoint `max-width: 1023px`.
- Numbers from the spec: sample cap **8**; patch **5×5**; analysis long edge **1600**; neutral: S < **8**, L < **8**, L > **94**; nudge bands: aligned ≤ **8°**, slight ≤ **25°**, big beyond; auto-pick k = **5**, downscale **64px** wide, **12** iterations, chromatic-first unless chromatic pixels < **5%**; 24 hue bands of **15°**; monochromatic palette L **20/35/50/65/80**.
- Ships `prod: 'live'` in the same PR (replaces a live tool).
- Commit after every task with the message given in that task. A pre-commit hook runs `eslint --fix` via lint-staged.

## Review Focus

1. **Photo with zero chromatic pixels (a grayscale scan).** Expected: every sample reads "Neutral, not scored", the wheel shows targets around the key hue, Auto-pick still returns points, nothing throws. Pinned in Task 4 (`fitHarmony` with no scorable samples) and Task 5 (`dominantColors` fallback to all pixels).
2. **Sample placed within 2px of the image edge.** Expected: the 5×5 patch clamps to the image, no out-of-range read, value equals the average of the clipped patch. Pinned in Task 6 (`patchAverage` edge clamping).
3. **Hue wrap at 0/360 (a red at 358° and a red at 3°).** Expected: they are 5° apart, both "aligned" to the same slot, delta signs are correct. Pinned in Task 4 (`circularDistance`, `signedDelta`).
4. **Deleting the locked sample, or the selected one.** Expected: lock clears, selection clears, custom target entry is dropped, fit recomputes without a stale id. Pinned in Task 7 (reducer `remove` test).
5. **Old share link `/color-scheme-generator?h=200&type=triadic`.** Expected: 308 to `/en/color-analyzer?h=200&type=triadic` and the wheel opens on triadic at hue 200. Pinned in Task 1 (redirects test) and Task 15 (e2e redirect test).

---

## File map

| Path | Responsibility |
|---|---|
| `src/lib/data/colorAnalyzer.ts` (+test) | harmony keys, band keys, thresholds, constants |
| `src/lib/math/color-name.ts` (+test) | `hueBand`, `isNeutral`, `colorNameKey`, `directionBandKey` |
| `src/lib/math/color-fit.ts` (+test) | templates, circular math, `fitHarmony`, `rankHarmonies`, `buildPalette` |
| `src/lib/math/color-cluster.ts` (+test) | `mulberry32`, `dominantColors` |
| `src/app/[locale]/color-analyzer/_components/useSampling.ts` (+test) | `patchAverage`, `decodeToAnalysisCanvas`, `sampleAt`, `downscaleForClustering` |
| `.../analyzerState.ts` (+test) | reducer for samples/selection/lock/custom targets |
| `.../drawWheel.ts` | wheel pixels (unchanged) + `drawAnalyzerOverlay` |
| `.../wheelHit.ts` (+test) | pure hit-testing for dots/targets |
| `.../useWheelPointer.ts` | pointer → key drag / select / custom drag |
| `.../ColorWheel.tsx` | canvas + view control |
| `.../PhotoPane.tsx`, `SampleMarkers.tsx` (+test) | drop zone, display canvas, markers, loupe |
| `.../SampleCard.tsx`, `AnalyzerSidebar.tsx` (+test) | list, key card, harmony picker |
| `.../PaletteBar.tsx`, `buildColorExport.ts` | palette + PNG export |
| `.../ColorAnalyzer.tsx`, `ColorAnalyzer.module.css` | state owner, layout |
| `src/lib/i18n/messages/*/tools/color-analyzer.json`, `education/color-analyzer.json` | strings |
| `src/e2e/tools/color-analyzer.spec.ts`, `src/e2e/fixtures/color-blocks.jpg` | e2e |

## Execution waves (parallel agents)

Two chains run side by side after Task 1. Each parallel task runs in its **own git worktree on a branch off the latest `feat/color-analyzer`** and is merged back when its reviewer passes it; the next wave starts from the merged branch. Within a wave, tasks never write the same file.

| Wave | Code chain | Copy chain | Why safe |
|---|---|---|---|
| 0 | Task 1 | — | everything lands on the new slug |
| 1 | Task 2 | Task 13 | T13 touches `en/messages`, `tools.ts` (name/description), `education/content-color-fov.ts`, `faq.ts`; T2 touches only `colorAnalyzer.ts` |
| 2 | Task 3 ‖ Task 5? no — Task 3 alone | Task 14 (six locale batches can themselves run as 3 parallel agents: `[de fr es it pt]+[nl sv da nb fi]`, `[pl cs hu ro uk]+[ru tr el ca]`, `[ja ko zh zh-TW]+[hi bn th vi id ms fil]`) | T5 needs `isNeutral` from T3 |
| 3 | Task 4 ‖ Task 5 | (copy chain done) | both depend only on T2/T3 |
| 4 | Task 6 ‖ Task 8 | | T6 needs T5; T8 needs T4 and tears down the old component |
| 5 | Task 7 | | needs T6's `SampledColor` |
| 6 | Task 9 ‖ Task 10 ‖ Task 11 | | after T8's teardown no shared file remains; only T10 appends to `ColorAnalyzer.module.css` |
| 7 | Task 12 | | needs 8–11 |
| 8 | Task 15 | | needs 12–14 |
| 9 | Task 16 | | |

Rules for every agent while the copy chain is in flight: run **scoped** vitest paths and `npm run type-check`, never bare `npm test` (`translations.test.ts` is red between Task 13 and the last Task 14 batch). Task 16 runs the full suite.

---

### Task 1: Mechanical rename to `color-analyzer` (no behaviour change)

**Files:**
- Move: `src/app/[locale]/color-scheme-generator/` → `src/app/[locale]/color-analyzer/`
- Move: `src/lib/data/colorSchemeGenerator.ts` (+`.test.ts`) → `src/lib/data/colorAnalyzer.ts` (+`.test.ts`)
- Move: `src/lib/i18n/messages/<locale>/tools/color-scheme-generator.json` → `.../tools/color-analyzer.json` (31 locales); same for `education/`
- Move: `src/e2e/tools/color-scheme.spec.ts` → `src/e2e/tools/color-analyzer.spec.ts`
- Modify: `src/lib/data/tools.ts:9`, `src/lib/data/faq.ts:20`, `src/lib/data/education/content-color-fov.ts:4`, `src/lib/i18n/request.ts:11`, `src/components/shared/ToolIcon.tsx:283`, `src/lib/og.tsx:7`, `src/app/[locale]/not-found.tsx:9`, `src/lib/i18n/redirects.ts`, every file under the moved route folder that mentions the slug
- Test: `src/lib/i18n/redirects.test.ts` (create)

**Interfaces:**
- Produces: the route `/[locale]/color-analyzer`, message namespaces `toolUI.color-analyzer`, `education.color-analyzer`, `tools.color-analyzer`, `metadata.color-analyzer`; `HARMONY_KEYS`/`HarmonyType` re-exported from `@/lib/data/colorAnalyzer` (still 5 types in this task).

- [ ] **Step 1: Write the failing redirect test**

`src/lib/i18n/redirects.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { staticRedirects } from './redirects'

describe('staticRedirects', () => {
  it('permanently redirects the bare old color tool slug', () => {
    const r = staticRedirects.find((x) => x.source === '/color-scheme-generator')
    expect(r).toBeDefined()
    expect(r!.destination).toBe('/color-analyzer')
    expect(r!.permanent).toBe(true)
  })

  it('permanently redirects the locale-prefixed old color tool slug', () => {
    const r = staticRedirects.find((x) => x.source === '/:locale/color-scheme-generator')
    expect(r).toBeDefined()
    expect(r!.destination).toBe('/:locale/color-analyzer')
    expect(r!.permanent).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/i18n/redirects.test.ts`
Expected: FAIL, `expect(r).toBeDefined()` — received undefined.

- [ ] **Step 3: Move files with git**

```bash
cd ~/workspace/iserlabs/applications/photo-tools
git mv "src/app/[locale]/color-scheme-generator" "src/app/[locale]/color-analyzer"
git mv src/lib/data/colorSchemeGenerator.ts src/lib/data/colorAnalyzer.ts
git mv src/lib/data/colorSchemeGenerator.test.ts src/lib/data/colorAnalyzer.test.ts
git mv src/e2e/tools/color-scheme.spec.ts src/e2e/tools/color-analyzer.spec.ts
for loc in src/lib/i18n/messages/*/; do
  git mv "$loc/tools/color-scheme-generator.json" "$loc/tools/color-analyzer.json"
  git mv "$loc/education/color-scheme-generator.json" "$loc/education/color-analyzer.json"
done
```

- [ ] **Step 4: Rewrite the slug inside every message file and every source file**

The JSON files key their contents by slug (`{"toolUI": {"color-scheme-generator": {...}}}`), so the inner key must change too. Names and descriptions stay as they are for now (Task 12 rewrites English copy, Task 13 the other locales).

```bash
cd ~/workspace/iserlabs/applications/photo-tools
python3 - <<'PY'
import json, glob
for f in glob.glob('src/lib/i18n/messages/*/tools/color-analyzer.json') + \
         glob.glob('src/lib/i18n/messages/*/education/color-analyzer.json'):
    d = json.load(open(f))
    ns = 'toolUI' if 'toolUI' in d else 'education'
    d[ns]['color-analyzer'] = d[ns].pop('color-scheme-generator')
    json.dump(d, open(f, 'w'), ensure_ascii=False, indent=2); open(f, 'a').write('\n')
for f in glob.glob('src/lib/i18n/messages/*/tools.json') + glob.glob('src/lib/i18n/messages/*/metadata.json'):
    d = json.load(open(f))
    ns = 'tools' if 'tools' in d else 'metadata'
    d[ns]['color-analyzer'] = d[ns].pop('color-scheme-generator')
    json.dump(d, open(f, 'w'), ensure_ascii=False, indent=2); open(f, 'a').write('\n')
PY
grep -rl --exclude-dir=node_modules --exclude-dir=.next -e 'color-scheme-generator' -e 'colorSchemeGenerator' src scripts \
  | grep -v '/messages/' | xargs sed -i '' -e 's/color-scheme-generator/color-analyzer/g' -e 's/colorSchemeGenerator/colorAnalyzer/g'
grep -rn 'color-scheme-generator\|colorSchemeGenerator' src scripts --exclude-dir=node_modules | grep -v redirects
```
Expected: the final grep prints nothing (the redirects file is written next).

Check `src/lib/i18n/messages/en/tools/color-analyzer.json` still parses and `src/lib/data/education/content-color-fov.ts` now reads `slug: 'color-analyzer'`.

- [ ] **Step 5: Add the two redirects**

In `src/lib/i18n/redirects.ts`, inside `staticRedirects`, after the `/tools/:slug` rule:
```ts
  // 2026-09: Color Scheme Generator was rebuilt and renamed to Color Analyzer.
  // Config redirects run before the locale proxy, so cover both shapes.
  { source: '/color-scheme-generator', destination: '/color-analyzer', permanent: true },
  { source: '/:locale/color-scheme-generator', destination: '/:locale/color-analyzer', permanent: true },
```

- [ ] **Step 6: Rename the export filename and the CSS module name**

In `src/app/[locale]/color-analyzer/_components/ColorSidebar.tsx` change `imageFilename="color-scheme.png"` to `imageFilename="color-analyzer.png"`. Leave `ColorHarmony.tsx` and `ColorHarmony.module.css` as they are; Task 11 replaces them.

- [ ] **Step 7: Run the whole suite, type-check, and translation checks**

```bash
npx vitest run src/lib/i18n/redirects.test.ts   # PASS (2)
npm test                                         # all green (expect same count as before + 2)
npm run type-check
node scripts/check-translations.mjs              # "All translations complete."
npm run dev &  # then open http://localhost:3200/en/color-analyzer and http://localhost:3200/color-scheme-generator?h=200&type=triadic
```
Expected: the tool renders unchanged at the new URL; the old URL lands on `/en/color-analyzer?h=200&type=triadic` with triadic selected.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(color): rename color-scheme-generator route, data and messages to color-analyzer; add permanent redirects"
```

---

### Task 2: Data file — harmony keys, band keys, thresholds

**Files:**
- Modify: `src/lib/data/colorAnalyzer.ts`, `src/lib/data/colorAnalyzer.test.ts`

**Interfaces:**
- Produces:
```ts
export type HarmonyType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'monochromatic' | 'custom'
export type TemplateHarmony = Exclude<HarmonyType, 'custom'>
export const HARMONY_KEYS: { value: HarmonyType; key: string }[]   // 7 entries, key = i18n key
export const TEMPLATE_HARMONIES: TemplateHarmony[]                  // 6
export const HUE_BAND_KEYS: readonly string[]                        // 24, index i covers [15i−7.5, 15i+7.5)
export const NEUTRAL_KEYS = { gray: 'gray', black: 'black', white: 'white' } as const
export const NEUTRAL = { minSat: 8, minLight: 8, maxLight: 94 } as const
export const NUDGE = { aligned: 8, slight: 25 } as const
export const SAMPLE_CAP = 8
export const PATCH_SIZE = 5
export const ANALYSIS_LONG_EDGE = 1600
export const CLUSTER = { k: 5, width: 64, iterations: 12, chromaticMinFraction: 0.05, seed: 7 } as const
export const MONO_LIGHTNESS = [20, 35, 50, 65, 80] as const
```

- [ ] **Step 1: Replace the test file**

`src/lib/data/colorAnalyzer.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  HARMONY_KEYS, TEMPLATE_HARMONIES, HUE_BAND_KEYS, NEUTRAL, NUDGE,
  SAMPLE_CAP, PATCH_SIZE, ANALYSIS_LONG_EDGE, CLUSTER, MONO_LIGHTNESS,
} from './colorAnalyzer'

describe('HARMONY_KEYS', () => {
  it('lists the seven harmony types with unique values and non-empty i18n keys', () => {
    expect(HARMONY_KEYS).toHaveLength(7)
    const values = HARMONY_KEYS.map((h) => h.value)
    expect(new Set(values).size).toBe(7)
    for (const v of ['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic', 'monochromatic', 'custom']) {
      expect(values).toContain(v)
    }
    for (const h of HARMONY_KEYS) expect(h.key).toBeTruthy()
  })

  it('TEMPLATE_HARMONIES is every harmony except custom', () => {
    expect(TEMPLATE_HARMONIES).toHaveLength(6)
    expect(TEMPLATE_HARMONIES).not.toContain('custom')
  })
})

describe('HUE_BAND_KEYS', () => {
  it('has 24 unique keys, one per 15°', () => {
    expect(HUE_BAND_KEYS).toHaveLength(24)
    expect(new Set(HUE_BAND_KEYS).size).toBe(24)
  })
  it('starts at red and has blue at 240°', () => {
    expect(HUE_BAND_KEYS[0]).toBe('red')
    expect(HUE_BAND_KEYS[240 / 15]).toBe('blue')
  })
})

describe('thresholds', () => {
  it('nudge bands are ordered', () => {
    expect(NUDGE.aligned).toBeLessThan(NUDGE.slight)
  })
  it('neutral thresholds match the spec', () => {
    expect(NEUTRAL).toEqual({ minSat: 8, minLight: 8, maxLight: 94 })
  })
  it('constants match the spec', () => {
    expect(SAMPLE_CAP).toBe(8)
    expect(PATCH_SIZE).toBe(5)
    expect(ANALYSIS_LONG_EDGE).toBe(1600)
    expect(CLUSTER.k).toBe(5)
    expect(CLUSTER.width).toBe(64)
    expect(CLUSTER.iterations).toBe(12)
    expect(MONO_LIGHTNESS).toEqual([20, 35, 50, 65, 80])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/data/colorAnalyzer.test.ts`
Expected: FAIL — `TEMPLATE_HARMONIES` etc. are not exported.

- [ ] **Step 3: Write the data file**

`src/lib/data/colorAnalyzer.ts`:
```ts
export type HarmonyType =
  | 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic'
  | 'monochromatic' | 'custom'
export type TemplateHarmony = Exclude<HarmonyType, 'custom'>

/** value = state/URL value, key = i18n key under toolUI.color-analyzer */
export const HARMONY_KEYS: { value: HarmonyType; key: string }[] = [
  { value: 'complementary', key: 'complementary' },
  { value: 'split-complementary', key: 'splitComplementary' },
  { value: 'analogous', key: 'analogous' },
  { value: 'triadic', key: 'triadic' },
  { value: 'tetradic', key: 'tetradic' },
  { value: 'monochromatic', key: 'monochromatic' },
  { value: 'custom', key: 'custom' },
]

export const TEMPLATE_HARMONIES: TemplateHarmony[] = [
  'complementary', 'split-complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic',
]

/** 24 bands of 15°. Index i covers hues in [15i − 7.5, 15i + 7.5). Names are i18n keys. */
export const HUE_BAND_KEYS = [
  'red', 'vermilion', 'orange', 'amber', 'yellow', 'lime',
  'chartreuse', 'leaf-green', 'green', 'jade', 'spring-green', 'mint',
  'cyan', 'sky-blue', 'azure', 'cobalt', 'blue', 'indigo',
  'violet', 'purple', 'magenta', 'fuchsia', 'pink', 'rose',
] as const

export const NEUTRAL_KEYS = { gray: 'gray', black: 'black', white: 'white' } as const

/** A sample is neutral (not scorable) when any of these holds. Percent units. */
export const NEUTRAL = { minSat: 8, minLight: 8, maxLight: 94 } as const

/** Hue-degree thresholds for the nudge band. */
export const NUDGE = { aligned: 8, slight: 25 } as const

export const SAMPLE_CAP = 8
export const PATCH_SIZE = 5
export const ANALYSIS_LONG_EDGE = 1600
export const CLUSTER = { k: 5, width: 64, iterations: 12, chromaticMinFraction: 0.05, seed: 7 } as const
export const MONO_LIGHTNESS = [20, 35, 50, 65, 80] as const
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/data/colorAnalyzer.test.ts`
Expected: PASS (7). `npm run type-check` will now fail in `colorHarmonyHelpers.ts` (`getHarmonyHues` switch is not exhaustive for the two new types) — that file is deleted in Task 11; for now add `case 'monochromatic': case 'custom': return [hue]` to its switch and `default: return 'suggestions.triadic'` in `getSuggestion` so the build stays green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/colorAnalyzer.ts src/lib/data/colorAnalyzer.test.ts "src/app/[locale]/color-analyzer/_components/colorHarmonyHelpers.ts"
git commit -m "feat(color-analyzer): data file with 7 harmonies, 24 hue bands and spec thresholds"
```

---

### Task 3: `color-name.ts` — hue bands, neutrals, direction words

**Files:**
- Create: `src/lib/math/color-name.ts`, `src/lib/math/color-name.test.ts`

**Interfaces:**
- Consumes: `HUE_BAND_KEYS`, `NEUTRAL`, `NEUTRAL_KEYS` from `@/lib/data/colorAnalyzer`
- Produces:
```ts
export function normalizeHue(h: number): number                 // 0 ≤ h < 360
export function hueBandIndex(h: number): number                 // 0..23
export function hueBandKey(h: number): string                   // HUE_BAND_KEYS[index]
export function isNeutral(hsl: { s: number; l: number }): boolean
export function colorNameKey(hsl: { h: number; s: number; l: number }): string  // band key or 'gray'|'black'|'white'
export function directionBandKey(sampleHue: number, targetHue: number, delta: number): string
```

- [ ] **Step 1: Write the failing tests**

`src/lib/math/color-name.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { normalizeHue, hueBandIndex, hueBandKey, isNeutral, colorNameKey, directionBandKey } from './color-name'

describe('normalizeHue', () => {
  it('wraps negatives and values ≥ 360', () => {
    expect(normalizeHue(-10)).toBe(350)
    expect(normalizeHue(360)).toBe(0)
    expect(normalizeHue(725)).toBe(5)
  })
})

describe('hueBandIndex / hueBandKey', () => {
  it('centres bands on multiples of 15°', () => {
    expect(hueBandIndex(0)).toBe(0)
    expect(hueBandIndex(7.4)).toBe(0)
    expect(hueBandIndex(7.5)).toBe(1)
    expect(hueBandIndex(352.5)).toBe(0)   // wraps into red
    expect(hueBandIndex(352.4)).toBe(23)
    expect(hueBandKey(240)).toBe('blue')
    expect(hueBandKey(211)).toBe('sky-blue')
  })
})

describe('isNeutral', () => {
  it('flags low saturation, near-black and near-white', () => {
    expect(isNeutral({ s: 7, l: 50 })).toBe(true)
    expect(isNeutral({ s: 8, l: 50 })).toBe(false)
    expect(isNeutral({ s: 90, l: 7 })).toBe(true)
    expect(isNeutral({ s: 90, l: 95 })).toBe(true)
    expect(isNeutral({ s: 90, l: 94 })).toBe(false)
  })
})

describe('colorNameKey', () => {
  it('returns a neutral key for neutrals, else the band key', () => {
    expect(colorNameKey({ h: 200, s: 3, l: 50 })).toBe('gray')
    expect(colorNameKey({ h: 200, s: 50, l: 4 })).toBe('black')
    expect(colorNameKey({ h: 200, s: 50, l: 97 })).toBe('white')
    expect(colorNameKey({ h: 0, s: 94, l: 20 })).toBe('red')
  })
  it('black wins over gray when both apply', () => {
    expect(colorNameKey({ h: 0, s: 0, l: 0 })).toBe('black')
  })
})

describe('directionBandKey', () => {
  it('names the target band when it differs from the sample band', () => {
    expect(directionBandKey(0, 330, -30)).toBe('pink')
  })
  it('steps one band further in the direction of travel when both share a band', () => {
    // sample 238 and target 243 are both "blue"; delta +5 → name the next band clockwise
    expect(directionBandKey(238, 243, 5)).toBe('indigo')
    // delta −5 → previous band
    expect(directionBandKey(243, 238, -5)).toBe('cobalt')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/math/color-name.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/math/color-name.ts`:
```ts
import { HUE_BAND_KEYS, NEUTRAL, NEUTRAL_KEYS } from '@/lib/data/colorAnalyzer'

const BAND = 360 / HUE_BAND_KEYS.length // 15

export function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360
}

export function hueBandIndex(h: number): number {
  return Math.floor((normalizeHue(h) + BAND / 2) / BAND) % HUE_BAND_KEYS.length
}

export function hueBandKey(h: number): string {
  return HUE_BAND_KEYS[hueBandIndex(h)]
}

export function isNeutral(hsl: { s: number; l: number }): boolean {
  return hsl.s < NEUTRAL.minSat || hsl.l < NEUTRAL.minLight || hsl.l > NEUTRAL.maxLight
}

export function colorNameKey(hsl: { h: number; s: number; l: number }): string {
  if (hsl.l < NEUTRAL.minLight) return NEUTRAL_KEYS.black
  if (hsl.l > NEUTRAL.maxLight) return NEUTRAL_KEYS.white
  if (hsl.s < NEUTRAL.minSat) return NEUTRAL_KEYS.gray
  return hueBandKey(hsl.h)
}

/**
 * The band to name in "nudge toward <band>". If sample and target already share
 * a band, name the band one step further along the direction of travel so the
 * sentence always points somewhere new.
 */
export function directionBandKey(sampleHue: number, targetHue: number, delta: number): string {
  const sampleBand = hueBandIndex(sampleHue)
  const targetBand = hueBandIndex(targetHue)
  if (targetBand !== sampleBand) return HUE_BAND_KEYS[targetBand]
  const step = delta >= 0 ? 1 : -1
  return HUE_BAND_KEYS[(sampleBand + step + HUE_BAND_KEYS.length) % HUE_BAND_KEYS.length]
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/math/color-name.test.ts`
Expected: PASS (8).

- [ ] **Step 5: Commit**

```bash
git add src/lib/math/color-name.ts src/lib/math/color-name.test.ts
git commit -m "feat(color-analyzer): hue band naming, neutral detection and nudge direction words"
```

---

### Task 4: `color-fit.ts` — templates, fit, ranking, palette

**Files:**
- Create: `src/lib/math/color-fit.ts`, `src/lib/math/color-fit.test.ts`

**Interfaces:**
- Consumes: `HarmonyType`, `TemplateHarmony`, `TEMPLATE_HARMONIES`, `NUDGE`, `MONO_LIGHTNESS` from `@/lib/data/colorAnalyzer`; `hslToRgb` from `@/lib/math/color`; `normalizeHue` from `./color-name`.
- Produces:
```ts
export interface HarmonyParams { splitAngle: number; analogousSpread: number; tetradicOffset: number }
export interface FitSample { id: string; h: number; s: number; l: number; neutral: boolean }
export type NudgeBand = 'aligned' | 'slight' | 'big'
export interface FitResult { id: string; targetHue: number; delta: number; band: NudgeBand; suggestedHex: string }
export interface HarmonySlot { hue: number; sampleIds: string[] }
export interface HarmonyFit {
  anchorHue: number; keySlot: number; slots: HarmonySlot[]; results: FitResult[]
  meanError: number; normalizedError: number
}
export interface PaletteSwatch { hue: number; s: number; l: number; hex: string; rgb: {r:number;g:number;b:number}; sampleId: string | null; isKey: boolean }
export function rgbToHex(r: number, g: number, b: number): string
export function circularDistance(a: number, b: number): number      // 0..180
export function signedDelta(from: number, to: number): number       // −180 < d ≤ 180
export function harmonyTemplate(type: TemplateHarmony, p: HarmonyParams): number[]
export function nudgeBand(deg: number): NudgeBand
export function fitHarmony(samples: FitSample[], type: HarmonyType, p: HarmonyParams,
  opts: { lockedId?: string | null; customTargets?: Record<string, number>; fallbackHue: number }): HarmonyFit
export function rankHarmonies(samples: FitSample[], p: HarmonyParams): { type: TemplateHarmony; meanError: number; normalizedError: number }[]
export function buildPalette(fit: HarmonyFit, samples: FitSample[], type: HarmonyType, fill: { s: number; l: number }): PaletteSwatch[]
```

- [ ] **Step 1: Write the failing tests**

`src/lib/math/color-fit.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  circularDistance, signedDelta, harmonyTemplate, nudgeBand, fitHarmony, rankHarmonies, buildPalette,
  type FitSample, type HarmonyParams,
} from './color-fit'

const P: HarmonyParams = { splitAngle: 30, analogousSpread: 30, tetradicOffset: 60 }
const s = (id: string, h: number, s = 60, l = 50, neutral = false): FitSample => ({ id, h, s, l, neutral })

describe('circular math', () => {
  it('circularDistance is symmetric and wraps', () => {
    expect(circularDistance(358, 3)).toBe(5)
    expect(circularDistance(3, 358)).toBe(5)
    expect(circularDistance(0, 180)).toBe(180)
    expect(circularDistance(90, 270)).toBe(180)
  })
  it('signedDelta takes the short way with sign', () => {
    expect(signedDelta(358, 3)).toBe(5)
    expect(signedDelta(3, 358)).toBe(-5)
    expect(signedDelta(0, 180)).toBe(180)
    expect(signedDelta(10, 100)).toBe(90)
  })
})

describe('harmonyTemplate', () => {
  it('returns the spec offsets', () => {
    expect(harmonyTemplate('complementary', P)).toEqual([0, 180])
    expect(harmonyTemplate('split-complementary', P)).toEqual([0, 150, 210])
    expect(harmonyTemplate('analogous', P)).toEqual([-30, 0, 30])
    expect(harmonyTemplate('triadic', P)).toEqual([0, 120, 240])
    expect(harmonyTemplate('tetradic', P)).toEqual([0, 60, 180, 240])
    expect(harmonyTemplate('monochromatic', P)).toEqual([0])
  })
})

describe('nudgeBand', () => {
  it('uses the spec thresholds at the boundaries', () => {
    expect(nudgeBand(0)).toBe('aligned')
    expect(nudgeBand(8)).toBe('aligned')
    expect(nudgeBand(8.1)).toBe('slight')
    expect(nudgeBand(25)).toBe('slight')
    expect(nudgeBand(25.1)).toBe('big')
  })
})

describe('fitHarmony', () => {
  it('recovers the rotation of a perfect complementary pair', () => {
    const fit = fitHarmony([s('a', 200), s('b', 20)], 'complementary', P, { fallbackHue: 0 })
    expect([200, 20]).toContain(fit.anchorHue)
    expect(fit.meanError).toBe(0)
    expect(fit.results.every((r) => r.band === 'aligned')).toBe(true)
  })

  it('scores a near miss with signed deltas and bands', () => {
    const fit = fitHarmony([s('a', 200), s('b', 35)], 'complementary', P, { lockedId: 'a', fallbackHue: 0 })
    expect(fit.anchorHue).toBe(200)
    const b = fit.results.find((r) => r.id === 'b')!
    expect(b.targetHue).toBe(20)
    expect(b.delta).toBe(-15)
    expect(b.band).toBe('slight')
    expect(b.suggestedHex).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('lock overrides the best-fit search', () => {
    const free = fitHarmony([s('a', 200), s('b', 30)], 'complementary', P, { fallbackHue: 0 })
    const locked = fitHarmony([s('a', 200), s('b', 30)], 'complementary', P, { lockedId: 'b', fallbackHue: 0 })
    expect(locked.anchorHue).toBe(30)
    expect(free.meanError).toBeLessThanOrEqual(locked.meanError)
  })

  it('allows many-to-one assignment', () => {
    const fit = fitHarmony([s('a', 200), s('b', 205), s('c', 20)], 'complementary', P, { fallbackHue: 0 })
    const blueSlot = fit.slots.find((sl) => sl.sampleIds.includes('a'))!
    expect(blueSlot.sampleIds).toContain('b')
  })

  it('wraps at 0/360: 358 and 3 share a slot and are aligned', () => {
    const fit = fitHarmony([s('a', 358), s('b', 3)], 'monochromatic', P, { fallbackHue: 0 })
    expect(fit.slots[0].sampleIds).toEqual(['a', 'b'])
    expect(fit.results.every((r) => r.band === 'aligned')).toBe(true)
    expect(fit.meanError).toBeLessThanOrEqual(2.5)
  })

  it('ignores neutral samples and falls back to fallbackHue when nothing is scorable', () => {
    const fit = fitHarmony([s('g', 100, 2, 50, true)], 'triadic', P, { fallbackHue: 210 })
    expect(fit.anchorHue).toBe(210)
    expect(fit.results).toEqual([])
    expect(fit.slots.map((x) => x.hue)).toEqual([210, 330, 90])
    expect(fit.meanError).toBe(0)
  })

  it('custom mode reads targets from customTargets and never searches', () => {
    const fit = fitHarmony([s('a', 100), s('b', 200)], 'custom', P,
      { customTargets: { a: 130, b: 200 }, fallbackHue: 0 })
    const a = fit.results.find((r) => r.id === 'a')!
    expect(a.targetHue).toBe(130)
    expect(a.delta).toBe(30)
    expect(a.band).toBe('big')
    expect(fit.results.find((r) => r.id === 'b')!.band).toBe('aligned')
    expect(fit.slots).toHaveLength(2)
  })

  it('keySlot is the template index with offset 0', () => {
    expect(fitHarmony([s('a', 50)], 'analogous', P, { fallbackHue: 0 }).keySlot).toBe(1)
    expect(fitHarmony([s('a', 50)], 'triadic', P, { fallbackHue: 0 }).keySlot).toBe(0)
  })
})

describe('rankHarmonies', () => {
  it('puts the true harmony first on synthetic data', () => {
    const split = [s('a', 30), s('b', 178), s('c', 242)]   // 30, 30+150−2, 30+210+2
    expect(rankHarmonies(split, P)[0].type).toBe('split-complementary')
    const tri = [s('a', 10), s('b', 132), s('c', 248)]
    expect(rankHarmonies(tri, P)[0].type).toBe('triadic')
  })
  it('does not hand tetradic the win just for having four slots', () => {
    const comp = [s('a', 100), s('b', 283)]
    const ranked = rankHarmonies(comp, P)
    expect(ranked[0].type).toBe('complementary')
    expect(ranked.find((r) => r.type === 'tetradic')!.normalizedError)
      .toBeGreaterThan(ranked[0].normalizedError)
  })
  it('returns an empty list with fewer than two scorable samples', () => {
    expect(rankHarmonies([s('a', 10)], P)).toEqual([])
    expect(rankHarmonies([s('a', 10), s('g', 0, 0, 50, true)], P)).toEqual([])
  })
})

describe('buildPalette', () => {
  it('fills empty slots at the fill S/L and marks the key', () => {
    const samples = [s('a', 200, 40, 30)]
    const fit = fitHarmony(samples, 'complementary', P, { fallbackHue: 0 })
    const pal = buildPalette(fit, samples, 'complementary', { s: 40, l: 30 })
    expect(pal).toHaveLength(2)
    expect(pal[0]).toMatchObject({ hue: 200, s: 40, l: 30, sampleId: 'a', isKey: true })
    expect(pal[1]).toMatchObject({ hue: 20, s: 40, l: 30, sampleId: null, isKey: false })
  })
  it('uses the assigned sample actual colour for a filled slot', () => {
    const samples = [s('a', 200, 40, 30), s('b', 25, 80, 60)]
    const fit = fitHarmony(samples, 'complementary', P, { lockedId: 'a', fallbackHue: 0 })
    const pal = buildPalette(fit, samples, 'complementary', { s: 40, l: 30 })
    expect(pal[1]).toMatchObject({ hue: 25, s: 80, l: 60, sampleId: 'b' })
  })
  it('monochromatic yields five lightness steps with the middle as key', () => {
    const samples = [s('a', 120, 50, 50)]
    const fit = fitHarmony(samples, 'monochromatic', P, { fallbackHue: 0 })
    const pal = buildPalette(fit, samples, 'monochromatic', { s: 50, l: 50 })
    expect(pal.map((p) => p.l)).toEqual([20, 35, 50, 65, 80])
    expect(pal.map((p) => p.isKey)).toEqual([false, false, true, false, false])
  })
  it('custom yields one swatch per sample at its target hue', () => {
    const samples = [s('a', 100), s('b', 200)]
    const fit = fitHarmony(samples, 'custom', P, { customTargets: { a: 130, b: 200 }, fallbackHue: 0 })
    const pal = buildPalette(fit, samples, 'custom', { s: 60, l: 50 })
    expect(pal.map((p) => p.hue)).toEqual([130, 200])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/math/color-fit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/math/color-fit.ts`:
```ts
import { hslToRgb } from '@/lib/math/color'
import { MONO_LIGHTNESS, NUDGE, TEMPLATE_HARMONIES, type HarmonyType, type TemplateHarmony } from '@/lib/data/colorAnalyzer'
import { normalizeHue } from './color-name'

export interface HarmonyParams { splitAngle: number; analogousSpread: number; tetradicOffset: number }
export interface FitSample { id: string; h: number; s: number; l: number; neutral: boolean }
export type NudgeBand = 'aligned' | 'slight' | 'big'
export interface FitResult { id: string; targetHue: number; delta: number; band: NudgeBand; suggestedHex: string }
export interface HarmonySlot { hue: number; sampleIds: string[] }
export interface HarmonyFit {
  anchorHue: number
  /** index into slots of the template offset-0 slot (the "key") */
  keySlot: number
  slots: HarmonySlot[]
  results: FitResult[]
  meanError: number
  normalizedError: number
}
export interface PaletteSwatch {
  hue: number; s: number; l: number; hex: string
  rgb: { r: number; g: number; b: number }
  sampleId: string | null
  isKey: boolean
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}

function hslHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(normalizeHue(h), s, l)
  return rgbToHex(r, g, b)
}

export function circularDistance(a: number, b: number): number {
  const d = Math.abs(normalizeHue(a) - normalizeHue(b)) % 360
  return d > 180 ? 360 - d : d
}

/** Signed shortest rotation from → to, in (−180, 180]. */
export function signedDelta(from: number, to: number): number {
  let d = normalizeHue(to) - normalizeHue(from)
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

export function harmonyTemplate(type: TemplateHarmony, p: HarmonyParams): number[] {
  switch (type) {
    case 'complementary': return [0, 180]
    case 'split-complementary': return [0, 180 - p.splitAngle, 180 + p.splitAngle]
    case 'analogous': return [-p.analogousSpread, 0, p.analogousSpread]
    case 'triadic': return [0, 120, 240]
    case 'tetradic': return [0, p.tetradicOffset, 180, 180 + p.tetradicOffset]
    case 'monochromatic': return [0]
  }
}

export function nudgeBand(deg: number): NudgeBand {
  if (deg <= NUDGE.aligned) return 'aligned'
  if (deg <= NUDGE.slight) return 'slight'
  return 'big'
}

function nearestSlot(hue: number, slotHues: number[]): { index: number; dist: number } {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < slotHues.length; i++) {
    const d = circularDistance(hue, slotHues[i])
    if (d < bestDist) { bestDist = d; best = i }
  }
  return { index: best, dist: bestDist }
}

function errorForAnchor(anchor: number, template: number[], hues: number[]): { sum: number; max: number } {
  const slotHues = template.map((o) => normalizeHue(anchor + o))
  let sum = 0
  let max = 0
  for (const h of hues) {
    const { dist } = nearestSlot(h, slotHues)
    sum += dist
    if (dist > max) max = dist
  }
  return { sum, max }
}

function searchAnchor(template: number[], hues: number[]): number {
  let best = 0
  let bestSum = Infinity
  let bestMax = Infinity
  for (let a = 0; a < 360; a++) {
    const { sum, max } = errorForAnchor(a, template, hues)
    if (sum < bestSum - 1e-9 || (Math.abs(sum - bestSum) <= 1e-9 && max < bestMax)) {
      best = a; bestSum = sum; bestMax = max
    }
  }
  return best
}

function makeResult(sample: FitSample, targetHue: number): FitResult {
  const delta = signedDelta(sample.h, targetHue)
  return {
    id: sample.id,
    targetHue: normalizeHue(targetHue),
    delta,
    band: nudgeBand(Math.abs(delta)),
    suggestedHex: hslHex(targetHue, sample.s, sample.l),
  }
}

export function fitHarmony(
  samples: FitSample[],
  type: HarmonyType,
  p: HarmonyParams,
  opts: { lockedId?: string | null; customTargets?: Record<string, number>; fallbackHue: number },
): HarmonyFit {
  const scorable = samples.filter((s) => !s.neutral)

  if (type === 'custom') {
    const targets = opts.customTargets ?? {}
    const slots: HarmonySlot[] = []
    const results: FitResult[] = []
    for (const s of scorable) {
      const target = targets[s.id] ?? s.h
      slots.push({ hue: normalizeHue(target), sampleIds: [s.id] })
      results.push(makeResult(s, target))
    }
    const mean = results.length ? results.reduce((a, r) => a + Math.abs(r.delta), 0) / results.length : 0
    return { anchorHue: normalizeHue(scorable[0]?.h ?? opts.fallbackHue), keySlot: 0, slots, results, meanError: mean, normalizedError: mean / 180 }
  }

  const template = harmonyTemplate(type, p)
  const keySlot = template.indexOf(0)
  const locked = opts.lockedId ? scorable.find((s) => s.id === opts.lockedId) : undefined

  let anchor: number
  if (locked) anchor = normalizeHue(locked.h)
  else if (scorable.length === 0) anchor = normalizeHue(opts.fallbackHue)
  else anchor = searchAnchor(template, scorable.map((s) => s.h))

  const slots: HarmonySlot[] = template.map((o) => ({ hue: normalizeHue(anchor + o), sampleIds: [] }))
  const slotHues = slots.map((s) => s.hue)
  const results: FitResult[] = []
  let sum = 0
  for (const s of scorable) {
    const { index, dist } = nearestSlot(s.h, slotHues)
    slots[index].sampleIds.push(s.id)
    results.push(makeResult(s, slotHues[index]))
    sum += dist
  }
  const meanError = scorable.length ? sum / scorable.length : 0
  const normalizedError = meanError / (180 / template.length)
  return { anchorHue: anchor, keySlot, slots, results, meanError, normalizedError }
}

export function rankHarmonies(samples: FitSample[], p: HarmonyParams) {
  const scorable = samples.filter((s) => !s.neutral)
  if (scorable.length < 2) return []
  return TEMPLATE_HARMONIES
    .map((type) => {
      const fit = fitHarmony(scorable, type, p, { fallbackHue: 0 })
      return { type, meanError: fit.meanError, normalizedError: fit.normalizedError }
    })
    .sort((a, b) => a.normalizedError - b.normalizedError)
}

function swatch(hue: number, s: number, l: number, sampleId: string | null, isKey: boolean): PaletteSwatch {
  const h = normalizeHue(hue)
  const rgb = hslToRgb(h, s, l)
  return { hue: h, s, l, hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb, sampleId, isKey }
}

export function buildPalette(fit: HarmonyFit, samples: FitSample[], type: HarmonyType, fill: { s: number; l: number }): PaletteSwatch[] {
  const byId = new Map(samples.map((s) => [s.id, s]))

  if (type === 'monochromatic') {
    return MONO_LIGHTNESS.map((l, i) => swatch(fit.anchorHue, fill.s, l, null, i === 2))
  }

  if (type === 'custom') {
    return fit.slots.map((slot, i) => {
      const s = byId.get(slot.sampleIds[0])
      return swatch(slot.hue, s?.s ?? fill.s, s?.l ?? fill.l, slot.sampleIds[0] ?? null, i === 0)
    })
  }

  return fit.slots.map((slot, i) => {
    // nearest assigned sample (smallest |delta|) represents a filled slot
    let best: FitSample | undefined
    let bestDist = Infinity
    for (const id of slot.sampleIds) {
      const s = byId.get(id)
      if (!s) continue
      const d = circularDistance(s.h, slot.hue)
      if (d < bestDist) { bestDist = d; best = s }
    }
    return best
      ? swatch(best.h, best.s, best.l, best.id, i === fit.keySlot)
      : swatch(slot.hue, fill.s, fill.l, null, i === fit.keySlot)
  })
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/math/color-fit.test.ts`
Expected: PASS (17). If "recovers the rotation" fails because the search returned 20 instead of 200: both are valid (the test accepts either); if it fails on `meanError`, check `circularDistance` wrap.

- [ ] **Step 5: Commit**

```bash
git add src/lib/math/color-fit.ts src/lib/math/color-fit.test.ts
git commit -m "feat(color-analyzer): harmony templates, best-fit anchor search, ranking and palette builder"
```

---

### Task 5: `color-cluster.ts` — deterministic k-means for Auto-pick

**Files:**
- Create: `src/lib/math/color-cluster.ts`, `src/lib/math/color-cluster.test.ts`

**Interfaces:**
- Consumes: `CLUSTER` from `@/lib/data/colorAnalyzer`; `rgbToHsl` from `@/lib/math/color`; `isNeutral` from `./color-name`.
- Produces:
```ts
export function mulberry32(seed: number): () => number            // [0, 1)
export interface ClusterPick { x: number; y: number; rgb: { r: number; g: number; b: number } }  // x,y in 0..1 (pixel centre)
export function dominantColors(data: Uint8ClampedArray, width: number, height: number,
  opts?: { k?: number; iterations?: number; seed?: number; chromaticMinFraction?: number }): ClusterPick[]
```

- [ ] **Step 1: Write the failing tests**

`src/lib/math/color-cluster.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mulberry32, dominantColors } from './color-cluster'

/** Build an RGBA buffer from a function of (x, y). */
function image(width: number, height: number, px: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = px(x, y)
    const i = (y * width + x) * 4
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
  }
  return data
}

describe('mulberry32', () => {
  it('is deterministic for a seed and stays in [0,1)', () => {
    const a = mulberry32(7); const b = mulberry32(7)
    const xs = Array.from({ length: 5 }, () => a())
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()))
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) }
  })
})

describe('dominantColors', () => {
  const threeBlocks = image(30, 10, (x) => x < 10 ? [220, 30, 30] : x < 20 ? [30, 200, 60] : [40, 60, 220])

  it('recovers three pure colour blocks and drops empty clusters', () => {
    const picks = dominantColors(threeBlocks, 30, 10, { k: 5 })
    expect(picks.length).toBe(3)
    const reds = picks.filter((p) => p.rgb.r > 200)
    expect(reds).toHaveLength(1)
    expect(reds[0].x).toBeLessThan(10 / 30)
  })

  it('is deterministic for the same seed', () => {
    const a = dominantColors(threeBlocks, 30, 10, { seed: 3 })
    const b = dominantColors(threeBlocks, 30, 10, { seed: 3 })
    expect(a).toEqual(b)
  })

  it('returns pixel-centre coordinates in 0..1', () => {
    for (const p of dominantColors(threeBlocks, 30, 10)) {
      expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(1)
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(1)
    }
  })

  it('prefers chromatic pixels over a dominant neutral background', () => {
    // 90% mid-gray, 10% orange stripe → clustering must still return orange, not five grays
    const mostlyGray = image(100, 10, (x) => x < 10 ? [230, 120, 20] : [128, 128, 128])
    const picks = dominantColors(mostlyGray, 100, 10, { k: 5 })
    expect(picks.every((p) => p.rgb.r > 200 && p.rgb.g < 140)).toBe(true)
  })

  it('falls back to all pixels when almost nothing is chromatic', () => {
    const gray = image(20, 20, (x) => x === 0 ? [200, 20, 20] : [100, 100, 100])   // 5% chromatic exactly → below? 20/400 = 5%
    const picks = dominantColors(gray, 20, 20, { k: 2, chromaticMinFraction: 0.1 })
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.some((p) => p.rgb.r === 100)).toBe(true)
  })

  it('returns an empty list for an empty image', () => {
    expect(dominantColors(new Uint8ClampedArray(0), 0, 0)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/math/color-cluster.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/math/color-cluster.ts`:
```ts
import { CLUSTER } from '@/lib/data/colorAnalyzer'
import { rgbToHsl } from '@/lib/math/color'
import { isNeutral } from './color-name'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface ClusterPick { x: number; y: number; rgb: { r: number; g: number; b: number } }

interface Px { i: number; r: number; g: number; b: number }

function dist2(p: Px, c: number[]): number {
  const dr = p.r - c[0], dg = p.g - c[1], db = p.b - c[2]
  return dr * dr + dg * dg + db * db
}

export function dominantColors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: { k?: number; iterations?: number; seed?: number; chromaticMinFraction?: number } = {},
): ClusterPick[] {
  const k = opts.k ?? CLUSTER.k
  const iterations = opts.iterations ?? CLUSTER.iterations
  const minFrac = opts.chromaticMinFraction ?? CLUSTER.chromaticMinFraction
  const total = width * height
  if (total === 0) return []

  const all: Px[] = []
  const chromatic: Px[] = []
  for (let i = 0; i < total; i++) {
    const p = { i, r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] }
    all.push(p)
    if (!isNeutral(rgbToHsl(p.r, p.g, p.b))) chromatic.push(p)
  }
  const pixels = chromatic.length >= minFrac * total && chromatic.length > 0 ? chromatic : all
  const kk = Math.min(k, pixels.length)

  // k-means++ seeding
  const rand = mulberry32(opts.seed ?? CLUSTER.seed)
  const centroids: number[][] = []
  const first = pixels[Math.floor(rand() * pixels.length)]
  centroids.push([first.r, first.g, first.b])
  while (centroids.length < kk) {
    const d = pixels.map((p) => Math.min(...centroids.map((c) => dist2(p, c))))
    const sum = d.reduce((a, b) => a + b, 0)
    if (sum === 0) break
    let r = rand() * sum
    let idx = 0
    for (; idx < d.length - 1; idx++) { r -= d[idx]; if (r <= 0) break }
    centroids.push([pixels[idx].r, pixels[idx].g, pixels[idx].b])
  }

  // Lloyd iterations
  let assign = new Int32Array(pixels.length)
  for (let it = 0; it < iterations; it++) {
    const sums = centroids.map(() => [0, 0, 0, 0])
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bd = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const dd = dist2(pixels[i], centroids[c])
        if (dd < bd) { bd = dd; best = c }
      }
      assign[i] = best
      const s = sums[best]; s[0] += pixels[i].r; s[1] += pixels[i].g; s[2] += pixels[i].b; s[3]++
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] > 0) centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]]
    }
  }

  // Representative pixel = member nearest its centroid; empty clusters dropped
  const picks: ClusterPick[] = []
  for (let c = 0; c < centroids.length; c++) {
    let best: Px | null = null, bd = Infinity
    for (let i = 0; i < pixels.length; i++) {
      if (assign[i] !== c) continue
      const dd = dist2(pixels[i], centroids[c])
      if (dd < bd) { bd = dd; best = pixels[i] }
    }
    if (!best) continue
    picks.push({
      x: ((best.i % width) + 0.5) / width,
      y: (Math.floor(best.i / width) + 0.5) / height,
      rgb: { r: best.r, g: best.g, b: best.b },
    })
  }
  return picks
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/math/color-cluster.test.ts`
Expected: PASS (7). If the "three blocks" test yields 2 picks, seeding collapsed two centroids onto one block; bump `seed` in the test options until stable and keep that seed in `CLUSTER.seed` — determinism, not a specific seed, is the requirement.

- [ ] **Step 5: Commit**

```bash
git add src/lib/math/color-cluster.ts src/lib/math/color-cluster.test.ts
git commit -m "feat(color-analyzer): deterministic chromatic-first k-means for auto-pick"
```

---

### Task 6: `useSampling.ts` — analysis canvas, patch average, sampleAt

**Files:**
- Create: `src/app/[locale]/color-analyzer/_components/useSampling.ts`, `useSampling.test.ts`

**Interfaces:**
- Consumes: `ANALYSIS_LONG_EDGE`, `PATCH_SIZE`, `CLUSTER` from data; `rgbToHsl` from `@/lib/math/color`; `isNeutral` from `@/lib/math/color-name`; `dominantColors` from `@/lib/math/color-cluster`.
- Produces:
```ts
export interface AnalysisPhoto { canvas: HTMLCanvasElement; width: number; height: number }
export interface SampledColor { rgb: {r:number;g:number;b:number}; hsl: {h:number;s:number;l:number}; neutral: boolean }
export function patchAverage(data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, size: number): { r: number; g: number; b: number }
export async function decodeToAnalysisCanvas(file: File, maxLongEdge?: number): Promise<AnalysisPhoto>
export function sampleAt(photo: AnalysisPhoto, x01: number, y01: number): SampledColor
export function autoPickPoints(photo: AnalysisPhoto): { x: number; y: number }[]
```

- [ ] **Step 1: Write the failing test for the pure function**

`src/app/[locale]/color-analyzer/_components/useSampling.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { patchAverage } from './useSampling'

function solid(width: number, height: number, rgb: [number, number, number], override?: (x: number, y: number) => [number, number, number] | null) {
  const d = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = override?.(x, y) ?? rgb
    const i = (y * width + x) * 4
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255
  }
  return d
}

describe('patchAverage', () => {
  it('averages a 5×5 patch', () => {
    // 10×10 image, all (100,100,100) except the centre pixel (5,5) which is (200,200,200)
    const d = solid(10, 10, [100, 100, 100], (x, y) => (x === 5 && y === 5 ? [200, 200, 200] : null))
    const avg = patchAverage(d, 10, 10, 5, 5, 5)
    // 24 × 100 + 1 × 200 = 2600 / 25 = 104
    expect(avg).toEqual({ r: 104, g: 104, b: 104 })
  })

  it('clamps the patch at the image edge instead of reading out of range', () => {
    const d = solid(10, 10, [50, 60, 70], (x, y) => (x === 0 && y === 0 ? [250, 60, 70] : null))
    // patch centred at (0,0) covers x 0..2, y 0..2 → 9 pixels, one of them 250
    const avg = patchAverage(d, 10, 10, 0, 0, 5)
    expect(avg.r).toBe(Math.round((8 * 50 + 250) / 9))
    expect(avg.g).toBe(60)
  })

  it('rounds to integers', () => {
    const d = solid(3, 3, [1, 2, 3], (x) => (x === 0 ? [2, 2, 3] : null))
    const avg = patchAverage(d, 3, 3, 1, 1, 3)
    expect(Number.isInteger(avg.r)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/useSampling.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/app/[locale]/color-analyzer/_components/useSampling.ts`:
```ts
import { ANALYSIS_LONG_EDGE, CLUSTER, PATCH_SIZE } from '@/lib/data/colorAnalyzer'
import { rgbToHsl } from '@/lib/math/color'
import { isNeutral } from '@/lib/math/color-name'
import { dominantColors } from '@/lib/math/color-cluster'

export interface AnalysisPhoto { canvas: HTMLCanvasElement; width: number; height: number }
export interface SampledColor {
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  neutral: boolean
}

/** Mean RGB of a size×size patch centred on (cx, cy), clamped to the image. */
export function patchAverage(
  data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, size: number,
): { r: number; g: number; b: number } {
  const half = Math.floor(size / 2)
  const x0 = Math.max(0, cx - half), x1 = Math.min(width - 1, cx + half)
  const y0 = Math.max(0, cy - half), y1 = Math.min(height - 1, cy + half)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * width + x) * 4
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
  }
  if (n === 0) return { r: 0, g: 0, b: 0 }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

function fitSize(w: number, h: number, maxLongEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxLongEdge / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

async function decodeWithImg(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('unsupported image'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Decode a File to an offscreen canvas no larger than maxLongEdge on its long
 * side. Prefers createImageBitmap with EXIF orientation + resize; falls back to
 * an <img> decode (which also honours EXIF orientation in current browsers).
 */
export async function decodeToAnalysisCanvas(file: File, maxLongEdge = ANALYSIS_LONG_EDGE): Promise<AnalysisPhoto> {
  let source: ImageBitmap | HTMLImageElement
  let w: number, h: number
  try {
    const probe = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const size = fitSize(probe.width, probe.height, maxLongEdge)
    probe.close()
    source = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: 'high',
    })
    w = source.width; h = source.height
  } catch {
    const img = await decodeWithImg(file)
    const size = fitSize(img.naturalWidth, img.naturalHeight, maxLongEdge)
    source = img; w = size.width; h = size.height
  }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no 2d context')
  ctx.drawImage(source, 0, 0, w, h)
  if ('close' in source) source.close()
  return { canvas, width: w, height: h }
}

export function sampleAt(photo: AnalysisPhoto, x01: number, y01: number): SampledColor {
  const ctx = photo.canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('no 2d context')
  const cx = Math.min(photo.width - 1, Math.max(0, Math.round(x01 * photo.width)))
  const cy = Math.min(photo.height - 1, Math.max(0, Math.round(y01 * photo.height)))
  const half = Math.floor(PATCH_SIZE / 2)
  const x0 = Math.max(0, cx - half), y0 = Math.max(0, cy - half)
  const x1 = Math.min(photo.width - 1, cx + half), y1 = Math.min(photo.height - 1, cy + half)
  const img = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
  const rgb = patchAverage(img.data, img.width, img.height, cx - x0, cy - y0, PATCH_SIZE)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return { rgb, hsl, neutral: isNeutral(hsl) }
}

/** Downscale to CLUSTER.width and run k-means; returns image-relative points. */
export function autoPickPoints(photo: AnalysisPhoto): { x: number; y: number }[] {
  const w = Math.min(CLUSTER.width, photo.width)
  const h = Math.max(1, Math.round((photo.height / photo.width) * w))
  const small = document.createElement('canvas')
  small.width = w; small.height = h
  const ctx = small.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(photo.canvas, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  return dominantColors(data, w, h).map(({ x, y }) => ({ x, y }))
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/useSampling.test.ts" && npm run type-check`
Expected: PASS (3); type-check clean. (`createImageBitmap` options are typed in lib.dom; `resizeQuality` is fine.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/color-analyzer/_components/useSampling.ts" "src/app/[locale]/color-analyzer/_components/useSampling.test.ts"
git commit -m "feat(color-analyzer): analysis canvas decode, 5x5 patch sampling and auto-pick points"
```

---

### Task 7: `analyzerState.ts` — reducer for samples, selection, lock, custom targets

**Files:**
- Create: `src/app/[locale]/color-analyzer/_components/analyzerState.ts`, `analyzerState.test.ts`

**Interfaces:**
- Consumes: `SAMPLE_CAP` from data; `SampledColor` from `./useSampling`.
- Produces:
```ts
export interface Sample { id: string; x: number; y: number; rgb: {r;g;b}; hsl: {h;s;l}; neutral: boolean; label: string; locked: boolean }
export interface SampleState { samples: Sample[]; selectedId: string | null; customTargets: Record<string, number> }
export const EMPTY_STATE: SampleState
export type SampleAction =
  | { type: 'add'; id: string; x: number; y: number; color: SampledColor; label: string }
  | { type: 'replaceAll'; samples: Sample[] }
  | { type: 'move'; id: string; x: number; y: number; color: SampledColor }
  | { type: 'relabel'; id: string; label: string }
  | { type: 'select'; id: string | null }
  | { type: 'lock'; id: string; locked: boolean }
  | { type: 'remove'; id: string }
  | { type: 'setCustomTarget'; id: string; hue: number }
  | { type: 'resetCustomTargets' }        // every sample's target = its own hue
  | { type: 'clear' }
export function sampleReducer(state: SampleState, action: SampleAction): SampleState
export function newSampleId(): string
```

- [ ] **Step 1: Write the failing tests**

`src/app/[locale]/color-analyzer/_components/analyzerState.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sampleReducer, EMPTY_STATE, type SampleState, type Sample } from './analyzerState'
import { SAMPLE_CAP } from '@/lib/data/colorAnalyzer'

const color = (h: number) => ({ rgb: { r: 10, g: 20, b: 30 }, hsl: { h, s: 50, l: 50 }, neutral: false })
const add = (state: SampleState, id: string, h = 200) =>
  sampleReducer(state, { type: 'add', id, x: 0.5, y: 0.5, color: color(h), label: 'blue' })

describe('sampleReducer', () => {
  it('adds a sample and selects it', () => {
    const s = add(EMPTY_STATE, 'a')
    expect(s.samples).toHaveLength(1)
    expect(s.samples[0]).toMatchObject({ id: 'a', x: 0.5, y: 0.5, label: 'blue', locked: false, neutral: false })
    expect(s.selectedId).toBe('a')
  })

  it('refuses to add beyond SAMPLE_CAP', () => {
    let s = EMPTY_STATE
    for (let i = 0; i < SAMPLE_CAP + 2; i++) s = add(s, `s${i}`)
    expect(s.samples).toHaveLength(SAMPLE_CAP)
  })

  it('move updates position and colour, keeps label and lock', () => {
    let s = add(EMPTY_STATE, 'a')
    s = sampleReducer(s, { type: 'lock', id: 'a', locked: true })
    s = sampleReducer(s, { type: 'move', id: 'a', x: 0.1, y: 0.2, color: color(30) })
    expect(s.samples[0]).toMatchObject({ x: 0.1, y: 0.2, locked: true, label: 'blue' })
    expect(s.samples[0].hsl.h).toBe(30)
  })

  it('lock is exclusive', () => {
    let s = add(add(EMPTY_STATE, 'a'), 'b')
    s = sampleReducer(s, { type: 'lock', id: 'a', locked: true })
    s = sampleReducer(s, { type: 'lock', id: 'b', locked: true })
    expect(s.samples.map((x) => x.locked)).toEqual([false, true])
  })

  it('remove clears selection, lock and custom target for that id', () => {
    let s = add(add(EMPTY_STATE, 'a'), 'b')
    s = sampleReducer(s, { type: 'lock', id: 'b', locked: true })
    s = sampleReducer(s, { type: 'setCustomTarget', id: 'b', hue: 90 })
    s = sampleReducer(s, { type: 'select', id: 'b' })
    s = sampleReducer(s, { type: 'remove', id: 'b' })
    expect(s.samples.map((x) => x.id)).toEqual(['a'])
    expect(s.selectedId).toBeNull()
    expect(s.customTargets).toEqual({})
  })

  it('resetCustomTargets sets every scorable sample target to its own hue', () => {
    let s = add(add(EMPTY_STATE, 'a', 100), 'b', 250)
    s = sampleReducer(s, { type: 'resetCustomTargets' })
    expect(s.customTargets).toEqual({ a: 100, b: 250 })
  })

  it('replaceAll swaps the set, clears selection/lock/custom targets', () => {
    let s = add(EMPTY_STATE, 'a')
    s = sampleReducer(s, { type: 'setCustomTarget', id: 'a', hue: 5 })
    const next: Sample[] = [{ id: 'z', x: 0.2, y: 0.2, ...color(10), label: 'red', locked: true }]
    s = sampleReducer(s, { type: 'replaceAll', samples: next })
    expect(s.samples.map((x) => x.id)).toEqual(['z'])
    expect(s.samples[0].locked).toBe(false)
    expect(s.selectedId).toBeNull()
    expect(s.customTargets).toEqual({})
  })

  it('clear returns EMPTY_STATE', () => {
    expect(sampleReducer(add(EMPTY_STATE, 'a'), { type: 'clear' })).toEqual(EMPTY_STATE)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/analyzerState.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/app/[locale]/color-analyzer/_components/analyzerState.ts`:
```ts
import { SAMPLE_CAP } from '@/lib/data/colorAnalyzer'
import type { SampledColor } from './useSampling'

export interface Sample extends SampledColor {
  id: string
  /** image-relative 0..1 */
  x: number
  y: number
  label: string
  locked: boolean
}

export interface SampleState {
  samples: Sample[]
  selectedId: string | null
  customTargets: Record<string, number>
}

export const EMPTY_STATE: SampleState = { samples: [], selectedId: null, customTargets: {} }

export type SampleAction =
  | { type: 'add'; id: string; x: number; y: number; color: SampledColor; label: string }
  | { type: 'replaceAll'; samples: Sample[] }
  | { type: 'move'; id: string; x: number; y: number; color: SampledColor }
  | { type: 'relabel'; id: string; label: string }
  | { type: 'select'; id: string | null }
  | { type: 'lock'; id: string; locked: boolean }
  | { type: 'remove'; id: string }
  | { type: 'setCustomTarget'; id: string; hue: number }
  | { type: 'resetCustomTargets' }
  | { type: 'clear' }

let counter = 0
export function newSampleId(): string {
  counter += 1
  return `s${Date.now().toString(36)}${counter}`
}

export function sampleReducer(state: SampleState, action: SampleAction): SampleState {
  switch (action.type) {
    case 'add': {
      if (state.samples.length >= SAMPLE_CAP) return state
      const sample: Sample = { id: action.id, x: action.x, y: action.y, ...action.color, label: action.label, locked: false }
      return { ...state, samples: [...state.samples, sample], selectedId: action.id }
    }
    case 'replaceAll':
      return { samples: action.samples.slice(0, SAMPLE_CAP).map((s) => ({ ...s, locked: false })), selectedId: null, customTargets: {} }
    case 'move':
      return { ...state, samples: state.samples.map((s) => s.id === action.id ? { ...s, x: action.x, y: action.y, ...action.color } : s) }
    case 'relabel':
      return { ...state, samples: state.samples.map((s) => s.id === action.id ? { ...s, label: action.label } : s) }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'lock':
      return { ...state, samples: state.samples.map((s) => ({ ...s, locked: s.id === action.id ? action.locked : false })) }
    case 'remove': {
      const { [action.id]: _dropped, ...customTargets } = state.customTargets
      return {
        samples: state.samples.filter((s) => s.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        customTargets,
      }
    }
    case 'setCustomTarget':
      return { ...state, customTargets: { ...state.customTargets, [action.id]: ((action.hue % 360) + 360) % 360 } }
    case 'resetCustomTargets':
      return { ...state, customTargets: Object.fromEntries(state.samples.filter((s) => !s.neutral).map((s) => [s.id, s.hsl.h])) }
    case 'clear':
      return EMPTY_STATE
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/analyzerState.test.ts"`
Expected: PASS (8). ESLint may flag `_dropped` as unused; the repo's config allows `_`-prefixed names — if it does not, replace the destructure with `const customTargets = { ...state.customTargets }; delete customTargets[action.id]`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/color-analyzer/_components/analyzerState.ts" "src/app/[locale]/color-analyzer/_components/analyzerState.test.ts"
git commit -m "feat(color-analyzer): sample state reducer with exclusive lock and custom targets"
```

---

### Task 8: Wheel — hit testing, overlay renderer, pointer hook, `ColorWheel` API

**Files:**
- Create: `src/app/[locale]/color-analyzer/_components/wheelHit.ts`, `wheelHit.test.ts`
- Modify: `drawWheel.ts` (keep `hueToPos`, `drawWheelPixels`; replace `drawOverlay` with `drawAnalyzerOverlay`), `useWheelPointer.ts` (rewrite), `ColorWheel.tsx` (rewrite), `PaletteBar.tsx` + `buildColorExport.ts` (import paths only), `page.tsx`
- Create: `ColorAnalyzer.module.css` (copy of the old module + view toggle rules), `ColorAnalyzer.tsx` (placeholder)
- Delete: `ColorHarmony.tsx`, `ColorHarmony.module.css`, `colorHarmonyHelpers.ts`, `ColorSidebar.tsx`, `PhotoPicker.tsx`, `PhotoPicker.module.css`, `DropZone.tsx`, `useMagnifier.ts`

**Interfaces:**
- Consumes: `hueToPos` (existing), `rgbToHex` from `@/lib/math/color-fit`, `hslToRgb`.
- Produces:
```ts
// wheelHit.ts
export interface WheelPoint { id: string; hue: number; r: number }        // r = radius 0..100
export function pointerToPolar(px: number, py: number, cx: number, cy: number, radius: number): { hue: number; r: number; inside: boolean }
export function hitTest(points: WheelPoint[], px: number, py: number, cx: number, cy: number, radius: number, hitRadius: number): string | null

// drawWheel.ts
export interface WheelDot { id: string; hue: number; r: number; hex: string; index: number; isKey: boolean; neutral: boolean }
export interface WheelTarget { id: string; hue: number; r: number; filled: boolean }
export interface WheelArrow { fromId: string; toHue: number; toR: number }
export function drawAnalyzerOverlay(ctx, canvasPixels, dpr, o: { dots: WheelDot[]; targets: WheelTarget[]; arrows: WheelArrow[]; keyDot: WheelDot | null; selectedId: string | null; lightness: number }): void

// ColorWheel.tsx
export type WheelView = 'natural' | 'pure' | 'guide'
export interface ColorWheelProps {
  lightness: number; dots: WheelDot[]; targets: WheelTarget[]; arrows: WheelArrow[]
  keyDot: { hue: number; s: number } | null; selectedId: string | null; customDraggable: boolean
  onKeyChange: (hue: number, s: number) => void; onSelectDot: (id: string) => void; onCustomTargetDrag: (id: string, hue: number) => void
}
export const ColorWheel: ForwardRefExoticComponent<ColorWheelProps & RefAttributes<ColorWheelHandle>>   // handle.getCanvas()
export function WheelViewToggle({ view, onChange, labels }: { view: WheelView; onChange: (v: WheelView) => void; labels: Record<WheelView, string> }): JSX.Element
```

- [ ] **Step 1: Write the failing hit-test tests**

`src/app/[locale]/color-analyzer/_components/wheelHit.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pointerToPolar, hitTest, type WheelPoint } from './wheelHit'
import { hueToPos } from './drawWheel'

const cx = 100, cy = 100, R = 100

describe('pointerToPolar', () => {
  it('maps the top of the wheel to hue 0 and the rim to r 100', () => {
    const p = pointerToPolar(100, 0, cx, cy, R)
    expect(p.hue).toBe(0); expect(p.r).toBe(100); expect(p.inside).toBe(true)
  })
  it('maps right to hue 90 and half radius to r 50', () => {
    const p = pointerToPolar(150, 100, cx, cy, R)
    expect(p.hue).toBe(90); expect(p.r).toBe(50)
  })
  it('clamps r at 100 and reports outside', () => {
    const p = pointerToPolar(100, -50, cx, cy, R)
    expect(p.r).toBe(100); expect(p.inside).toBe(false)
  })
  it('round-trips hueToPos', () => {
    const pos = hueToPos(213, 64, cx, cy, R)
    const p = pointerToPolar(pos.x, pos.y, cx, cy, R)
    expect(p.hue).toBe(213); expect(p.r).toBe(64)
  })
})

describe('hitTest', () => {
  const pts: WheelPoint[] = [{ id: 'a', hue: 0, r: 100 }, { id: 'b', hue: 0, r: 80 }]
  it('returns the nearest point within hitRadius', () => {
    const pos = hueToPos(0, 82, cx, cy, R)   // between a (100) and b (80), nearer b
    expect(hitTest(pts, pos.x, pos.y, cx, cy, R, 12)).toBe('b')
  })
  it('returns null when nothing is within hitRadius', () => {
    expect(hitTest(pts, cx, cy, cx, cy, R, 12)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/wheelHit.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `wheelHit.ts`**

```ts
import { hueToPos } from './drawWheel'

export interface WheelPoint { id: string; hue: number; r: number }

export function pointerToPolar(px: number, py: number, cx: number, cy: number, radius: number) {
  const dx = px - cx
  const dy = py - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  let hue = Math.atan2(dx, -dy) * (180 / Math.PI)
  if (hue < 0) hue += 360
  return { hue: Math.round(hue) % 360, r: Math.round(Math.min(dist / radius, 1) * 100), inside: dist <= radius }
}

export function hitTest(points: WheelPoint[], px: number, py: number, cx: number, cy: number, radius: number, hitRadius: number): string | null {
  let best: string | null = null
  let bestD = hitRadius
  for (const p of points) {
    const pos = hueToPos(p.hue, p.r, cx, cy, radius)
    const d = Math.hypot(px - pos.x, py - pos.y)
    if (d < bestD) { bestD = d; best = p.id }
  }
  return best
}
```

- [ ] **Step 4: Run the hit tests**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/wheelHit.test.ts"`
Expected: PASS (6).

- [ ] **Step 5: Replace `drawOverlay` in `drawWheel.ts`**

Delete `drawDot`, `MonoPoint`, `drawOverlay` and the local `rgbToHex`; import `rgbToHex` from `@/lib/math/color-fit`. Keep `hueToPos` and `drawWheelPixels` untouched. Append:

```ts
export interface WheelDot { id: string; hue: number; r: number; hex: string; index: number; isKey: boolean; neutral: boolean }
export interface WheelTarget { id: string; hue: number; r: number; filled: boolean }
export interface WheelArrow { fromId: string; toHue: number; toR: number }

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2)
}

function drawNumberedDot(ctx: CanvasRenderingContext2D, x: number, y: number, dot: WheelDot, selected: boolean, dpr: number) {
  const radius = (dot.isKey ? 12 : 10) * dpr
  circle(ctx, x, y, radius)
  ctx.fillStyle = dot.hex; ctx.fill()
  ctx.lineWidth = (selected ? 3 : 2) * dpr
  ctx.strokeStyle = selected ? '#ffd166' : '#ffffff'; ctx.stroke()
  if (dot.isKey) {
    circle(ctx, x, y, radius + 4 * dpr)
    ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke()
  }
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${10 * dpr}px system-ui, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3 * dpr
  ctx.strokeText(String(dot.index), x, y)
  ctx.fillText(String(dot.index), x, y)
}

function drawArrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, dpr: number) {
  const angle = Math.atan2(y1 - y0, x1 - x0)
  const head = 8 * dpr
  const shorten = 12 * dpr   // stop before the target circle
  const ex = x1 - Math.cos(angle) * shorten
  const ey = y1 - Math.sin(angle) * shorten
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5 * dpr; ctx.setLineDash([]); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - head * Math.cos(angle - Math.PI / 6), ey - head * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(ex - head * Math.cos(angle + Math.PI / 6), ey - head * Math.sin(angle + Math.PI / 6))
  ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill()
}

/**
 * Draws targets (dashed), arrows (dot → target), numbered sample dots, and the
 * key dot (no-sample mode). Call after drawWheelPixels on the same context.
 */
export function drawAnalyzerOverlay(
  ctx: CanvasRenderingContext2D,
  canvasPixels: number,
  dpr: number,
  o: { dots: WheelDot[]; targets: WheelTarget[]; arrows: WheelArrow[]; keyDot: WheelDot | null; selectedId: string | null; lightness: number },
) {
  const cx = canvasPixels / 2, cy = canvasPixels / 2, R = cx
  const dotById = new Map(o.dots.map((d) => [d.id, d]))

  // spokes + dashed targets
  for (const t of o.targets) {
    const pos = hueToPos(t.hue, t.r, cx, cy, R)
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1 * dpr; ctx.setLineDash([]); ctx.stroke()
    circle(ctx, pos.x, pos.y, 10 * dpr)
    if (!t.filled) {
      const rgb = hslToRgb(t.hue, t.r, o.lightness)
      ctx.fillStyle = rgbToHex(rgb.r, rgb.g, rgb.b) + '99'; ctx.fill()
    }
    ctx.setLineDash([4 * dpr, 3 * dpr]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * dpr; ctx.stroke()
    ctx.setLineDash([])
  }

  for (const a of o.arrows) {
    const from = dotById.get(a.fromId)
    if (!from) continue
    const p0 = hueToPos(from.hue, from.r, cx, cy, R)
    const p1 = hueToPos(a.toHue, a.toR, cx, cy, R)
    drawArrow(ctx, p0.x, p0.y, p1.x, p1.y, dpr)
  }

  for (const d of o.dots) {
    const pos = d.neutral ? { x: cx, y: cy } : hueToPos(d.hue, d.r, cx, cy, R)
    drawNumberedDot(ctx, pos.x, pos.y, d, d.id === o.selectedId, dpr)
  }

  if (o.keyDot) {
    const pos = hueToPos(o.keyDot.hue, o.keyDot.r, cx, cy, R)
    drawNumberedDot(ctx, pos.x, pos.y, o.keyDot, false, dpr)
  }
}
```

- [ ] **Step 6: Rewrite `useWheelPointer.ts`**

```ts
'use client'

import { useRef, useCallback } from 'react'
import { hitTest, pointerToPolar, type WheelPoint } from './wheelHit'

const HIT_RADIUS = 16

type DragMode = null | { kind: 'key' } | { kind: 'target'; id: string }

export function useWheelPointer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  o: {
    keyMode: boolean                     // no samples: whole wheel drags the key
    dots: WheelPoint[]
    targets: WheelPoint[]
    customDraggable: boolean
    onKeyChange: (hue: number, s: number) => void
    onSelectDot: (id: string) => void
    onCustomTargetDrag: (id: string, hue: number) => void
  },
) {
  const rafRef = useRef(0)
  const dragRef = useRef<DragMode>(null)

  const geom = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left, py = e.clientY - rect.top
    const cx = rect.width / 2, cy = rect.height / 2
    return { px, py, cx, cy, R: rect.width / 2 }
  }, [canvasRef])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { px, py, cx, cy, R } = geom(e)
    const polar = pointerToPolar(px, py, cx, cy, R)
    if (!polar.inside) return
    canvas.setPointerCapture(e.pointerId)

    if (o.keyMode) {
      dragRef.current = { kind: 'key' }
      o.onKeyChange(polar.hue, polar.r)
      return
    }
    const dot = hitTest(o.dots, px, py, cx, cy, R, HIT_RADIUS)
    if (dot) { o.onSelectDot(dot); return }
    if (o.customDraggable) {
      const target = hitTest(o.targets, px, py, cx, cy, R, HIT_RADIUS)
      if (target) dragRef.current = { kind: 'target', id: target }
    }
  }, [canvasRef, geom, o])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const mode = dragRef.current
    if (!mode) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const { clientX, clientY } = e
    rafRef.current = requestAnimationFrame(() => {
      if (!canvasRef.current) return
      const { px, py, cx, cy, R } = geom({ clientX, clientY })
      const polar = pointerToPolar(px, py, cx, cy, R)
      if (mode.kind === 'key') o.onKeyChange(polar.hue, polar.r)
      else o.onCustomTargetDrag(mode.id, polar.hue)
    })
  }, [canvasRef, geom, o])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
```

- [ ] **Step 7: Rewrite `ColorWheel.tsx`**

```tsx
'use client'

import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react'
import { drawWheelPixels, drawAnalyzerOverlay, type WheelDot, type WheelTarget, type WheelArrow } from './drawWheel'
import { useWheelPointer } from './useWheelPointer'
import { hslToRgb } from '@/lib/math/color'
import { rgbToHex } from '@/lib/math/color-fit'
import ch from './ColorAnalyzer.module.css'

export type WheelView = 'natural' | 'pure' | 'guide'

export interface ColorWheelProps {
  lightness: number
  dots: WheelDot[]
  targets: WheelTarget[]
  arrows: WheelArrow[]
  keyDot: { hue: number; s: number } | null
  selectedId: string | null
  customDraggable: boolean
  onKeyChange: (hue: number, s: number) => void
  onSelectDot: (id: string) => void
  onCustomTargetDrag: (id: string, hue: number) => void
}

export interface ColorWheelHandle { getCanvas(): HTMLCanvasElement | null }

const DESKTOP_SIZE = 440
const COMPACT_SIZE = 280
function getCanvasSize(): number {
  if (typeof window === 'undefined') return DESKTOP_SIZE
  return window.innerWidth < 1400 ? COMPACT_SIZE : DESKTOP_SIZE
}

export const ColorWheel = forwardRef<ColorWheelHandle, ColorWheelProps>(function ColorWheel(props, ref) {
  const { lightness, dots, targets, arrows, keyDot, selectedId, customDraggable, onKeyChange, onSelectDot, onCustomTargetDrag } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }))
  const [size, setSize] = useState(DESKTOP_SIZE)

  useEffect(() => {
    const onResize = () => setSize(getCanvasSize())
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const canvasPixels = size * dpr
  const cacheRef = useRef<{ imageData: ImageData; lightness: number; size: number } | null>(null)

  const { onPointerDown, onPointerMove, onPointerUp } = useWheelPointer(canvasRef, {
    keyMode: keyDot !== null,
    dots: dots.filter((d) => !d.neutral).map((d) => ({ id: d.id, hue: d.hue, r: d.r })),
    targets: targets.map((t) => ({ id: t.id, hue: t.hue, r: t.r })),
    customDraggable, onKeyChange, onSelectDot, onCustomTargetDrag,
  })

  const keyWheelDot: WheelDot | null = keyDot
    ? (() => { const rgb = hslToRgb(keyDot.hue, keyDot.s, lightness); return { id: 'key', hue: keyDot.hue, r: keyDot.s, hex: rgbToHex(rgb.r, rgb.g, rgb.b), index: 1, isKey: true, neutral: false } })()
    : null

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = canvasPixels; canvas.height = canvasPixels
    const imageData = drawWheelPixels(ctx, canvasPixels, lightness, cacheRef.current)
    cacheRef.current = { imageData, lightness, size: canvasPixels }
    drawAnalyzerOverlay(ctx, canvasPixels, dpr, { dots, targets, arrows, keyDot: keyWheelDot, selectedId, lightness })
  }, [canvasPixels, lightness, dots, targets, arrows, keyWheelDot, selectedId, dpr])

  useEffect(() => { draw() }, [draw])

  return (
    <div className={ch.wheelContainer}>
      <canvas ref={canvasRef} className={ch.wheelCanvas} style={{ width: size, height: size, cursor: 'pointer', touchAction: 'none' }}
        role="img" aria-label="Color wheel"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
    </div>
  )
})

export function WheelViewToggle({ view, onChange, labels }: { view: WheelView; onChange: (v: WheelView) => void; labels: Record<WheelView, string> }) {
  const views: WheelView[] = ['natural', 'pure', 'guide']
  return (
    <div className={ch.viewToggle} role="tablist" aria-label="Wheel view">
      {views.map((v) => (
        <button key={v} type="button" role="tab" aria-selected={view === v}
          className={`${ch.viewBtn} ${view === v ? ch.viewBtnActive : ''}`} onClick={() => onChange(v)}>
          {labels[v]}
        </button>
      ))}
    </div>
  )
}
```

`ColorAnalyzer.module.css` does not exist yet; create it now as a copy of `ColorHarmony.module.css` (`cp`), and append:
```css
.viewToggle { display: inline-flex; gap: 2px; padding: 3px; border: 1px solid var(--border); border-radius: 999px; margin: 8px auto 0; }
.viewBtn { border: 0; background: transparent; color: var(--text-muted); padding: 6px 14px; border-radius: 999px; font: inherit; font-size: 12px; cursor: pointer; }
.viewBtnActive { background: var(--accent); color: #fff; }
```
**Tear down the old component now**, so Tasks 9, 10 and 11 can run in parallel without touching a shared file:

```bash
cd ~/workspace/iserlabs/applications/photo-tools
D="src/app/[locale]/color-analyzer/_components"
git rm -q "$D/ColorHarmony.tsx" "$D/ColorHarmony.module.css" "$D/colorHarmonyHelpers.ts" "$D/ColorSidebar.tsx" \
          "$D/PhotoPicker.tsx" "$D/PhotoPicker.module.css" "$D/DropZone.tsx" "$D/useMagnifier.ts"
```
Then:
- `PaletteBar.tsx`: change the CSS import to `./ColorAnalyzer.module.css` (nothing else; Task 11 rewrites it).
- `buildColorExport.ts`: change the first two imports to `import { HARMONY_KEYS, type HarmonyType } from '@/lib/data/colorAnalyzer'` (Task 11 rewrites the rest).
- Create the placeholder state owner `ColorAnalyzer.tsx` (Task 12 replaces it):
```tsx
'use client'
import { ToolHeading } from '@/components/shared/ToolHeading'
export function ColorAnalyzer() {
  return <div><ToolHeading slug="color-analyzer" /></div>
}
```
- `page.tsx`: `import { ColorAnalyzer } from './_components/ColorAnalyzer'` and render `<ColorAnalyzer />` instead of `<ColorHarmony />`.

The page renders empty until Task 12; that is acceptable on a feature branch.

- [ ] **Step 8: Type-check and run the tool's tests**

Run: `npm run type-check && npx vitest run "src/app/[locale]/color-analyzer"`
Expected: clean; PASS.

- [ ] **Step 9: Commit**

```bash
git add -A "src/app/[locale]/color-analyzer/"
git commit -m "feat(color-analyzer): wheel overlay with numbered dots, dashed targets and arrows; pointer hook for select/key/custom drag"
```

---

### Task 9: `PhotoPane` + `SampleMarkers`

**Files:**
- Create: `src/app/[locale]/color-analyzer/_components/PhotoPane.tsx`, `SampleMarkers.tsx`, `PhotoPane.module.css`, `SampleMarkers.test.tsx`
- (The old `PhotoPicker`, `DropZone`, `useMagnifier` were deleted in Task 8; their roles move here.)

**Interfaces:**
- Consumes: `FileDropZone` from `@/components/shared/FileDropZone`; `AnalysisPhoto` from `./useSampling`; `Sample` from `./analyzerState`.
- Produces:
```tsx
export interface PhotoPaneProps {
  photo: AnalysisPhoto | null
  samples: Sample[]
  selectedId: string | null
  canAdd: boolean
  labels: { drop: string; change: string; autoPick: string; capReached: string; marker: (n: number, label: string) => string; remove: string }
  onFile: (file: File) => void
  onAdd: (x01: number, y01: number) => void
  onMove: (id: string, x01: number, y01: number) => void
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onAutoPick: () => void
  onChangePhoto: () => void
}
export function PhotoPane(props: PhotoPaneProps): JSX.Element

export interface SampleMarkersProps {
  samples: Sample[]; selectedId: string | null; width: number; height: number   // display box in CSS px
  markerLabel: (n: number, label: string) => string; removeLabel: string
  onSelect: (id: string) => void; onRemove: (id: string) => void
  onDragStart: (id: string, e: React.PointerEvent) => void
}
export function SampleMarkers(props: SampleMarkersProps): JSX.Element
```

- [ ] **Step 1: Write the failing marker tests**

`src/app/[locale]/color-analyzer/_components/SampleMarkers.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SampleMarkers } from './SampleMarkers'
import type { Sample } from './analyzerState'

const sample = (id: string, x: number, y: number, label = 'blue'): Sample =>
  ({ id, x, y, rgb: { r: 0, g: 0, b: 255 }, hsl: { h: 240, s: 100, l: 50 }, neutral: false, label, locked: false })

const base = {
  width: 400, height: 200,
  markerLabel: (n: number, label: string) => `Sample ${n}: ${label}`,
  removeLabel: 'Remove sample',
  onSelect: vi.fn(), onRemove: vi.fn(), onDragStart: vi.fn(),
}

describe('SampleMarkers', () => {
  it('renders one numbered marker per sample at the projected position', () => {
    render(<SampleMarkers {...base} samples={[sample('a', 0.25, 0.5), sample('b', 0.75, 0.1, 'sky')]} selectedId={null} />)
    const a = screen.getByRole('button', { name: 'Sample 1: blue' })
    expect(a).toHaveStyle({ left: '100px', top: '100px' })
    expect(screen.getByRole('button', { name: 'Sample 2: sky' })).toHaveStyle({ left: '300px', top: '20px' })
    expect(a).toHaveTextContent('1')
  })

  it('marks the selected marker and shows its remove button', () => {
    render(<SampleMarkers {...base} samples={[sample('a', 0.5, 0.5)]} selectedId="a" />)
    expect(screen.getByRole('button', { name: 'Sample 1: blue' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Remove sample' })).toBeInTheDocument()
  })

  it('click selects, remove button removes, pointerdown starts a drag', () => {
    const onSelect = vi.fn(), onRemove = vi.fn(), onDragStart = vi.fn()
    render(<SampleMarkers {...base} onSelect={onSelect} onRemove={onRemove} onDragStart={onDragStart}
      samples={[sample('a', 0.5, 0.5)]} selectedId="a" />)
    const m = screen.getByRole('button', { name: 'Sample 1: blue' })
    fireEvent.click(m)
    expect(onSelect).toHaveBeenCalledWith('a')
    fireEvent.pointerDown(m)
    expect(onDragStart).toHaveBeenCalledWith('a', expect.anything())
    fireEvent.click(screen.getByRole('button', { name: 'Remove sample' }))
    expect(onRemove).toHaveBeenCalledWith('a')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/SampleMarkers.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SampleMarkers.tsx`**

```tsx
'use client'

import type { Sample } from './analyzerState'
import styles from './PhotoPane.module.css'

export interface SampleMarkersProps {
  samples: Sample[]
  selectedId: string | null
  width: number
  height: number
  markerLabel: (n: number, label: string) => string
  removeLabel: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onDragStart: (id: string, e: React.PointerEvent) => void
}

export function SampleMarkers({ samples, selectedId, width, height, markerLabel, removeLabel, onSelect, onRemove, onDragStart }: SampleMarkersProps) {
  return (
    <div className={styles.markers} style={{ width, height }}>
      {samples.map((s, i) => {
        const selected = s.id === selectedId
        return (
          <div key={s.id} className={styles.markerWrap} style={{ left: s.x * width, top: s.y * height }}>
            <button
              type="button"
              className={`${styles.marker} ${selected ? styles.markerSelected : ''}`}
              style={{ backgroundColor: `rgb(${s.rgb.r}, ${s.rgb.g}, ${s.rgb.b})` }}
              aria-label={markerLabel(i + 1, s.label)}
              aria-pressed={selected}
              onClick={() => onSelect(s.id)}
              onPointerDown={(e) => onDragStart(s.id, e)}
            >
              {i + 1}
            </button>
            {selected && (
              <button type="button" className={styles.markerRemove} aria-label={removeLabel}
                onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(s.id)}>
                ×
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run the marker tests**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/SampleMarkers.test.tsx"`
Expected: PASS (3). (`toHaveStyle` compares computed inline styles; `left: 100px` comes from `0.25 * 400`.)

- [ ] **Step 5: Implement `PhotoPane.tsx`**

Responsibilities: the empty state (`FileDropZone`), a display canvas that draws the analysis canvas letterboxed into the pane, click-to-add, marker drag with pointer capture on the pane, the hover loupe, and the Auto-pick / Change photo buttons.

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDropZone } from '@/components/shared/FileDropZone'
import type { AnalysisPhoto } from './useSampling'
import type { Sample } from './analyzerState'
import { SampleMarkers } from './SampleMarkers'
import styles from './PhotoPane.module.css'

export interface PhotoPaneProps {
  photo: AnalysisPhoto | null
  samples: Sample[]
  selectedId: string | null
  canAdd: boolean
  labels: { drop: string; change: string; autoPick: string; capReached: string; marker: (n: number, label: string) => string; remove: string }
  onFile: (file: File) => void
  onAdd: (x01: number, y01: number) => void
  onMove: (id: string, x01: number, y01: number) => void
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onAutoPick: () => void
  onChangePhoto: () => void
}

interface Box { left: number; top: number; width: number; height: number }

function fitBox(imgW: number, imgH: number, paneW: number, paneH: number): Box {
  const scale = Math.min(paneW / imgW, paneH / imgH)
  const width = Math.max(1, Math.floor(imgW * scale))
  const height = Math.max(1, Math.floor(imgH * scale))
  return { left: Math.floor((paneW - width) / 2), top: Math.floor((paneH - height) / 2), width, height }
}

const LOUPE_ZOOM = 4
const LOUPE_SRC = 20 // analysis pixels shown in the loupe

export function PhotoPane(p: PhotoPaneProps) {
  const paneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loupeRef = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState<Box>({ left: 0, top: 0, width: 1, height: 1 })
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null)

  // Fit the photo into the pane and redraw on resize
  useEffect(() => {
    const pane = paneRef.current
    if (!pane || !p.photo) return
    const ro = new ResizeObserver(() => {
      const r = pane.getBoundingClientRect()
      setBox(fitBox(p.photo!.width, p.photo!.height, r.width, r.height))
    })
    ro.observe(pane)
    return () => ro.disconnect()
  }, [p.photo])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !p.photo) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = box.width * dpr; canvas.height = box.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(p.photo.canvas, 0, 0, canvas.width, canvas.height)
  }, [p.photo, box])

  const toImage01 = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    }
  }, [])

  const drawLoupe = useCallback((x01: number, y01: number) => {
    const src = p.photo, lc = loupeRef.current
    if (!src || !lc) return
    const size = LOUPE_SRC * LOUPE_ZOOM
    lc.width = size; lc.height = size
    const ctx = lc.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(src.canvas, x01 * src.width - LOUPE_SRC / 2, y01 * src.height - LOUPE_SRC / 2, LOUPE_SRC, LOUPE_SRC, 0, 0, size, size)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1
    ctx.strokeRect(size / 2 - LOUPE_ZOOM * 2.5, size / 2 - LOUPE_ZOOM * 2.5, LOUPE_ZOOM * 5, LOUPE_ZOOM * 5)
  }, [p.photo])

  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return
    if (!p.canAdd) return
    const { x, y } = toImage01(e.clientX, e.clientY)
    p.onAdd(x, y)
  }, [p, toImage01])

  const onPaneMove = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      const { x, y } = toImage01(e.clientX, e.clientY)
      p.onMove(dragRef.current.id, x, y)
      return
    }
    if (e.pointerType === 'mouse' && e.target === canvasRef.current) {
      const { x, y } = toImage01(e.clientX, e.clientY)
      setLoupe({ x: e.clientX, y: e.clientY })
      drawLoupe(x, y)
    }
  }, [p, toImage01, drawLoupe])

  const onMarkerDragStart = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault()
    dragRef.current = { id, pointerId: e.pointerId }
    paneRef.current?.setPointerCapture(e.pointerId)
    p.onSelect(id)
  }, [p])

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      paneRef.current?.releasePointerCapture(dragRef.current.pointerId)
      // defer so the click that follows pointerup does not add a new sample
      const timer = setTimeout(() => { dragRef.current = null }, 0)
      void timer
    }
    if (e.pointerType === 'mouse') setLoupe(null)
  }, [])

  if (!p.photo) {
    return (
      <div className={styles.pane} ref={paneRef}>
        <div className={styles.dropWrap}><FileDropZone onFile={p.onFile} prompt={p.labels.drop} /></div>
      </div>
    )
  }

  return (
    <div className={styles.pane} ref={paneRef}
      onPointerMove={onPaneMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={() => setLoupe(null)}>
      <div className={styles.imageBox} style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
        <canvas ref={canvasRef} className={styles.image} style={{ width: box.width, height: box.height }}
          onClick={onCanvasClick} aria-label={p.labels.drop} />
        <SampleMarkers samples={p.samples} selectedId={p.selectedId} width={box.width} height={box.height}
          markerLabel={p.labels.marker} removeLabel={p.labels.remove}
          onSelect={p.onSelect} onRemove={p.onRemove} onDragStart={onMarkerDragStart} />
      </div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolBtn} onClick={p.onAutoPick}>{p.labels.autoPick}</button>
        <button type="button" className={styles.toolBtnGhost} onClick={p.onChangePhoto}>{p.labels.change}</button>
        {!p.canAdd && <span className={styles.capNote}>{p.labels.capReached}</span>}
      </div>
      {loupe && (
        <div className={styles.loupe} style={{ left: loupe.x + 24, top: loupe.y - 100 }}>
          <canvas ref={loupeRef} style={{ width: 80, height: 80, imageRendering: 'pixelated' }} />
        </div>
      )}
    </div>
  )
}
```

`PhotoPane.module.css`:
```css
.pane { position: relative; flex: 1; min-width: 0; min-height: 0; background: var(--surface-2, #111); border-right: 1px solid var(--border); touch-action: none; overflow: hidden; }
.dropWrap { position: absolute; inset: 16px; display: flex; align-items: center; justify-content: center; }
.imageBox { position: absolute; }
.image { display: block; cursor: crosshair; }
.markers { position: absolute; inset: 0; pointer-events: none; }
.markerWrap { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; }
.marker { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff; color: #fff; font: 700 11px/1 system-ui, sans-serif; text-shadow: 0 0 3px rgba(0,0,0,.9); box-shadow: 0 1px 4px rgba(0,0,0,.6); cursor: grab; padding: 0; touch-action: none; }
.markerSelected { border-color: #ffd166; box-shadow: 0 0 0 3px rgba(255,209,102,.35), 0 1px 4px rgba(0,0,0,.6); }
.markerRemove { position: absolute; top: -12px; right: -14px; width: 18px; height: 18px; border-radius: 50%; border: 0; background: #222; color: #fff; font-size: 12px; line-height: 18px; padding: 0; cursor: pointer; }
.toolbar { position: absolute; left: 12px; bottom: 12px; display: flex; gap: 8px; align-items: center; }
.toolBtn { background: var(--accent); color: #fff; border: 0; border-radius: 6px; padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer; }
.toolBtnGhost { background: rgba(0,0,0,.55); color: #fff; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer; }
.capNote { color: var(--text-muted); font-size: 11px; }
.loupe { position: fixed; width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.5); pointer-events: none; z-index: 20; }
@media (max-width: 1023px) { .pane { min-height: 260px; border-right: 0; border-bottom: 1px solid var(--border); } }
```

- [ ] **Step 6: Confirm nothing else references the old picker**

Run: `grep -rn "PhotoPicker\|useMagnifier\|DropZone'" "src/app/[locale]/color-analyzer"` — expected: no output.

- [ ] **Step 7: Type-check and test**

Run: `npm run type-check && npx vitest run "src/app/[locale]/color-analyzer"`
Expected: clean; PASS.

- [ ] **Step 8: Commit**

```bash
git add -A "src/app/[locale]/color-analyzer/_components/"
git commit -m "feat(color-analyzer): photo pane with drop zone, letterboxed canvas, draggable numbered markers and loupe"
```

---

### Task 10: `SampleCard` + `AnalyzerSidebar`

Both components take their strings through a `labels` prop so they test without next-intl; `ColorAnalyzer.tsx` (Task 12) resolves the strings once.

**Files:**
- Create: `src/app/[locale]/color-analyzer/_components/SampleCard.tsx`, `AnalyzerSidebar.tsx`, `AnalyzerSidebar.test.tsx`
- (The old `ColorSidebar.tsx` was deleted in Task 8.)

**Interfaces:**
- Consumes: `Sample` from `./analyzerState`; `FitResult` from `@/lib/math/color-fit`; `HARMONY_KEYS`, `HarmonyType`, `TemplateHarmony` from data; `ToolActions` from shared.
- Produces:
```tsx
export interface SampleCardLabels { lock: string; unlock: string; remove: string; copied: string; neutral: string; labelPlaceholder: string; suggested: string }
export interface SampleCardProps {
  index: number; sample: Sample; colorName: string; result: FitResult | null; nudge: string | null   // nudge already localised
  selected: boolean; showGuide: boolean; labels: SampleCardLabels
  onSelect: () => void; onLabelChange: (label: string) => void; onLock: (locked: boolean) => void
  onRemove: () => void; onNudgePosition: (dx: number, dy: number) => void   // arrow keys, in analysis pixels
}
export function SampleCard(p: SampleCardProps): JSX.Element

export interface KeyCardProps { hue: number; saturation: number; lightness: number; hex: string
  onHue: (v: number) => void; onSaturation: (v: number) => void; onLightness: (v: number) => void; onHex: (hex: string) => void
  labels: { keyColor: string; hue: string; saturation: string; lightness: string } }

export interface AnalyzerSidebarProps {
  toolSlug: string; exportCanvasRef: React.RefObject<HTMLCanvasElement | null>; buildExportCanvas: () => void
  harmony: HarmonyType; onHarmony: (h: HarmonyType) => void
  harmonyLabels: Record<HarmonyType, string>; closestFit: { type: TemplateHarmony; meanError: number } | null
  labels: { colorScheme: string; closestFit: string; closestSentence: string | null; suggestion: string; samplesHeading: string; splitAngle: string; spread: string; rectangleWidth: string; square: string }
  params: { splitAngle: number; analogousSpread: number; tetradicOffset: number }
  onParams: (patch: Partial<AnalyzerSidebarProps['params']>) => void
  keyCard: KeyCardProps | null                 // rendered when there are no samples
  sampleCards: SampleCardProps[]               // rendered otherwise
}
export function AnalyzerSidebar(p: AnalyzerSidebarProps): JSX.Element
```

- [ ] **Step 1: Write the failing tests**

`src/app/[locale]/color-analyzer/_components/AnalyzerSidebar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { AnalyzerSidebar, type AnalyzerSidebarProps } from './AnalyzerSidebar'
import { SampleCard, type SampleCardProps } from './SampleCard'
import type { Sample } from './analyzerState'

vi.mock('@/components/shared/ToolActions', () => ({ ToolActions: () => <div data-testid="tool-actions" /> }))

const sample = (id: string, h = 200, neutral = false): Sample =>
  ({ id, x: 0.5, y: 0.5, rgb: { r: 10, g: 20, b: 30 }, hsl: { h, s: 60, l: 40 }, neutral, label: 'sky', locked: false })

const cardLabels = { lock: 'Lock', unlock: 'Unlock', remove: 'Remove', copied: 'Copied', neutral: 'Neutral, not scored', labelPlaceholder: 'Label', suggested: 'Suggested' }

function cardProps(over: Partial<SampleCardProps> = {}): SampleCardProps {
  return {
    index: 1, sample: sample('a'), colorName: 'sky blue', result: null, nudge: null, selected: false, showGuide: false,
    labels: cardLabels, onSelect: vi.fn(), onLabelChange: vi.fn(), onLock: vi.fn(), onRemove: vi.fn(), onNudgePosition: vi.fn(),
    ...over,
  }
}

const harmonyLabels = { complementary: 'Complementary', 'split-complementary': 'Split Complementary', analogous: 'Analogous', triadic: 'Triadic', tetradic: 'Tetradic', monochromatic: 'Monochromatic', custom: 'Custom' }

function sidebarProps(over: Partial<AnalyzerSidebarProps> = {}): AnalyzerSidebarProps {
  return {
    toolSlug: 'color-analyzer', exportCanvasRef: createRef<HTMLCanvasElement>(), buildExportCanvas: vi.fn(),
    harmony: 'complementary', onHarmony: vi.fn(), harmonyLabels, closestFit: null,
    labels: { colorScheme: 'Color scheme', closestFit: 'Closest fit', closestSentence: null, suggestion: 'Great for: x', samplesHeading: 'Samples', splitAngle: 'Split angle:', spread: 'Spread:', rectangleWidth: 'Rectangle width:', square: '(square)' },
    params: { splitAngle: 30, analogousSpread: 30, tetradicOffset: 60 }, onParams: vi.fn(),
    keyCard: null, sampleCards: [],
    ...over,
  }
}

describe('SampleCard', () => {
  it('shows index, label, hex and HSL, and copies the hex on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<SampleCard {...cardProps()} />)
    expect(screen.getByDisplayValue('sky')).toBeInTheDocument()
    expect(screen.getByText('sky blue')).toBeInTheDocument()
    expect(screen.getByText('H 200° · S 60% · L 40%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '#0a141e' }))
    expect(writeText).toHaveBeenCalledWith('#0a141e')
  })

  it('renders the nudge line and suggested swatch in guide mode', () => {
    render(<SampleCard {...cardProps({ showGuide: true, nudge: 'Slight nudge toward cyan',
      result: { id: 'a', targetHue: 185, delta: -15, band: 'slight', suggestedHex: '#123456' } })} />)
    expect(screen.getByText('Slight nudge toward cyan')).toBeInTheDocument()
    expect(screen.getByText('#123456')).toBeInTheDocument()
  })

  it('shows the neutral note instead of a nudge for neutral samples', () => {
    render(<SampleCard {...cardProps({ sample: sample('g', 0, true), showGuide: true })} />)
    expect(screen.getByText('Neutral, not scored')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull()
  })

  it('lock toggles, Delete key removes, arrow keys nudge position', () => {
    const onLock = vi.fn(), onRemove = vi.fn(), onNudgePosition = vi.fn()
    render(<SampleCard {...cardProps({ onLock, onRemove, onNudgePosition, selected: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    expect(onLock).toHaveBeenCalledWith(true)
    const card = screen.getByRole('listitem')
    fireEvent.keyDown(card, { key: 'Delete' })
    expect(onRemove).toHaveBeenCalled()
    fireEvent.keyDown(card, { key: 'ArrowRight' })
    expect(onNudgePosition).toHaveBeenCalledWith(1, 0)
    fireEvent.keyDown(card, { key: 'ArrowUp' })
    expect(onNudgePosition).toHaveBeenCalledWith(0, -1)
  })
})

describe('AnalyzerSidebar', () => {
  it('renders the key card when there are no samples', () => {
    render(<AnalyzerSidebar {...sidebarProps({ keyCard: {
      hue: 200, saturation: 70, lightness: 50, hex: '#2680b3', onHue: vi.fn(), onSaturation: vi.fn(), onLightness: vi.fn(), onHex: vi.fn(),
      labels: { keyColor: 'Key Color', hue: 'Hue:', saturation: 'Saturation:', lightness: 'Lightness:' } } })} />)
    expect(screen.getByText('Key Color')).toBeInTheDocument()
    expect(screen.getAllByRole('slider')).toHaveLength(3)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('renders one card per sample and no key card otherwise', () => {
    render(<AnalyzerSidebar {...sidebarProps({ sampleCards: [cardProps(), cardProps({ index: 2, sample: sample('b') })] })} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText('Key Color')).toBeNull()
  })

  it('harmony buttons call onHarmony and the closest-fit badge selects that harmony', () => {
    const onHarmony = vi.fn()
    render(<AnalyzerSidebar {...sidebarProps({ onHarmony, closestFit: { type: 'triadic', meanError: 9 },
      labels: { ...sidebarProps().labels, closestSentence: 'Your photo is closest to triadic (mean 9° off)' } })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }))
    expect(onHarmony).toHaveBeenCalledWith('analogous')
    fireEvent.click(screen.getByRole('button', { name: /Closest fit/ }))
    expect(onHarmony).toHaveBeenCalledWith('triadic')
    expect(screen.getByText('Your photo is closest to triadic (mean 9° off)')).toBeInTheDocument()
  })

  it('shows the parameter slider that matches the harmony', () => {
    const { rerender } = render(<AnalyzerSidebar {...sidebarProps({ harmony: 'split-complementary' })} />)
    expect(screen.getByText(/Split angle:/)).toBeInTheDocument()
    rerender(<AnalyzerSidebar {...sidebarProps({ harmony: 'triadic' })} />)
    expect(screen.queryByText(/Split angle:/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "src/app/[locale]/color-analyzer/_components/AnalyzerSidebar.test.tsx"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `SampleCard.tsx`**

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { rgbToHex } from '@/lib/math/color-fit'
import type { FitResult } from '@/lib/math/color-fit'
import type { Sample } from './analyzerState'
import styles from './ColorAnalyzer.module.css'

export interface SampleCardLabels { lock: string; unlock: string; remove: string; copied: string; neutral: string; labelPlaceholder: string; suggested: string }

export interface SampleCardProps {
  index: number
  sample: Sample
  colorName: string
  result: FitResult | null
  nudge: string | null
  selected: boolean
  showGuide: boolean
  labels: SampleCardLabels
  onSelect: () => void
  onLabelChange: (label: string) => void
  onLock: (locked: boolean) => void
  onRemove: () => void
  onNudgePosition: (dx: number, dy: number) => void
}

export function SampleCard(p: SampleCardProps) {
  const { sample, labels } = p
  const hex = rgbToHex(sample.rgb.r, sample.rgb.g, sample.rgb.b)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }, [hex])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' && e.key !== 'Escape') return
    switch (e.key) {
      case 'Delete': case 'Backspace': e.preventDefault(); p.onRemove(); break
      case 'ArrowLeft': e.preventDefault(); p.onNudgePosition(-1, 0); break
      case 'ArrowRight': e.preventDefault(); p.onNudgePosition(1, 0); break
      case 'ArrowUp': e.preventDefault(); p.onNudgePosition(0, -1); break
      case 'ArrowDown': e.preventDefault(); p.onNudgePosition(0, 1); break
    }
  }, [p])

  return (
    <li className={`${styles.sampleCard} ${p.selected ? styles.sampleCardSelected : ''}`}
      tabIndex={0} onFocus={p.onSelect} onClick={p.onSelect} onKeyDown={onKeyDown}>
      <div className={styles.sampleRow}>
        <span className={styles.sampleIndex}>{p.index}</span>
        <span className={styles.sampleSwatch} style={{ backgroundColor: hex }} aria-hidden="true" />
        <input className={styles.sampleLabel} value={sample.label} placeholder={labels.labelPlaceholder}
          onChange={(e) => p.onLabelChange(e.target.value)} onClick={(e) => e.stopPropagation()} />
        {!sample.neutral && (
          <button type="button" className={`${styles.iconBtn} ${sample.locked ? styles.iconBtnActive : ''}`}
            aria-label={sample.locked ? labels.unlock : labels.lock} aria-pressed={sample.locked}
            onClick={(e) => { e.stopPropagation(); p.onLock(!sample.locked) }}>🔒</button>
        )}
        <button type="button" className={styles.iconBtn} aria-label={labels.remove}
          onClick={(e) => { e.stopPropagation(); p.onRemove() }}>×</button>
      </div>
      <div className={styles.sampleRow}>
        <button type="button" className={styles.hexBtn} onClick={(e) => { e.stopPropagation(); copy() }} aria-label={hex}>
          {copied ? labels.copied : hex}
        </button>
        <span className={styles.sampleName}>· {p.colorName}</span>
      </div>
      <div className={styles.sampleMeta}>{`H ${sample.hsl.h}° · S ${sample.hsl.s}% · L ${sample.hsl.l}%`}</div>
      {p.showGuide && sample.neutral && <div className={styles.sampleNeutral}>{labels.neutral}</div>}
      {p.showGuide && !sample.neutral && p.result && (
        <div className={styles.sampleNudge} data-band={p.result.band}>
          <span>{p.nudge}</span>
          {p.result.band !== 'aligned' && (
            <span className={styles.suggested}>
              {labels.suggested}: <span className={styles.suggestedSwatch} style={{ backgroundColor: p.result.suggestedHex }} /> {p.result.suggestedHex}
            </span>
          )}
        </div>
      )}
    </li>
  )
}
```

- [ ] **Step 4: Implement `AnalyzerSidebar.tsx`**

```tsx
'use client'

import { ToolActions } from '@/components/shared/ToolActions'
import { HARMONY_KEYS, type HarmonyType, type TemplateHarmony } from '@/lib/data/colorAnalyzer'
import { SampleCard, type SampleCardProps } from './SampleCard'
import styles from './ColorAnalyzer.module.css'

export interface KeyCardProps {
  hue: number; saturation: number; lightness: number; hex: string
  onHue: (v: number) => void; onSaturation: (v: number) => void; onLightness: (v: number) => void; onHex: (hex: string) => void
  labels: { keyColor: string; hue: string; saturation: string; lightness: string }
}

export interface AnalyzerSidebarProps {
  toolSlug: string
  exportCanvasRef: React.RefObject<HTMLCanvasElement | null>
  buildExportCanvas: () => void
  harmony: HarmonyType
  onHarmony: (h: HarmonyType) => void
  harmonyLabels: Record<HarmonyType, string>
  closestFit: { type: TemplateHarmony; meanError: number } | null
  labels: { colorScheme: string; closestFit: string; closestSentence: string | null; suggestion: string; samplesHeading: string; splitAngle: string; spread: string; rectangleWidth: string; square: string }
  params: { splitAngle: number; analogousSpread: number; tetradicOffset: number }
  onParams: (patch: Partial<AnalyzerSidebarProps['params']>) => void
  keyCard: KeyCardProps | null
  sampleCards: SampleCardProps[]
}

function Slider({ label, value, unit, min, max, onChange }: { label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label} <span className={styles.value}>{value}{unit}</span></span>
      <input type="range" className={styles.slider} min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

function KeyCard(k: KeyCardProps) {
  return (
    <div className={styles.keyCard}>
      <span className={styles.label}>{k.labels.keyColor}</span>
      <div className={styles.keyColorRow}>
        <input type="color" value={k.hex} onChange={(e) => k.onHex(e.target.value)} className={styles.colorPicker} />
        <input type="text" defaultValue={k.hex} key={k.hex} className={styles.hexInput} spellCheck={false} maxLength={7}
          onBlur={(e) => k.onHex(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') k.onHex((e.target as HTMLInputElement).value) }} />
      </div>
      <Slider label={k.labels.hue} value={k.hue} unit="°" min={0} max={359} onChange={k.onHue} />
      <Slider label={k.labels.saturation} value={k.saturation} unit="%" min={0} max={100} onChange={k.onSaturation} />
      <Slider label={k.labels.lightness} value={k.lightness} unit="%" min={0} max={100} onChange={k.onLightness} />
    </div>
  )
}

export function AnalyzerSidebar(p: AnalyzerSidebarProps) {
  const { labels } = p
  return (
    <aside className={styles.sidebar}>
      <ToolActions toolSlug={p.toolSlug} canvasRef={p.exportCanvasRef} imageFilename="color-analyzer.png" onBeforeCopyImage={p.buildExportCanvas} />

      <div className={styles.field}>
        <span className={styles.label}>{labels.colorScheme}</span>
        <div className={styles.radioGroup}>
          {HARMONY_KEYS.map((o) => (
            <button key={o.value} type="button"
              className={`${styles.radioBtn} ${p.harmony === o.value ? styles.radioBtnActive : ''}`}
              onClick={() => p.onHarmony(o.value)}>
              {p.harmonyLabels[o.value]}
              {p.closestFit?.type === o.value && <span className={styles.badge}>★</span>}
            </button>
          ))}
        </div>
        {p.closestFit && labels.closestSentence && (
          <button type="button" className={styles.closestFit} onClick={() => p.onHarmony(p.closestFit!.type)}>
            <strong>{labels.closestFit}</strong> {labels.closestSentence}
          </button>
        )}
      </div>

      <div className={styles.suggestion}>{labels.suggestion}</div>

      {p.harmony === 'split-complementary' && <Slider label={labels.splitAngle} value={p.params.splitAngle} unit="°" min={10} max={80} onChange={(v) => p.onParams({ splitAngle: v })} />}
      {p.harmony === 'analogous' && <Slider label={labels.spread} value={p.params.analogousSpread} unit="°" min={5} max={60} onChange={(v) => p.onParams({ analogousSpread: v })} />}
      {p.harmony === 'tetradic' && <Slider label={`${labels.rectangleWidth}${p.params.tetradicOffset === 90 ? ` ${labels.square}` : ''}`} value={p.params.tetradicOffset} unit="°" min={10} max={170} onChange={(v) => p.onParams({ tetradicOffset: v })} />}

      {p.keyCard ? <KeyCard {...p.keyCard} /> : (
        <>
          <span className={styles.label}>{labels.samplesHeading}</span>
          <ul className={styles.sampleList}>
            {p.sampleCards.map((c) => <SampleCard key={c.sample.id} {...c} />)}
          </ul>
        </>
      )}
    </aside>
  )
}
```

Append to `ColorAnalyzer.module.css`:
```css
.badge { margin-left: 4px; color: #ffd166; font-size: 10px; }
.closestFit { margin-top: 6px; width: 100%; text-align: left; background: rgba(255,209,102,.12); border: 1px solid rgba(255,209,102,.4); border-radius: 6px; padding: 6px 8px; color: var(--text); font: inherit; font-size: 12px; cursor: pointer; }
.keyCard { display: flex; flex-direction: column; gap: 12px; }
.sampleList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.sampleCard { border: 1px solid var(--border); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; outline: none; }
.sampleCard:focus-visible, .sampleCardSelected { border-color: #ffd166; }
.sampleRow { display: flex; align-items: center; gap: 6px; min-width: 0; }
.sampleIndex { width: 16px; font-size: 11px; color: var(--text-muted); }
.sampleSwatch { width: 22px; height: 22px; border-radius: 5px; border: 1px solid rgba(255,255,255,.2); flex-shrink: 0; }
.sampleLabel { flex: 1; min-width: 0; background: transparent; border: 0; border-bottom: 1px dashed var(--border); color: var(--text); font: inherit; font-size: 13px; padding: 2px 0; }
.iconBtn { background: transparent; border: 1px solid var(--border); border-radius: 5px; color: var(--text-muted); width: 24px; height: 24px; padding: 0; cursor: pointer; font-size: 12px; }
.iconBtnActive { border-color: #ffd166; color: #ffd166; }
.hexBtn { background: transparent; border: 0; padding: 0; color: var(--text); font-family: ui-monospace, monospace; font-size: 12px; cursor: pointer; }
.sampleName, .sampleMeta { font-size: 11px; color: var(--text-muted); }
.sampleNeutral { font-size: 11px; color: var(--text-muted); font-style: italic; }
.sampleNudge { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.sampleNudge[data-band="aligned"] { color: #7bd88f; }
.sampleNudge[data-band="slight"] { color: #ffb866; }
.sampleNudge[data-band="big"] { color: #ff7a6e; }
.suggested { font-size: 11px; color: var(--text-muted); font-family: ui-monospace, monospace; }
.suggestedSwatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: middle; border: 1px solid rgba(255,255,255,.25); }
```

- [ ] **Step 5: Confirm nothing references the old sidebar**

Run: `grep -rn "ColorSidebar" src` — expected: no output.

- [ ] **Step 6: Run tests and type-check**

Run: `npx vitest run "src/app/[locale]/color-analyzer" && npm run type-check`
Expected: PASS (8 new); clean.

- [ ] **Step 7: Commit**

```bash
git add -A "src/app/[locale]/color-analyzer/_components/"
git commit -m "feat(color-analyzer): sample cards with lock/nudge/keyboard and the analyzer sidebar with closest-fit badge"
```

---

### Task 11: `PaletteBar` on `PaletteSwatch[]` + export with photo

**Files:**
- Modify: `src/app/[locale]/color-analyzer/_components/PaletteBar.tsx`, `buildColorExport.ts`
**Interfaces:**
- Consumes: `PaletteSwatch` from `@/lib/math/color-fit`; `AnalysisPhoto`; `Sample`.
- Produces:
```ts
export function PaletteBar({ swatches }: { swatches: PaletteSwatch[] }): JSX.Element     // key = swatch.isKey
export function buildColorExportCanvas(o: {
  wheelCanvas: HTMLCanvasElement; exportCanvas: HTMLCanvasElement; swatches: PaletteSwatch[]
  photo: AnalysisPhoto | null; samples: Sample[]; title: string
}): void
```

- [ ] **Step 1: Update `PaletteBar.tsx`**

Replace the local `Swatch` interface and the `baseIndex` prop:
```tsx
import type { PaletteSwatch } from '@/lib/math/color-fit'

interface PaletteBarProps { swatches: PaletteSwatch[] }

export function PaletteBar({ swatches }: PaletteBarProps) {
  const t = useTranslations('toolUI.color-analyzer')
  …
      {swatches.map((s, i) => (
        <button
          key={`${s.sampleId ?? 'slot'}-${i}`}
          className={`${styles.paletteBarSwatch} ${s.isKey ? styles.paletteBarSwatchKey : ''}`}
          style={{ backgroundColor: s.hex }}
          onClick={() => copyHex(s.hex)}
          title={s.isKey ? t('keyColorLabel') : t('clickToCopyHex')}
        >
```
Everything else (copy hex/CSS/RGB, timers) stays as is. Change the CSS import to `./ColorAnalyzer.module.css`.

- [ ] **Step 2: Rewrite `buildColorExport.ts`**

```ts
import type { PaletteSwatch } from '@/lib/math/color-fit'
import type { AnalysisPhoto } from './useSampling'
import type { Sample } from './analyzerState'

/**
 * Composes photo (with numbered markers) + wheel + palette row into one PNG-ready canvas.
 * Layout: [photo | wheel] on top, swatch pills below. Photo is omitted when null.
 */
export function buildColorExportCanvas(o: {
  wheelCanvas: HTMLCanvasElement
  exportCanvas: HTMLCanvasElement
  swatches: PaletteSwatch[]
  photo: AnalysisPhoto | null
  samples: Sample[]
  title: string
}) {
  const dpr = window.devicePixelRatio || 1
  const wheelSize = o.wheelCanvas.width / dpr
  const margin = 24, headerH = 28, gap = 16, pillH = 40, pillGap = 6, labelH = 14

  let photoW = 0, photoH = 0
  if (o.photo) {
    const scale = wheelSize / o.photo.height
    photoH = wheelSize
    photoW = Math.round(o.photo.width * scale)
  }
  const contentW = photoW + (photoW ? gap : 0) + wheelSize
  const totalW = contentW + margin * 2
  const topY = margin + headerH
  const paletteY = topY + wheelSize + margin
  const totalH = paletteY + labelH + pillH + 20 + margin

  const c = o.exportCanvas
  c.width = totalW * dpr; c.height = totalH * dpr
  c.style.width = `${totalW}px`; c.style.height = `${totalH}px`
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, totalW, totalH)

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(o.title, margin, margin)

  let x = margin
  if (o.photo) {
    ctx.drawImage(o.photo.canvas, x, topY, photoW, photoH)
    o.samples.forEach((s, i) => {
      const px = x + s.x * photoW, py = topY + s.y * photoH
      ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2)
      ctx.fillStyle = `rgb(${s.rgb.r}, ${s.rgb.g}, ${s.rgb.b})`; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3
      ctx.strokeText(String(i + 1), px, py); ctx.fillText(String(i + 1), px, py)
    })
    x += photoW + gap
  }
  ctx.drawImage(o.wheelCanvas, x, topY, wheelSize, wheelSize)

  const pillW = (totalW - margin * 2 - (o.swatches.length - 1) * pillGap) / Math.max(1, o.swatches.length)
  let px = margin
  const pillTop = paletteY + labelH
  for (const s of o.swatches) {
    if (s.isKey) {
      ctx.fillStyle = '#aaaaaa'; ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText('Key', px + pillW / 2, pillTop - 3)
    }
    const r = 6
    ctx.beginPath()
    ctx.moveTo(px + r, pillTop); ctx.lineTo(px + pillW - r, pillTop)
    ctx.quadraticCurveTo(px + pillW, pillTop, px + pillW, pillTop + r)
    ctx.lineTo(px + pillW, pillTop + pillH - r)
    ctx.quadraticCurveTo(px + pillW, pillTop + pillH, px + pillW - r, pillTop + pillH)
    ctx.lineTo(px + r, pillTop + pillH)
    ctx.quadraticCurveTo(px, pillTop + pillH, px, pillTop + pillH - r)
    ctx.lineTo(px, pillTop + r)
    ctx.quadraticCurveTo(px, pillTop, px + r, pillTop)
    ctx.closePath(); ctx.fillStyle = s.hex; ctx.fill()
    if (s.isKey) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke() }
    ctx.fillStyle = '#aaa'; ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(s.hex, px + pillW / 2, pillTop + pillH + 4)
    px += pillW + pillGap
  }
}
```

- [ ] **Step 3: Confirm no stale imports**

Run: `grep -rn "colorHarmonyHelpers" src` — expected: no output (deleted in Task 8).

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: clean (nothing imports `PaletteBar`/`buildColorExport` yet; Task 12 wires them).

- [ ] **Step 5: Commit**

```bash
git add -A "src/app/[locale]/color-analyzer/_components/"
git commit -m "feat(color-analyzer): palette bar on PaletteSwatch and PNG export with photo markers"
```

---

### Task 12: `ColorAnalyzer.tsx` — state owner, derived data, layout; wire the page

**Files:**
- Create: `src/app/[locale]/color-analyzer/_components/ColorAnalyzer.tsx`
- Modify: `ColorAnalyzer.module.css` (layout), `src/app/[locale]/color-analyzer/page.tsx`
- Replace: the Task 8 placeholder `ColorAnalyzer.tsx`

**Interfaces:**
- Consumes everything from Tasks 2–11. i18n keys under `toolUI.color-analyzer` (existing ones now; new ones added in Task 13 — until then `t()` returns the key path, which is fine on the branch).

- [ ] **Step 1: Write `ColorAnalyzer.tsx`**

```tsx
'use client'

import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { useQueryInit, useToolQuerySync, intParam, strParam } from '@/lib/utils/querySync'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { hslToRgb, rgbToHsl } from '@/lib/math/color'
import { HARMONY_KEYS, SAMPLE_CAP, type HarmonyType } from '@/lib/data/colorAnalyzer'
import { colorNameKey, directionBandKey } from '@/lib/math/color-name'
import { fitHarmony, rankHarmonies, buildPalette, rgbToHex, type FitSample, type HarmonyParams } from '@/lib/math/color-fit'
import type { WheelDot, WheelTarget, WheelArrow } from './drawWheel'
import { ColorWheel, WheelViewToggle, type ColorWheelHandle, type WheelView } from './ColorWheel'
import { PhotoPane } from './PhotoPane'
import { AnalyzerSidebar } from './AnalyzerSidebar'
import type { SampleCardProps } from './SampleCard'
import { PaletteBar } from './PaletteBar'
import { buildColorExportCanvas } from './buildColorExport'
import { sampleReducer, EMPTY_STATE, newSampleId } from './analyzerState'
import { decodeToAnalysisCanvas, sampleAt, autoPickPoints, type AnalysisPhoto } from './useSampling'
import styles from './ColorAnalyzer.module.css'

const HARMONY_VALUES = HARMONY_KEYS.map((h) => h.value)
const PARAM_SCHEMA = {
  h: intParam(200, 0, 359),
  sat: intParam(70, 0, 100),
  l: intParam(50, 0, 100),
  type: strParam<HarmonyType>('complementary', HARMONY_VALUES),
  split: intParam(30, 10, 80),
  tet: intParam(60, 10, 170),
  spread: intParam(30, 5, 60),
  view: strParam<WheelView>('natural', ['natural', 'pure', 'guide'] as const),
}

const SLUG = 'color-analyzer'

export function ColorAnalyzer() {
  const t = useTranslations(`toolUI.${SLUG}`)
  const { trackParam } = useToolSession()

  // ── generator/key state (URL-synced) ────────────────────────────────
  const [hue, setHue] = useState(200)
  const [saturation, setSaturation] = useState(70)
  const [lightness, setLightness] = useState(50)
  const [harmony, setHarmonyState] = useState<HarmonyType>('complementary')
  const [splitAngle, setSplitAngle] = useState(30)
  const [tetradicOffset, setTetradicOffset] = useState(60)
  const [analogousSpread, setAnalogousSpread] = useState(30)
  const [view, setViewState] = useState<WheelView>('natural')

  useQueryInit(PARAM_SCHEMA, { h: setHue, sat: setSaturation, l: setLightness, type: setHarmonyState, split: setSplitAngle, tet: setTetradicOffset, spread: setAnalogousSpread, view: setViewState })
  useToolQuerySync({ h: hue, sat: saturation, l: lightness, type: harmony, split: splitAngle, tet: tetradicOffset, spread: analogousSpread, view }, PARAM_SCHEMA)

  // ── photo + samples ─────────────────────────────────────────────────
  const [photo, setPhoto] = useState<AnalysisPhoto | null>(null)
  const [state, dispatch] = useReducer(sampleReducer, EMPTY_STATE)
  const { samples, selectedId, customTargets } = state
  const hasSamples = samples.length > 0
  const params: HarmonyParams = useMemo(() => ({ splitAngle, analogousSpread, tetradicOffset }), [splitAngle, analogousSpread, tetradicOffset])

  const setHarmony = useCallback((h: HarmonyType) => {
    trackParam({ param_name: 'harmony', param_value: h, input_type: 'select' })
    if (h === 'custom') dispatch({ type: 'resetCustomTargets' })
    setHarmonyState(h)
  }, [trackParam])

  const setView = useCallback((v: WheelView) => {
    trackParam({ param_name: 'view', param_value: v, input_type: 'toggle' })
    setViewState(v)
  }, [trackParam])

  const onFile = useCallback(async (file: File) => {
    try {
      const decoded = await decodeToAnalysisCanvas(file)
      setPhoto(decoded)
      dispatch({ type: 'clear' })
    } catch { /* FileDropZone already filtered non-images; a decode failure leaves the pane empty */ }
  }, [])

  const addSample = useCallback((x: number, y: number) => {
    if (!photo) return
    const color = sampleAt(photo, x, y)
    const id = newSampleId()
    dispatch({ type: 'add', id, x, y, color, label: t(`names.${colorNameKey(color.hsl)}` as Parameters<typeof t>[0]) })
    trackParam({ param_name: 'sample_add', param_value: String(samples.length + 1), input_type: 'button' })
  }, [photo, t, trackParam, samples.length])

  const moveSample = useCallback((id: string, x: number, y: number) => {
    if (!photo) return
    dispatch({ type: 'move', id, x, y, color: sampleAt(photo, x, y) })
  }, [photo])

  const autoPick = useCallback(() => {
    if (!photo) return
    const points = autoPickPoints(photo)
    const next = points.map((pt) => {
      const color = sampleAt(photo, pt.x, pt.y)
      return { id: newSampleId(), x: pt.x, y: pt.y, ...color, label: t(`names.${colorNameKey(color.hsl)}` as Parameters<typeof t>[0]), locked: false }
    })
    dispatch({ type: 'replaceAll', samples: next })
    trackParam({ param_name: 'auto_pick', param_value: String(next.length), input_type: 'button' })
  }, [photo, t, trackParam])

  // ── derived ─────────────────────────────────────────────────────────
  const fitSamples: FitSample[] = useMemo(() => samples.map((s) => ({ id: s.id, h: s.hsl.h, s: s.hsl.s, l: s.hsl.l, neutral: s.neutral })), [samples])
  const lockedId = samples.find((s) => s.locked)?.id ?? null
  const keySample: FitSample = useMemo(() => ({ id: 'key', h: hue, s: saturation, l: lightness, neutral: false }), [hue, saturation, lightness])
  const scored = hasSamples ? fitSamples : [keySample]

  const fit = useMemo(() => fitHarmony(scored, harmony, params, { lockedId, customTargets, fallbackHue: hue }), [scored, harmony, params, lockedId, customTargets, hue])
  const closest = useMemo(() => (hasSamples ? rankHarmonies(fitSamples, params)[0] ?? null : null), [hasSamples, fitSamples, params])

  const fill = useMemo(() => {
    const locked = samples.find((s) => s.locked)
    if (locked) return { s: locked.hsl.s, l: locked.hsl.l }
    const scorable = samples.filter((s) => !s.neutral)
    if (scorable.length) return { s: Math.round(scorable.reduce((a, s) => a + s.hsl.s, 0) / scorable.length), l: Math.round(scorable.reduce((a, s) => a + s.hsl.l, 0) / scorable.length) }
    return { s: saturation, l: lightness }
  }, [samples, saturation, lightness])

  const palette = useMemo(() => buildPalette(fit, scored, harmony, fill), [fit, scored, harmony, fill])
  const wheelLightness = hasSamples ? 50 : lightness
  const resultById = useMemo(() => new Map(fit.results.map((r) => [r.id, r])), [fit])

  const dots: WheelDot[] = useMemo(() => samples.map((s, i) => ({
    id: s.id, hue: s.hsl.h, r: view === 'pure' ? 100 : s.hsl.s, hex: rgbToHex(s.rgb.r, s.rgb.g, s.rgb.b),
    index: i + 1, isKey: s.locked, neutral: s.neutral,
  })), [samples, view])

  const showGuide = !hasSamples || view === 'guide'
  const targets: WheelTarget[] = useMemo(() => {
    if (!showGuide) return []
    if (harmony === 'custom') return fit.slots.map((sl) => {
      const s = samples.find((x) => x.id === sl.sampleIds[0])
      return { id: sl.sampleIds[0], hue: sl.hue, r: view === 'pure' ? 100 : (s?.hsl.s ?? fill.s), filled: false }
    })
    return fit.slots.map((sl, i) => ({ id: `slot-${i}`, hue: sl.hue, r: hasSamples && view !== 'pure' ? fill.s : (hasSamples ? 100 : saturation), filled: sl.sampleIds.length > 0 }))
  }, [showGuide, harmony, fit, samples, view, fill.s, hasSamples, saturation])

  const arrows: WheelArrow[] = useMemo(() => {
    if (!hasSamples || view !== 'guide') return []
    return fit.results.filter((r) => r.band !== 'aligned').map((r) => {
      const s = samples.find((x) => x.id === r.id)!
      return { fromId: r.id, toHue: r.targetHue, toR: s.hsl.s }
    })
  }, [hasSamples, view, fit, samples])

  // ── strings ─────────────────────────────────────────────────────────
  const tk = (k: string) => t(k as Parameters<typeof t>[0])
  const harmonyLabels = Object.fromEntries(HARMONY_KEYS.map((h) => [h.value, tk(h.key)])) as Record<HarmonyType, string>
  const anchorWarm = (fit.anchorHue < 70) || fit.anchorHue >= 330
  const anchorCool = fit.anchorHue >= 170 && fit.anchorHue < 270
  const suggestionKey = (() => {
    const base = HARMONY_KEYS.find((h) => h.value === harmony)!.key
    const tone = anchorWarm ? 'warm' : anchorCool ? 'cool' : 'default'
    return `suggestions.${base}.${tone}`
  })()
  const nudgeFor = (id: string): string | null => {
    const r = resultById.get(id); const s = samples.find((x) => x.id === id)
    if (!r || !s) return null
    if (r.band === 'aligned') return tk('nudge.aligned')
    const dir = tk(`names.${directionBandKey(s.hsl.h, r.targetHue, r.delta)}`)
    return t(r.band === 'slight' ? 'nudge.slight' : 'nudge.big', { color: dir })
  }

  const sampleCards: SampleCardProps[] = samples.map((s, i) => ({
    index: i + 1, sample: s, colorName: tk(`names.${colorNameKey(s.hsl)}`), result: resultById.get(s.id) ?? null,
    nudge: nudgeFor(s.id), selected: s.id === selectedId, showGuide: view === 'guide',
    labels: { lock: tk('lock'), unlock: tk('unlock'), remove: tk('removeSample'), copied: tk('copiedExcl'), neutral: tk('neutralNotScored'), labelPlaceholder: tk('labelPlaceholder'), suggested: tk('suggested') },
    onSelect: () => dispatch({ type: 'select', id: s.id }),
    onLabelChange: (label) => dispatch({ type: 'relabel', id: s.id, label }),
    onLock: (locked) => { trackParam({ param_name: 'lock', param_value: String(locked), input_type: 'toggle' }); dispatch({ type: 'lock', id: s.id, locked }) },
    onRemove: () => dispatch({ type: 'remove', id: s.id }),
    onNudgePosition: (dx, dy) => { if (photo) moveSample(s.id, s.x + dx / photo.width, s.y + dy / photo.height) },
  }))

  const keyHex = (() => { const rgb = hslToRgb(hue, saturation, lightness); return rgbToHex(rgb.r, rgb.g, rgb.b) })()
  const applyHex = (hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
    const hsl = rgbToHsl(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))
    setHue(hsl.h); setSaturation(hsl.s); setLightness(hsl.l)
  }

  // ── export ──────────────────────────────────────────────────────────
  const wheelRef = useRef<ColorWheelHandle>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const buildExportCanvas = useCallback(() => {
    const wheelCanvas = wheelRef.current?.getCanvas(); const exportCanvas = exportCanvasRef.current
    if (!wheelCanvas || !exportCanvas) return
    buildColorExportCanvas({ wheelCanvas, exportCanvas, swatches: palette, photo, samples, title: harmonyLabels[harmony] })
  }, [palette, photo, samples, harmonyLabels, harmony])

  return (
    <div className={styles.wrapper}>
      <ToolHeading slug={SLUG} />
      <AnalyzerSidebar
        toolSlug={SLUG} exportCanvasRef={exportCanvasRef} buildExportCanvas={buildExportCanvas}
        harmony={harmony} onHarmony={setHarmony} harmonyLabels={harmonyLabels}
        closestFit={closest ? { type: closest.type, meanError: closest.meanError } : null}
        labels={{
          colorScheme: tk('colorScheme'), closestFit: tk('closestFit'),
          closestSentence: closest ? t('closestSentence', { harmony: harmonyLabels[closest.type], degrees: Math.round(closest.meanError) }) : null,
          suggestion: tk(suggestionKey), samplesHeading: tk('samples'),
          splitAngle: tk('splitAngle'), spread: tk('spread'), rectangleWidth: tk('rectangleWidth'), square: tk('square'),
        }}
        params={params}
        onParams={(patch) => { if (patch.splitAngle !== undefined) setSplitAngle(patch.splitAngle); if (patch.analogousSpread !== undefined) setAnalogousSpread(patch.analogousSpread); if (patch.tetradicOffset !== undefined) setTetradicOffset(patch.tetradicOffset) }}
        keyCard={hasSamples ? null : {
          hue, saturation, lightness, hex: keyHex,
          onHue: (v) => { trackParam({ param_name: 'hue', param_value: String(v), input_type: 'slider' }); setHue(v) },
          onSaturation: setSaturation, onLightness: setLightness, onHex: applyHex,
          labels: { keyColor: tk('keyColor'), hue: tk('hue'), saturation: tk('saturation'), lightness: tk('lightness') },
        }}
        sampleCards={sampleCards}
      />

      <div className={styles.rightSide}>
        <PaletteBar swatches={palette} />
        <div className={styles.centerRow}>
          <PhotoPane
            photo={photo} samples={samples} selectedId={selectedId} canAdd={samples.length < SAMPLE_CAP}
            labels={{ drop: tk('dropPhotoPrompt'), change: tk('changePhoto'), autoPick: tk('autoPick'), capReached: t('capReached', { cap: SAMPLE_CAP }),
              marker: (n, label) => t('markerLabel', { n, label }), remove: tk('removeSample') }}
            onFile={onFile} onAdd={addSample} onMove={moveSample}
            onSelect={(id) => dispatch({ type: 'select', id })} onRemove={(id) => dispatch({ type: 'remove', id })}
            onAutoPick={autoPick} onChangePhoto={() => { setPhoto(null); dispatch({ type: 'clear' }) }}
          />
          <div className={styles.wheelColumn}>
            <ColorWheel ref={wheelRef}
              lightness={wheelLightness} dots={dots} targets={targets} arrows={arrows}
              keyDot={hasSamples ? null : { hue, s: saturation }} selectedId={selectedId}
              customDraggable={harmony === 'custom' && view === 'guide'}
              onKeyChange={(h, s) => { setHue(h); setSaturation(s) }}
              onSelectDot={(id) => dispatch({ type: 'select', id })}
              onCustomTargetDrag={(id, h) => dispatch({ type: 'setCustomTarget', id, hue: h })}
            />
            {hasSamples && (
              <WheelViewToggle view={view} onChange={setView} labels={{ natural: tk('viewNatural'), pure: tk('viewPure'), guide: tk('viewGuide') }} />
            )}
            <p className={styles.wheelHint}>{tk(hasSamples ? `viewHint.${view}` : 'viewHint.key')}</p>
          </div>
        </div>
      </div>

      <div className={styles.desktopOnly}><LearnPanel slug={SLUG} /></div>
      <RelatedTools variant="inline" currentSlug={SLUG} />
      <div className={styles.mobileOnly}><LearnPanel slug={SLUG} /></div>
      <canvas ref={exportCanvasRef} style={{ display: 'none' }} />
    </div>
  )
}
```

- [ ] **Step 2: Layout CSS**

In `ColorAnalyzer.module.css` replace `.mainArea` with:
```css
.centerRow { flex: 1; display: flex; min-height: 0; min-width: 0; }
.wheelColumn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; flex-shrink: 0; }
.wheelHint { margin: 6px 0 0; font-size: 11px; color: var(--text-muted); text-align: center; max-width: 440px; font-style: italic; }
@media (max-width: 1023px) {
  .centerRow { flex-direction: column; }
  .wheelColumn { padding: 12px 0; }
}
```
Keep the existing `.wrapper`, `.sidebar`, `.rightSide`, `.paletteBar*`, `.field`, `.label`, `.radioGroup`, `.radioBtn*`, `.keyColorRow`, `.colorPicker`, `.hexInput`, `.copy*`, `.suggestion`, `.wheelContainer`, `.wheelCanvas`, `.desktopOnly/.mobileOnly` rules and the `max-width: 1023px` block that stacks `.wrapper`.

- [ ] **Step 3: Wire the page**

`src/app/[locale]/color-analyzer/page.tsx` already imports `ColorAnalyzer` (Task 8 placeholder); no change needed.

- [ ] **Step 4: Confirm the old owner is gone**

Run: `grep -rn "ColorHarmony" src` — expected: only the `ColorHarmony` icon function in `ToolIcon.tsx`.

- [ ] **Step 5: Type-check, lint, unit tests, and a manual pass**

```bash
npm run type-check && npm run lint && npm test
npm run dev   # http://localhost:3200/en/color-analyzer
```
Manual checklist (desktop 1440 and 1280, then a 390px phone emulation):
1. No photo: drag on the wheel moves the key; harmony buttons change the dashed targets and the palette bar; sliders and hex input work; URL updates with `h/sat/l/type`.
2. Drop a JPEG: image letterboxed, no page scroll; click adds numbered markers up to 8; 9th click ignored with the cap note shown; drag a marker moves it and the card values update; × removes.
3. Views: Natural vs Pure changes dot radius; Harmony guide draws dashed targets and arrows; cards show nudge lines with a suggested hex; Aligned rows have no arrow.
4. Lock a sample: targets rotate to anchor on it; lock another: first unlocks.
5. Auto-pick: 5 markers on a colourful photo, none gray; on a grayscale photo they land and read "Neutral, not scored".
6. Custom in guide view: drag a dashed target, its card updates.
7. Copy image: PNG shows photo with markers, wheel, swatches.
8. Mobile: pane, wheel, sidebar stack; marker drag does not scroll the page.

- [ ] **Step 6: Commit**

```bash
git add -A "src/app/[locale]/color-analyzer/"
git commit -m "feat(color-analyzer): state owner wiring photo pane, wheel, sidebar and palette"
```

---

### Task 13: English copy — tool UI strings, name/metadata, education, FAQ

After this task `translations.test.ts` and `check-translations.mjs` fail for the 30 other locales until Task 14 lands. That is expected; do Tasks 13 and 14 back to back and do not open the PR between them.

**Files:**
- Modify: `src/lib/i18n/messages/en/tools/color-analyzer.json`, `src/lib/i18n/messages/en/education/color-analyzer.json`, `src/lib/i18n/messages/en/tools.json`, `src/lib/i18n/messages/en/metadata.json`, `src/lib/data/education/content-color-fov.ts`, `src/lib/data/tools.ts`, `src/lib/data/faq.ts`

- [ ] **Step 1: Rewrite `en/tools/color-analyzer.json`**

Replace the file. Keep every key the components read; drop the modal-era keys (`pickFromPhoto`, `pickColorFromPhoto`, `close`, `dropPhotoOrBrowse`, `tapToChoose`, `tapToSample`, `privacyNote`, `keyColorLabel` stays). `suggestions` becomes uniform: every harmony has `warm`, `cool`, `default`.

```json
{
  "toolUI": {
    "color-analyzer": {
      "colorScheme": "Color harmony",
      "complementary": "Complementary",
      "splitComplementary": "Split Complementary",
      "analogous": "Analogous",
      "triadic": "Triadic",
      "tetradic": "Tetradic",
      "monochromatic": "Monochromatic",
      "custom": "Custom",
      "closestFit": "Closest fit",
      "closestSentence": "Your photo is closest to {harmony} (mean {degrees}° off). Tap to use it.",
      "keyColor": "Key Color",
      "hue": "Hue:",
      "saturation": "Saturation:",
      "lightness": "Lightness:",
      "splitAngle": "Split angle:",
      "spread": "Spread:",
      "rectangleWidth": "Rectangle width:",
      "square": "(square)",
      "samples": "Samples",
      "lock": "Lock this color as the anchor",
      "unlock": "Unlock",
      "removeSample": "Remove sample",
      "labelPlaceholder": "Label",
      "neutralNotScored": "Neutral, not scored",
      "suggested": "Suggested",
      "autoPick": "Auto-pick 5",
      "changePhoto": "Change photo",
      "capReached": "{cap} samples max. Remove one to add another.",
      "markerLabel": "Sample {n}: {label}",
      "dropPhotoPrompt": "Drop a photo or click to browse. It stays in your browser.",
      "viewNatural": "Natural",
      "viewPure": "Pure hues",
      "viewGuide": "Harmony guide",
      "viewHint": {
        "key": "Drag the dot to set a key color. Drop a photo to analyze real colors instead.",
        "natural": "Showing colors at their actual saturation. Switch tabs to read the harmony.",
        "pure": "Hues pushed to the rim so the angles between colors are easy to read.",
        "guide": "Dashed shapes are the target positions. Arrows show which way each color should move."
      },
      "nudge": {
        "aligned": "Aligned",
        "slight": "Slight nudge toward {color}",
        "big": "Big shift toward {color}"
      },
      "names": {
        "red": "red", "vermilion": "vermilion", "orange": "orange", "amber": "amber", "yellow": "yellow", "lime": "lime",
        "chartreuse": "chartreuse", "leaf-green": "leaf green", "green": "green", "jade": "jade", "spring-green": "spring green", "mint": "mint",
        "cyan": "cyan", "sky-blue": "sky blue", "azure": "azure", "cobalt": "cobalt", "blue": "blue", "indigo": "indigo",
        "violet": "violet", "purple": "purple", "magenta": "magenta", "fuchsia": "fuchsia", "pink": "pink", "rose": "rose",
        "gray": "gray", "black": "black", "white": "white"
      },
      "keyColorLabel": "Key color — click to copy hex",
      "clickToCopyHex": "Click to copy hex",
      "copiedExcl": "Copied!",
      "copyColors": "Copy colors",
      "hexFormat": "Hex",
      "cssFormat": "CSS",
      "rgbFormat": "RGB",
      "copyHexCodes": "Copy hex codes",
      "copyCssVariables": "Copy CSS variables",
      "copyRgbValues": "Copy RGB values",
      "suggestions": {
        "complementary": {
          "warm": "Great for: warm sunset portraits with cool shadow contrast",
          "cool": "Great for: moody blue-hour shots with warm accent lighting",
          "default": "Great for: high-contrast compositions with strong visual tension"
        },
        "splitComplementary": {
          "warm": "Great for: dreamy, calm looks that keep contrast without harshness",
          "cool": "Great for: cool street and travel scenes with two warm accents",
          "default": "Great for: balanced frames with variety and no direct opposition"
        },
        "analogous": {
          "warm": "Great for: golden hour landscapes with unified warm tones",
          "cool": "Great for: serene water scenes and twilight photography",
          "default": "Great for: harmonious nature shots with smooth color transitions"
        },
        "triadic": {
          "warm": "Great for: bold editorial work with red, yellow and blue energy",
          "cool": "Great for: vibrant, slightly unsettling frames with three strong colors",
          "default": "Great for: vibrant editorial work and bold creative portraits"
        },
        "tetradic": {
          "warm": "Great for: rich, layered scenes with two complementary pairs",
          "cool": "Great for: complex cityscapes with cool and warm light sources",
          "default": "Great for: rich editorial layouts and multi-subject compositions"
        },
        "monochromatic": {
          "warm": "Great for: quiet, cohesive warm tones from one hue",
          "cool": "Great for: calm, minimal cool scenes built on one hue",
          "default": "Great for: minimal, unified images that lean on light and shade"
        },
        "custom": {
          "warm": "Drag the dashed targets to design your own relationship between colors",
          "cool": "Drag the dashed targets to design your own relationship between colors",
          "default": "Drag the dashed targets to design your own relationship between colors"
        }
      },
      "faq": {
        "what-is-color-harmony": {
          "question": "What is color harmony in photography?",
          "answer": "Color harmony is a relationship between the hues in a frame that reads as deliberate: two colors opposite each other (complementary), neighbors on the wheel (analogous), or three evenly spaced (triadic). Photos rarely start on a clean harmony, but they are usually one small nudge away from one."
        },
        "complementary-vs-analogous": {
          "question": "How do I read the harmony that is already in my photo?",
          "answer": "Sample a few points that matter (sky, skin, the one red door) and look at where they land on the wheel. Two dots roughly opposite each other are a complementary pair; a cluster within about 60° is analogous. The Closest fit badge does this comparison for you across all six harmonies."
        },
        "how-to-use-color-schemes-photography": {
          "question": "How do I use the suggested colors in Lightroom or Photoshop?",
          "answer": "Each sample shows a direction (toward pink, toward teal) and a suggested hex at the same saturation and lightness. In Lightroom's HSL panel or Point Color, or Photoshop's Hue/Saturation, push that color's hue in the direction shown until it lands near the suggested value. Move the biggest shifts first and stop when the arrow reads Aligned."
        }
      }
    }
  }
}
```

- [ ] **Step 2: Update `en/tools.json` and `en/metadata.json`**

```json
"color-analyzer": { "name": "Color Analyzer", "description": "Sample the colors in a photo, read its harmony, and see which way to push each one" }
```
```json
"color-analyzer": {
  "title": "Color Analyzer: read the color harmony in any photo",
  "description": "Free photo color analyzer and color scheme generator. Sample colors from your photo, plot them on a color wheel, find the closest color harmony, and get per-color grading guidance. 100% in your browser."
}
```
Also update `src/lib/data/tools.ts` line 9 to the same name and description, `prod: 'live'`.

- [ ] **Step 3: Rewrite `en/education/color-analyzer.json`**

```json
{
  "education": {
    "color-analyzer": {
      "beginner": "Most photos already contain a color relationship; you just cannot see it yet. Drop a photo, tap the colors that matter, and the wheel shows how they relate. Pick the harmony you want and the tool tells you which way to push each color.",
      "deeper": [
        { "heading": "The four-step method", "text": "Intention (what should the viewer feel), Analysis (which colors are actually in the frame), Color Choice (which harmony fits that feeling), Transformation (move the sliders in the direction the wheel shows). Editing comes last. Most frustration with color grading comes from starting at step four." },
        { "heading": "Reading the wheel", "text": "Each sample is plotted by hue (angle) and saturation (distance from the center). Natural view shows true saturation, Pure hues pushes every dot to the rim so the angles are obvious, and Harmony guide adds the target positions and arrows for the harmony you picked." },
        { "heading": "Closest fit", "text": "The tool rotates each harmony template to the position that best matches your samples and measures the average hue error, normalized by the template's slot spacing so four-slot harmonies do not win by default. The winner gets the badge; you choose whether to use it." },
        { "heading": "Locks and anchors", "text": "Lock a sample to make it the anchor: the harmony rotates around that hue and every other color is judged against it. Use it for the color you will not change, usually skin or a brand color. With no lock the tool picks the rotation with the smallest total error." },
        { "heading": "Neutrals", "text": "Grays, near-blacks and near-whites have no reliable hue, so they plot at the center and are left out of the fit. They still matter for the mood, but nudging their hue in a slider mostly adds a color cast." },
        { "heading": "Why HSL and not a perceptual wheel", "text": "This wheel uses HSL, the same model as Adobe Color and Lightroom's HSL panel, so the direction you read here is the direction you push there. It is not perceptually uniform: yellow occupies a thin band and blue a wide one, so a 20° nudge looks bigger in some regions than others. A perceptual wheel would be more honest but would not match the editing tools." }
      ],
      "keyFactors": [
        { "label": "Harmony Type", "description": "The geometric relationship you are aiming for: complementary, split-complementary, analogous, triadic, tetradic, monochromatic, or your own custom targets." },
        { "label": "Samples", "description": "Which colors you chose to sample. Sample what matters to the picture, not what is largest. Five to six points usually tell the whole story." },
        { "label": "Anchor", "description": "The locked sample the harmony rotates around. Without a lock the best-fit rotation is used." },
        { "label": "Nudge", "description": "The signed hue rotation from a sample to its target. Aligned is within 8°, a slight nudge within 25°, anything more is a big shift." }
      ],
      "tips": [
        { "text": "Sample the colors you will actually grade: sky, skin, the dominant object, a shadow. Skip specular highlights and deep shadows; they read as neutral." },
        { "text": "Split-complementary is the calm, dreamy choice for travel and street work. Complementary is cleaner and punchier. Triadic is deliberately a little unsettling." },
        { "text": "Use Auto-pick to start, then move or delete points. It finds the dominant chromatic clusters, which are often not the colors you care about most." }
      ],
      "tooltips": {
        "Harmony Type": { "term": "Harmony Type", "definition": "The target relationship between hues. Complementary (opposite), Split Complementary (opposite ± angle), Analogous (neighbors), Triadic (120° apart), Tetradic (two complementary pairs), Monochromatic (one hue), Custom (your own targets)." },
        "Key Color": { "term": "Key Color", "definition": "With no photo loaded, the color the harmony is built around. Drag the wheel or use the sliders." },
        "Hue": { "term": "Hue", "definition": "The color angle on the wheel in degrees: 0° is red, 120° is green, 240° is blue." },
        "Saturation": { "term": "Saturation", "definition": "Color intensity from 0% (gray) to 100% (fully vivid). Distance from the wheel's center." },
        "Lightness": { "term": "Lightness", "definition": "Brightness from 0% (black) to 100% (white). At 50% you see the pure color." },
        "Split Angle": { "term": "Split Angle", "definition": "How far the two split-complementary colors sit from the direct complement." },
        "Spread": { "term": "Spread", "definition": "How far the analogous colors sit from the anchor hue." },
        "Lock": { "term": "Lock", "definition": "Makes a sample the anchor. The harmony rotates to that hue and other samples are judged against it. Only one sample can be locked." },
        "Closest fit": { "term": "Closest fit", "definition": "The harmony whose best rotation has the lowest normalized hue error across your samples. Needs at least two chromatic samples." }
      },
      "challenges": [
        { "scenario": "You sampled a blue sky at 210° and an orange wall at 25°. Which harmony are they already closest to?", "hint": "Check the angle between them.", "successMessage": "Right. 185° apart is a near-perfect complementary pair; a small nudge to the wall finishes it.", "failureMessage": "Two colors about 180° apart are complementary. Analogous colors sit within roughly 60° of each other.", "options": [ { "label": "Complementary" }, { "label": "Analogous" }, { "label": "Triadic" } ] },
        { "scenario": "A photo has three samples at 40°, 60° and 85°. What harmony is this?", "hint": "They are all neighbors on the wheel.", "successMessage": "Correct. Neighboring hues within about 60° form an analogous harmony.", "failureMessage": "Hues that are all close together are analogous, the calm and unified option.", "options": [ { "label": "Complementary" }, { "label": "Analogous" }, { "label": "Tetradic" } ] },
        { "scenario": "You want a dreamy, calm street photo but keep some contrast. Which harmony should you pick?", "hint": "Think of the complement's two neighbors instead of the complement itself.", "successMessage": "Yes. Split-complementary keeps tension without the harshness of a direct opposite.", "failureMessage": "Split complementary is the calm-but-contrasty option. Triadic tends to feel energetic or unsettling.", "options": [ { "label": "Split Complementary" }, { "label": "Triadic" }, { "label": "Analogous" } ] },
        { "scenario": "A sample reads Slight nudge toward pink with a delta of −15°. In Lightroom's HSL panel, what do you do?", "hint": "The direction word tells you where to push, the size tells you how far.", "successMessage": "Right. Move that color's Hue slider toward pink until the card reads Aligned.", "failureMessage": "Push the hue in the direction named (pink) by a small amount; a 15° change is a slight nudge, not a big shift.", "options": [ { "label": "Shift the hue slightly toward pink" }, { "label": "Desaturate it" }, { "label": "Shift the hue toward green" } ] },
        { "scenario": "Two samples share the same hue but one is locked. Which one does the harmony rotate around?", "hint": "Only one sample can be the anchor.", "successMessage": "Correct. The locked sample is the anchor; the other is judged against the template built on it.", "failureMessage": "The locked sample is always the anchor. With no lock, the best-fit rotation is used.", "options": [ { "label": "The locked sample" }, { "label": "The first sample placed" }, { "label": "The most saturated sample" } ] }
      ]
    }
  }
}
```

- [ ] **Step 4: Update the education skeleton and FAQ registry**

`src/lib/data/education/content-color-fov.ts` (`COLOR_SCHEME_SKELETON`, rename the const to `COLOR_ANALYZER_SKELETON` and update its export/usage in `content*.ts`):
```ts
export const COLOR_ANALYZER_SKELETON: ToolEducationSkeleton = {
  slug: 'color-analyzer',
  deeperSections: 6,
  keyFactorCount: 4,
  tipCount: 3,
  tooltipKeys: ['Harmony Type', 'Key Color', 'Hue', 'Saturation', 'Lightness', 'Split Angle', 'Spread', 'Lock', 'Closest fit'],
  challenges: [
    { id: 'ca-beginner-1', difficulty: 'beginner', targetField: 'harmonyType', optionValues: ['complementary', 'analogous', 'triadic'], correctOption: 'complementary' },
    { id: 'ca-beginner-2', difficulty: 'beginner', targetField: 'harmonyType', optionValues: ['complementary', 'analogous', 'tetradic'], correctOption: 'analogous' },
    { id: 'ca-intermediate-1', difficulty: 'intermediate', targetField: 'harmonyType', optionValues: ['split-complementary', 'triadic', 'analogous'], correctOption: 'split-complementary' },
    { id: 'ca-intermediate-2', difficulty: 'intermediate', targetField: 'nudge', optionValues: ['hue-pink', 'desaturate', 'hue-green'], correctOption: 'hue-pink' },
    { id: 'ca-advanced-1', difficulty: 'advanced', targetField: 'anchor', optionValues: ['locked', 'first', 'saturated'], correctOption: 'locked' },
  ],
}
```
`src/lib/data/faq.ts`: keep the three ids under `slug: 'color-analyzer'` (the answers were rewritten in Step 1).

- [ ] **Step 5: Run the English-only checks**

```bash
npx vitest run src/lib/data src/components/shared   # data + LearnPanel/FAQ integration tests
npm run type-check && npm run lint
npm run dev   # open /en/color-analyzer: LearnPanel renders six sections, nine tooltips, five challenges
```
Expected: PASS except `translations.test.ts` (expected until Task 14).

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/messages/en src/lib/data
git commit -m "feat(color-analyzer): English strings, education content, FAQ and metadata for the analyzer"
```

---

### Task 14: Translate to the other 30 locales

**Files:**
- Modify: `src/lib/i18n/messages/<locale>/tools/color-analyzer.json`, `education/color-analyzer.json`, `tools.json`, `metadata.json` for every locale in `bn ca cs da de el es fi fil fr hi hu id it ja ko ms nb nl pl pt ro ru sv th tr uk vi zh zh-TW`

- [ ] **Step 1: Generate a key manifest to translate against**

```bash
cd ~/workspace/iserlabs/applications/photo-tools
node scripts/check-translations.mjs 2>&1 | head -40   # shows every missing key per locale
python3 - <<'PY'
import json
d = json.load(open('src/lib/i18n/messages/en/tools/color-analyzer.json'))
e = json.load(open('src/lib/i18n/messages/en/education/color-analyzer.json'))
print(json.dumps({'tools': d, 'education': e}, ensure_ascii=False, indent=1))
PY
```

- [ ] **Step 2: Translate, five locales at a time**

For each locale write both files with **exactly the English key structure** (same nesting, same array lengths, same `{placeholders}`), translating values only. Rules:
- Use `src/lib/i18n/glossary.photography.json` for photography terms (hue, saturation, lightness, harmony names).
- Keep the 27 `names.*` values as natural colour words in the target language (the keys stay English).
- Keep `{harmony}`, `{degrees}`, `{color}`, `{cap}`, `{n}`, `{label}` placeholders verbatim; keep `°`, `%`, hex examples, and "Lightroom", "Photoshop", "Adobe Color" untranslated.
- Do not translate tooltip object keys (`"Harmony Type"`, `"Lock"`, …); translate only `term` and `definition`.
- `tools.json` / `metadata.json`: translate `name`, `description`, `title` for `color-analyzer`.

Batches: `[de fr es it pt]`, `[nl sv da nb fi]`, `[pl cs hu ro uk]`, `[ru tr el ca]`, `[ja ko zh zh-TW]`, `[hi bn th vi id ms fil]`.

- [ ] **Step 3: Verify after every batch**

```bash
node scripts/check-translations.mjs          # must end "All translations complete." after the last batch
node scripts/find-english-leaks.mjs          # no HARD leaks
npx vitest run src/lib/i18n/translations.test.ts
```

- [ ] **Step 4: Commit per batch**

```bash
git add src/lib/i18n/messages
git commit -m "i18n(color-analyzer): translate analyzer strings and education (de fr es it pt)"
```
Repeat for each batch; the final commit message lists the last batch.

---

### Task 15: Playwright e2e + colour-block fixture

**Files:**
- Create: `scripts/make-color-blocks-fixture.mjs`, `src/e2e/fixtures/color-blocks.jpg`
- Modify: `src/e2e/tools/color-analyzer.spec.ts`

- [ ] **Step 1: Generate a 600×400 fixture with three colour blocks**

`scripts/make-color-blocks-fixture.mjs` (uses `jpeg-js`, already a dependency):
```js
import { writeFileSync } from 'node:fs'
import jpeg from 'jpeg-js'

const width = 600, height = 400
const data = Buffer.alloc(width * height * 4)
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = (y * width + x) * 4
  const [r, g, b] = x < 200 ? [214, 40, 40] : x < 400 ? [40, 170, 90] : [40, 80, 220]
  data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
}
const out = jpeg.encode({ data, width, height }, 92)
writeFileSync(new URL('../src/e2e/fixtures/color-blocks.jpg', import.meta.url), out.data)
console.log('wrote color-blocks.jpg', out.data.length, 'bytes')
```
Run: `node scripts/make-color-blocks-fixture.mjs`

- [ ] **Step 2: Rewrite the spec**

`src/e2e/tools/color-analyzer.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.resolve(__dirname, '../fixtures/color-blocks.jpg')

test.describe('Color Analyzer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/color-analyzer')
  })

  test('old slug redirects permanently and keeps the query string', async ({ page }) => {
    const res = await page.goto('/color-scheme-generator?h=200&type=triadic')
    expect(page.url()).toMatch(/\/en\/color-analyzer\?h=200&type=triadic$/)
    expect(res?.request().redirectedFrom()).not.toBeNull()
    const sidebar = page.locator('aside').first()
    await expect(sidebar.locator('button:text-is("Triadic")')).toHaveClass(/radioBtnActive/)
  })

  test('no photo: harmony switching changes swatch count', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    const swatches = page.locator('[class*="paletteBarSwatch"]')
    await sidebar.locator('button:text-is("Complementary")').click()
    await expect(swatches).toHaveCount(2)
    await sidebar.locator('button:text-is("Triadic")').click()
    await expect(swatches).toHaveCount(3)
    await sidebar.locator('button:text-is("Tetradic")').click()
    await expect(swatches).toHaveCount(4)
    await sidebar.locator('button:text-is("Monochromatic")').click()
    await expect(swatches).toHaveCount(5)
  })

  test('no photo: hue slider updates swatches', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    const first = page.locator('[class*="paletteBarSwatch"]').first().locator('[class*="paletteBarHex"]')
    const before = await first.textContent()
    const hue = sidebar.locator('input[type="range"]').first()
    await hue.fill(String((Number(await hue.inputValue()) + 120) % 360))
    await expect(first).not.toHaveText(before!)
  })

  test('photo: three samples, harmony guide, nudge lines', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
    const image = page.locator('canvas[class*="image"]')
    await expect(image).toBeVisible()
    const box = (await image.boundingBox())!
    // one click per colour block
    for (const fx of [0.15, 0.5, 0.85]) {
      await image.click({ position: { x: box.width * fx, y: box.height / 2 } })
    }
    await expect(page.locator('[class*="sampleList"] li')).toHaveCount(3)
    await expect(page.getByRole('button', { name: /^Sample 1:/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sample 3:/ })).toBeVisible()

    // the three blocks are ~120° apart: closest fit should be triadic
    await expect(page.getByRole('button', { name: /Closest fit/ })).toContainText('Triadic')

    await page.getByRole('tab', { name: 'Harmony guide' }).click()
    const nudges = page.locator('[class*="sampleNudge"]')
    await expect(nudges).toHaveCount(3)
    await page.locator('aside').first().locator('button:text-is("Triadic")').click()
    await expect(page.locator('[class*="sampleNudge"][data-band="aligned"]')).toHaveCount(3)
  })

  test('photo: cap at 8 samples', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
    const image = page.locator('canvas[class*="image"]')
    const box = (await image.boundingBox())!
    for (let i = 0; i < 9; i++) {
      await image.click({ position: { x: 20 + i * (box.width - 40) / 9, y: box.height * 0.25 } })
    }
    await expect(page.locator('[class*="sampleList"] li')).toHaveCount(8)
    await expect(page.getByText(/samples max/)).toBeVisible()
  })

  test('mobile: layout stacks and marker drag does not scroll the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/color-analyzer')
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
    const image = page.locator('canvas[class*="image"]')
    const box = (await image.boundingBox())!
    await image.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } })
    const marker = page.getByRole('button', { name: /^Sample 1:/ })
    const before = await page.evaluate(() => window.scrollY)
    const m = (await marker.boundingBox())!
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
    await page.mouse.down()
    await page.mouse.move(m.x + 40, m.y + 60, { steps: 5 })
    await page.mouse.up()
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
  })

  test('copy palette hex button', async ({ page, browserName }) => {
    if (browserName !== 'firefox') await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const copyGroup = page.locator('[class*="copyGroup"]')
    await copyGroup.locator('button:text-is("Hex")').click()
    await expect(copyGroup.locator('button:text-is("Copied!")')).toBeVisible()
  })
})
```

- [ ] **Step 3: Build and run**

```bash
npm run build && npx playwright test src/e2e/tools/color-analyzer.spec.ts
```
Expected: all pass in chromium and firefox. If "closest fit should be triadic" fails, print the three sampled hues from the cards; block hues are ~0°, ~143°, ~227° — triadic error ≈ 16° mean, comfortably ahead of the others.

- [ ] **Step 4: Commit**

```bash
git add scripts/make-color-blocks-fixture.mjs src/e2e/fixtures/color-blocks.jpg src/e2e/tools/color-analyzer.spec.ts
git commit -m "test(color-analyzer): e2e for redirect, generator mode, sampling, guide, cap and mobile drag"
```

---

### Task 16: Final verification, PR, preview check

- [ ] **Step 1: Full local gate**

```bash
cd ~/workspace/iserlabs/applications/photo-tools
npm run type-check && npm run lint && npm test
node scripts/check-translations.mjs && node scripts/find-english-leaks.mjs
npm run build && npm run test:e2e
grep -rn "color-scheme-generator" src --exclude-dir=node_modules | grep -v redirects   # must be empty
```

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin feat/color-analyzer
gh pr create --title "feat: Color Analyzer — rebuild Color Scheme Generator around photo sampling and harmony guidance" --body-file - <<'MD'
Rebuilds `color-scheme-generator` as **Color Analyzer** (`/color-analyzer`, permanent redirect from the old slug, query string preserved).

- Drop a photo, place up to 8 sample points (5×5 patch average on a 1600px analysis canvas), see them on the HSL wheel.
- Natural / Pure hues / Harmony guide views; dashed targets, arrows, per-sample nudge lines with a suggested hex.
- Six template harmonies + custom; best-fit anchor search; "Closest fit" detection; lock a sample as anchor.
- The old key-colour generator is the no-samples state (unfilled slots = palette).
- All 31 locales; LearnPanel rewritten around the four-step method; e2e for redirect, sampling, guide, cap, mobile drag.

Spec: `docs/superpowers/specs/2026-09-27-color-analyzer-design.md`. Plan: `docs/superpowers/plans/2026-09-27-color-analyzer.md`.
Ships `prod: 'live'` because it replaces a live tool.
MD
```

- [ ] **Step 3: Verify the Vercel preview**

On the PR's preview URL, at 1024, 1280, 1440 and a 390px phone: run the Task 12 Step 5 manual checklist, and confirm `/color-scheme-generator?h=200&type=triadic` 308s to the new slug. Check Sentry shows no new issues for the route after 24h on production.
