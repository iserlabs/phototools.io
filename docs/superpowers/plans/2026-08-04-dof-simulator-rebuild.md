# DOF Simulator Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `dof-simulator` from scratch as a dofsimulator.net-equivalent: AI-generated subject composited over a shaped-bokeh-blurred background, camera/lens DBs, framing presets, DOF ruler, saved settings, advanced mode, plus 8 improvements.

**Architecture:** WebGL2 canvas blurs the background with a 64-tap Poisson kernel shaped to the aperture; the subject is a DOM `<img>` stack (crop levels + depth slices) scaled by projection math; state lives in hook slices composed by a facade with query-string share links. Spec: `docs/superpowers/specs/2026-08-04-dof-simulator-rebuild-design.md` — read it first.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, CSS Modules, WebGL2 + GLSL 300 es, next-intl 4, Vitest + @testing-library/react, Playwright, sharp (asset scripts), gemini-nano-banana MCP (asset generation).

## Global Constraints

- Every `.ts`/`.tsx` file < 200 lines (test files exempt). Named exports only.
- CSS Modules + design tokens from `src/app/globals.css` — never invent CSS variables; check the file first.
- No hardcoded user-facing strings — every label via `useTranslations('toolUI.dof-simulator')` (client) or `getTranslations` (server). Add keys to `src/lib/i18n/messages/en/tools/dof-simulator.json` as you go; other locales filled in Task 26.
- Import `Link`/`usePathname`/`useRouter` from `@/lib/i18n/navigation`, NEVER from `next/link`/`next/navigation`.
- `'use client'` on interactive components; server components by default.
- TDD: test first, watch it fail, implement, watch it pass, commit. Run tests with `npx vitest run <path>`.
- Metric units internally everywhere; imperial exists only in formatters.
- Commit after every task (small commits within a task are fine). NEVER push or deploy.
- After changing files under `src/app/`, run `rm -rf .next` before restarting dev (`npm run dev`, port 3200).
- Old tool teardown happens in Task 24, not before — the old tool must keep compiling until the new one replaces it.
- Do not modify `src/lib/data/sensors.ts` or other shared modules consumed by other tools; tool-local extensions live under `src/lib/data/dofSimulator/`.

## File Structure (target)

```
src/lib/math/
  projection.ts (+.test)          frame/figure/layout/blur-px math
  framingSolver.ts (+.test)       preset + lock-FOV solvers, clamp reporting
  bokehKernel.ts (+.test)         Poisson taps in aperture shapes
  dof.ts                          EXISTING — add calcDefocusBlur (two-sided)
src/lib/data/dofSimulator/
  types.ts                        all schema interfaces
  sensors.ts (+.test)             SENSORS + phone presets, tool-local
  framing.ts  bokeh.ts  teleconverters.ts (+.test)
  cameras/{index,canon,nikon,sony,fujifilm,panasonic,om-system,leica,pentax}.ts (+validation .test)
  lenses/{index,canon,nikon,sony,fujifilm,sigma,tamron,panasonic,om-system}.ts (+validation .test)
  models.ts (+.test)              subject manifests
  backgrounds.ts (+.test)         background manifests
scripts/dof-assets/
  cutout.mjs  slice.mjs           chroma-key + mask compositor (sharp)
  masks/*.svg                     per-subject slice masks
public/dof/subjects/{id}/        full.webp torso.webp face.webp + slices
public/dof/backgrounds/          {id}-landscape.webp {id}-portrait.webp
src/app/[locale]/dof-simulator/
  page.tsx                        server entry: metadata + <DofSimulator/>
  _components/
    DofSimulator.tsx  DofSimulator.module.css
    state/  useOptics.ts useAppearance.ts useFraming.ts useUiPrefs.ts
            useSavedSettings.ts useAbCompare.ts useDofDerived.ts
            useDofState.ts paramSchema.ts savedSettingsStore.ts
    viewport/  Viewport.tsx useRenderer.ts ModelLayer.tsx BokehInset.tsx
               AbDivider.tsx useApertureSweep.ts
               webgl/ glContext.ts glProgram.ts glTexture.ts
               shaders/ bokehBlur.frag.ts passthrough.vert.ts
    panels/  InterfacePanel.tsx AppearancePanel.tsx ModelPickerModal.tsx
             BackgroundPickerModal.tsx CameraPanel.tsx LensPanel.tsx
             DistancePanel.tsx FramingPanel.tsx AdvancedPanel.tsx
             SavedSettingsPanel.tsx ResultsPanel.tsx
    ruler/   DofRuler.tsx rulerScale.ts RulerFigures.tsx
    export/  useImageExport.ts
src/e2e/tools/dof-simulator.spec.ts
src/lib/i18n/messages/{31 locales}/tools/dof-simulator.json + education/dof-simulator.json
src/lib/data/education/content-dof.ts   EXISTING — rewrite skeleton
```

---

## Phase 1 — Math & data foundations

### Task 1: Tool-local sensor list with phone presets

**Files:**
- Create: `src/lib/data/dofSimulator/sensors.ts`
- Test: `src/lib/data/dofSimulator/sensors.test.ts`

**Interfaces:**
- Consumes: `SENSORS`, `SensorPreset` from `@/lib/data/sensors` (`{ id, name, cropFactor, w, h, color }`).
- Produces: `DOF_SENSORS: SensorPreset[]`, `getDofSensor(id: string): SensorPreset`, `sensorAspect(s: SensorPreset): number`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { DOF_SENSORS, getDofSensor, sensorAspect } from './sensors'

describe('DOF_SENSORS', () => {
  it('has unique ids', () => {
    const ids = DOF_SENSORS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('includes named phone presets', () => {
    expect(DOF_SENSORS.some((s) => s.id === 'iphone16pro')).toBe(true)
    expect(DOF_SENSORS.some((s) => s.id === 'pixel9pro')).toBe(true)
  })
  it('getDofSensor falls back to full frame', () => {
    expect(getDofSensor('nope').id).toBe('ff')
    expect(getDofSensor('iphone16pro').w).toBeCloseTo(9.8, 1)
  })
  it('sensorAspect gives 1.5 for FF, 4:3 for phones', () => {
    expect(sensorAspect(getDofSensor('ff'))).toBeCloseTo(1.5, 2)
    expect(sensorAspect(getDofSensor('iphone16pro'))).toBeCloseTo(4 / 3, 1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/dofSimulator/sensors.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Write implementation**

```ts
import { SENSORS } from '@/lib/data/sensors'
import type { SensorPreset } from '@/lib/types'

/** Named phone main-camera presets — tool-local so shared SENSORS (used by other tools) is untouched. */
export const PHONE_SENSORS: SensorPreset[] = [
  { id: 'iphone16pro', name: 'iPhone 16 Pro (main)', cropFactor: 3.67, w: 9.8, h: 7.3, color: '#64748b' },
  { id: 'pixel9pro', name: 'Pixel 9 Pro (main)', cropFactor: 3.7, w: 9.7, h: 7.3, color: '#94a3b8' },
]

export const DOF_SENSORS: SensorPreset[] = [...SENSORS, ...PHONE_SENSORS]

export function getDofSensor(id: string): SensorPreset {
  return DOF_SENSORS.find((s) => s.id === id) ?? SENSORS[3] // 'ff'
}

export function sensorAspect(s: SensorPreset): number {
  return s.w / s.h
}
```

- [ ] **Step 4: Run test to verify it passes** — same command, Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/lib/data/dofSimulator && git commit -m "feat(dof): tool-local sensor list with phone presets"`

### Task 2: Projection math

**Files:**
- Create: `src/lib/math/projection.ts`
- Test: `src/lib/math/projection.test.ts`

**Interfaces:**
- Produces (consumed by ModelLayer, framing, renderer):
  `frameHeightAtDistance(distanceM, focalLengthMm, sensorHMm): number` (mm),
  `figureFraction(subjectHeightM, distanceM, focalLengthMm, sensorHMm): number`,
  `type CropLevel = 'full' | 'torso' | 'face'`, `selectCropLevel(figureFrac): CropLevel`,
  `modelLayout(figurePx, viewportPx, eyeLineRatio): { heightPx: number; topPx: number }`,
  `blurMmToPx(blurMm, sensorWMm, viewportWPx): number`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { frameHeightAtDistance, figureFraction, selectCropLevel, modelLayout, blurMmToPx } from './projection'

describe('projection', () => {
  it('frame height: 85mm on FF at 3m shows ~847mm of scene', () => {
    expect(frameHeightAtDistance(3, 85, 24)).toBeCloseTo(847.06, 1)
  })
  it('returns 0 for non-positive inputs', () => {
    expect(frameHeightAtDistance(0, 85, 24)).toBe(0)
    expect(frameHeightAtDistance(3, 0, 24)).toBe(0)
  })
  it('figure fraction: 1.70m person at 3m, 85mm FF fills ~2x frame', () => {
    expect(figureFraction(1.7, 3, 85, 24)).toBeCloseTo(2.007, 2)
  })
  it('crop level thresholds', () => {
    expect(selectCropLevel(0.9)).toBe('full')
    expect(selectCropLevel(2.0)).toBe('torso')
    expect(selectCropLevel(3.5)).toBe('face')
  })
  it('small figure stands on bottom edge', () => {
    expect(modelLayout(300, 400, 0.1)).toEqual({ heightPx: 300, topPx: 100 })
  })
  it('large figure anchors eye line at 38% viewport height', () => {
    const l = modelLayout(2000, 400, 0.12)
    expect(l.topPx).toBeCloseTo(400 * 0.38 - 2000 * 0.12, 5)
  })
  it('blur mm→px scales by frame width', () => {
    expect(blurMmToPx(0.36, 36, 1000)).toBeCloseTo(10, 5)
    expect(blurMmToPx(1, 0, 1000)).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/lib/math/projection.test.ts`

- [ ] **Step 3: Write implementation**

```ts
/** Vertical scene height captured at the subject plane, in mm. */
export function frameHeightAtDistance(distanceM: number, focalLengthMm: number, sensorHMm: number): number {
  if (distanceM <= 0 || focalLengthMm <= 0 || sensorHMm <= 0) return 0
  return (sensorHMm * distanceM * 1000) / focalLengthMm
}

/** Subject height as a fraction of frame height (>1 = subject taller than frame). */
export function figureFraction(subjectHeightM: number, distanceM: number, focalLengthMm: number, sensorHMm: number): number {
  const frame = frameHeightAtDistance(distanceM, focalLengthMm, sensorHMm)
  return frame > 0 ? (subjectHeightM * 1000) / frame : 0
}

export type CropLevel = 'full' | 'torso' | 'face'

export function selectCropLevel(figureFrac: number): CropLevel {
  if (figureFrac > 3) return 'face'
  if (figureFrac > 1.3) return 'torso'
  return 'full'
}

const EYE_ANCHOR = 0.38 // eye line sits at 38% of viewport height when figure overflows

export interface ModelLayout { heightPx: number; topPx: number }

export function modelLayout(figurePx: number, viewportPx: number, eyeLineRatio: number): ModelLayout {
  if (figurePx <= viewportPx) return { heightPx: figurePx, topPx: viewportPx - figurePx }
  return { heightPx: figurePx, topPx: viewportPx * EYE_ANCHOR - figurePx * eyeLineRatio }
}

/** Defocus CoC on sensor (mm) → blur radius in viewport px. */
export function blurMmToPx(blurMm: number, sensorWMm: number, viewportWPx: number): number {
  return sensorWMm > 0 ? (blurMm / sensorWMm) * viewportWPx : 0
}
```

- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): projection math (frame height, crop levels, layout, blur px)"`

### Task 3: Framing solvers

**Files:**
- Create: `src/lib/math/framingSolver.ts`
- Test: `src/lib/math/framingSolver.test.ts`

**Interfaces:**
- Produces: `distanceForFraming(frameHeightMm, focalLengthMm, sensorHMm): number` (m), `flForFraming(frameHeightMm, distanceM, sensorHMm): number` (mm), `clampTo(value, min, max): { value: number; clamped: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { distanceForFraming, flForFraming, clampTo } from './framingSolver'
import { frameHeightAtDistance } from './projection'

describe('framingSolver', () => {
  it('face preset (320mm) at 85mm FF needs ~1.13m', () => {
    expect(distanceForFraming(320, 85, 24)).toBeCloseTo(1.133, 2)
  })
  it('round-trips with frameHeightAtDistance', () => {
    const d = distanceForFraming(700, 50, 24)
    expect(frameHeightAtDistance(d, 50, 24)).toBeCloseTo(700, 6)
  })
  it('solves FL to hold framing at fixed distance', () => {
    const fl = flForFraming(1700, 5, 24)
    expect(frameHeightAtDistance(5, fl, 24)).toBeCloseTo(1700, 6)
  })
  it('clampTo reports clamping', () => {
    expect(clampTo(500, 24, 300)).toEqual({ value: 300, clamped: true })
    expect(clampTo(0.1, 0.3, 25)).toEqual({ value: 0.3, clamped: true })
    expect(clampTo(50, 24, 300)).toEqual({ value: 50, clamped: false })
  })
})
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Write implementation**

```ts
/** Distance (m) that makes the vertical frame equal frameHeightMm at this FL/sensor. */
export function distanceForFraming(frameHeightMm: number, focalLengthMm: number, sensorHMm: number): number {
  return (frameHeightMm * focalLengthMm) / (sensorHMm * 1000)
}

/** Focal length (mm) that makes the vertical frame equal frameHeightMm at this distance/sensor. */
export function flForFraming(frameHeightMm: number, distanceM: number, sensorHMm: number): number {
  return (sensorHMm * distanceM * 1000) / frameHeightMm
}

export interface Clamped { value: number; clamped: boolean }

/** Clamp with report — the UI shows "limit reached" instead of drifting silently. */
export function clampTo(value: number, min: number, max: number): Clamped {
  if (value < min) return { value: min, clamped: true }
  if (value > max) return { value: max, clamped: true }
  return { value, clamped: false }
}
```

- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): framing solvers with clamp reporting"`

### Task 4: Two-sided defocus blur in dof.ts

**Files:**
- Modify: `src/lib/math/dof.ts` (append; read the whole file first — `calcDoF`, `calcBackgroundBlur`, `calcEquivalentSettings` already exist and are reused)
- Test: `src/lib/math/dof.test.ts` (append a describe block)

**Interfaces:**
- Produces: `calcDefocusBlur({ focalLength, aperture, focusDistance, targetDistance }): number` — CoC on sensor in mm, valid for targets nearer AND farther than focus. Consumed by ModelLayer (depth slices) and useDofDerived.

- [ ] **Step 1: Write the failing test** (append to `dof.test.ts`)

```ts
describe('calcDefocusBlur', () => {
  it('is zero at the focus plane', () => {
    expect(calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 3, targetDistance: 3 })).toBe(0)
  })
  it('approaches f²/(N·(s1−f)) for far targets', () => {
    const blur = calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 3, targetDistance: 10000 })
    expect(blur).toBeCloseTo((85 * 85) / (2.8 * (3000 - 85)), 2)
  })
  it('is positive for targets in FRONT of focus (nose nearer than eyes)', () => {
    const blur = calcDefocusBlur({ focalLength: 85, aperture: 1.4, focusDistance: 1.2, targetDistance: 1.15 })
    expect(blur).toBeGreaterThan(0)
  })
  it('front and behind blur are asymmetric (front is larger at equal offset)', () => {
    const front = calcDefocusBlur({ focalLength: 85, aperture: 1.4, focusDistance: 2, targetDistance: 1.9 })
    const behind = calcDefocusBlur({ focalLength: 85, aperture: 1.4, focusDistance: 2, targetDistance: 2.1 })
    expect(front).toBeGreaterThan(behind)
  })
  it('guards degenerate inputs', () => {
    expect(calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 0.05, targetDistance: 1 })).toBe(0)
    expect(calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 3, targetDistance: 0 })).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/lib/math/dof.test.ts`

- [ ] **Step 3: Write implementation** (append to `dof.ts`, match its existing param-object style)

```ts
export interface DefocusBlurParams {
  focalLength: number   // mm
  aperture: number      // f-number
  focusDistance: number // meters (subject / focus plane)
  targetDistance: number // meters (plane being evaluated)
}

/**
 * Defocus CoC on the sensor (mm) for a plane at targetDistance while focused
 * at focusDistance. Valid on BOTH sides of focus:
 *   blur = f²/(N·(s1−f)) · |s2−s1|/s2   (all distances in mm)
 */
export function calcDefocusBlur({ focalLength, aperture, focusDistance, targetDistance }: DefocusBlurParams): number {
  const s1 = focusDistance * 1000
  const s2 = targetDistance * 1000
  if (s1 <= focalLength || s2 <= 0 || aperture <= 0) return 0
  return ((focalLength * focalLength) / (aperture * (s1 - focalLength))) * (Math.abs(s2 - s1) / s2)
}
```

- [ ] **Step 4: Run to verify PASS** (whole file — pre-existing tests must stay green).
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): two-sided calcDefocusBlur for depth-slice rendering"`

### Task 5: Bokeh kernel generator

**Files:**
- Create: `src/lib/math/bokehKernel.ts`
- Test: `src/lib/math/bokehKernel.test.ts`

**Interfaces:**
- Produces: `type BokehShapeId = 'disc'|'blade5'|'blade6'|'blade7'|'blade8'|'blade9'|'cata'`, `TAP_COUNT = 64`, `generateKernel(shape, tapCount?, seed?): { x: number; y: number }[]`, `insideShape(x, y, shape): boolean`, `ngonVertices(n): { x: number; y: number }[]` (for the BokehInset SVG). Deterministic (seeded LCG — `Math.random` is banned so renders are reproducible).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generateKernel, insideShape, ngonVertices, TAP_COUNT } from './bokehKernel'

describe('bokehKernel', () => {
  it('produces exactly TAP_COUNT taps', () => {
    expect(generateKernel('disc')).toHaveLength(TAP_COUNT)
    expect(generateKernel('blade5')).toHaveLength(TAP_COUNT)
  })
  it('is deterministic for a given seed', () => {
    expect(generateKernel('blade7', TAP_COUNT, 7)).toEqual(generateKernel('blade7', TAP_COUNT, 7))
  })
  it('centroid is ~zero (no image shift)', () => {
    for (const shape of ['disc', 'blade6', 'cata'] as const) {
      const taps = generateKernel(shape)
      const cx = taps.reduce((a, t) => a + t.x, 0) / taps.length
      const cy = taps.reduce((a, t) => a + t.y, 0) / taps.length
      expect(Math.abs(cx)).toBeLessThan(1e-9)
      expect(Math.abs(cy)).toBeLessThan(1e-9)
    }
  })
  it('taps stay within unit-ish radius after recentering', () => {
    const taps = generateKernel('blade5')
    expect(Math.max(...taps.map((t) => Math.hypot(t.x, t.y)))).toBeLessThanOrEqual(1.25)
  })
  it('insideShape: annulus excludes the center', () => {
    expect(insideShape(0, 0, 'cata')).toBe(false)
    expect(insideShape(0.85, 0, 'cata')).toBe(true)
    expect(insideShape(0, 0, 'disc')).toBe(true)
  })
  it('ngonVertices returns n points on the unit circle', () => {
    const v = ngonVertices(6)
    expect(v).toHaveLength(6)
    for (const p of v) expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 6)
  })
})
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Write implementation**

```ts
export type BokehShapeId = 'disc' | 'blade5' | 'blade6' | 'blade7' | 'blade8' | 'blade9' | 'cata'
export interface Tap { x: number; y: number }
export const TAP_COUNT = 64
const CATA_INNER_R2 = 0.45 // catadioptric annulus inner radius²

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000 }
}

export function ngonVertices(n: number): Tap[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return { x: Math.cos(a), y: Math.sin(a) }
  })
}

function insideNgon(x: number, y: number, n: number): boolean {
  const v = ngonVertices(n)
  for (let i = 0; i < n; i++) {
    const a = v[i], b = v[(i + 1) % n]
    if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) return false
  }
  return true
}

export function insideShape(x: number, y: number, shape: BokehShapeId): boolean {
  const r2 = x * x + y * y
  if (shape === 'disc') return r2 <= 1
  if (shape === 'cata') return r2 <= 1 && r2 >= CATA_INNER_R2
  return insideNgon(x, y, Number(shape.slice(5)))
}

/** Rejection-sampled taps inside the aperture shape, recentered to zero centroid. */
export function generateKernel(shape: BokehShapeId, tapCount = TAP_COUNT, seed = 7): Tap[] {
  const rand = lcg(seed)
  const taps: Tap[] = []
  while (taps.length < tapCount) {
    const x = rand() * 2 - 1
    const y = rand() * 2 - 1
    if (insideShape(x, y, shape)) taps.push({ x, y })
  }
  const cx = taps.reduce((a, t) => a + t.x, 0) / tapCount
  const cy = taps.reduce((a, t) => a + t.y, 0) / tapCount
  return taps.map((t) => ({ x: t.x - cx, y: t.y - cy }))
}
```

- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): seeded Poisson bokeh kernel (disc, blades, catadioptric)"`

### Task 6: Schema types + static data (framing, bokeh, teleconverters)

**Files:**
- Create: `src/lib/data/dofSimulator/types.ts`, `framing.ts`, `bokeh.ts`, `teleconverters.ts`
- Test: `src/lib/data/dofSimulator/staticData.test.ts`

**Interfaces:**
- Produces (the canonical schema — every later task imports from here):

```ts
// types.ts — full content
import type { CropLevel } from '@/lib/math/projection'
import type { BokehShapeId } from '@/lib/math/bokehKernel'

export interface DofCamera { id: string; brand: string; model: string; sensorId: string }
export interface DofLens {
  id: string; brand: string; model: string
  flMin: number; flMax: number            // mm
  apMaxWide: number; apMaxTele: number    // widest f-number at flMin / flMax
  apMin: number                           // narrowest f-number (e.g. 16 or 22)
  minFocusM?: number                      // minimum focus distance, meters
}
export type TeleconverterId = 'none' | 'tc14' | 'tc20'
export interface Teleconverter { id: TeleconverterId; flFactor: number; stopsLost: number }
export interface SubjectSlice { src: string; depthOffsetMm: number } // negative = toward camera
export interface SubjectCrop { src: string; assetPxHeight: number; eyeLineRatio: number; slices: SubjectSlice[] }
export interface DofSubject { id: string; name: string; heightM: number; crops: Record<CropLevel, SubjectCrop> }
export interface DofBackground {
  id: string; name: string; distanceM: number
  srcLandscape: string; srcPortrait: string; highlightRich: boolean
}
export interface FramingPresetDef { key: 'face' | 'portrait' | 'medium' | 'american' | 'full'; frameHeightMm: number }
export type { BokehShapeId, CropLevel }
```

```ts
// framing.ts — full content
import type { FramingPresetDef } from './types'
export const FRAMING_PRESETS: FramingPresetDef[] = [
  { key: 'face', frameHeightMm: 320 },
  { key: 'portrait', frameHeightMm: 480 },
  { key: 'medium', frameHeightMm: 700 },
  { key: 'american', frameHeightMm: 1000 },
  { key: 'full', frameHeightMm: 1700 },
]
```

```ts
// bokeh.ts — full content
import type { BokehShapeId } from './types'
export const BOKEH_SHAPE_IDS: BokehShapeId[] = ['disc', 'blade5', 'blade6', 'blade7', 'blade8', 'blade9', 'cata']
```

```ts
// teleconverters.ts — full content
import type { Teleconverter } from './types'
export const TELECONVERTERS: Teleconverter[] = [
  { id: 'none', flFactor: 1, stopsLost: 0 },
  { id: 'tc14', flFactor: 1.4, stopsLost: 1 },
  { id: 'tc20', flFactor: 2, stopsLost: 2 },
]
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { FRAMING_PRESETS } from './framing'
import { BOKEH_SHAPE_IDS } from './bokeh'
import { TELECONVERTERS } from './teleconverters'

describe('dofSimulator static data', () => {
  it('framing presets ascend from face to full', () => {
    const heights = FRAMING_PRESETS.map((p) => p.frameHeightMm)
    expect(heights).toEqual([...heights].sort((a, b) => a - b))
    expect(FRAMING_PRESETS[0]).toEqual({ key: 'face', frameHeightMm: 320 })
    expect(FRAMING_PRESETS[4]).toEqual({ key: 'full', frameHeightMm: 1700 })
  })
  it('exposes all 7 bokeh shapes', () => {
    expect(BOKEH_SHAPE_IDS).toHaveLength(7)
    expect(BOKEH_SHAPE_IDS).toContain('cata')
  })
  it('teleconverters multiply FL and cost stops', () => {
    expect(TELECONVERTERS.find((t) => t.id === 'tc14')).toEqual({ id: 'tc14', flFactor: 1.4, stopsLost: 1 })
    expect(TELECONVERTERS.find((t) => t.id === 'tc20')?.stopsLost).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify FAIL.** — **Step 3:** create the four files with the exact content above. — **Step 4: Run to verify PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): schema types + framing/bokeh/teleconverter data"`

### Task 7: Camera database (seed + validation)

**Files:**
- Create: `src/lib/data/dofSimulator/cameras/index.ts` + one file per brand: `canon.ts`, `nikon.ts`, `sony.ts`, `fujifilm.ts`, `panasonic.ts`, `om-system.ts`, `leica.ts`, `pentax.ts`
- Test: `src/lib/data/dofSimulator/cameras/cameras.test.ts`

**Interfaces:**
- Produces: `DOF_CAMERAS: DofCamera[]` (sorted brand then model), `getCameraById(id: string): DofCamera | undefined`, `CAMERA_BRANDS: string[]`.

**Seeding rule:** each brand file lists that brand's current + previous generation ILC bodies (mirrorless first, notable DSLRs), minimum 8 per major brand (Canon/Nikon/Sony/Fujifilm), 4+ for the rest — compiled from public spec facts. `sensorId` must exist in `DOF_SENSORS` (Task 1). Breadth to ~300 happens in Task 26's parallel content fill; this task establishes correctness. Example rows (exact format — ids are `brand-model` kebab-case):

```ts
// nikon.ts
import type { DofCamera } from '../types'
export const NIKON_CAMERAS: DofCamera[] = [
  { id: 'nikon-z9', brand: 'Nikon', model: 'Z9', sensorId: 'ff' },
  { id: 'nikon-z8', brand: 'Nikon', model: 'Z8', sensorId: 'ff' },
  { id: 'nikon-z6-iii', brand: 'Nikon', model: 'Z6 III', sensorId: 'ff' },
  { id: 'nikon-z5-ii', brand: 'Nikon', model: 'Z5 II', sensorId: 'ff' },
  { id: 'nikon-z7-ii', brand: 'Nikon', model: 'Z7 II', sensorId: 'ff' },
  { id: 'nikon-zf', brand: 'Nikon', model: 'Zf', sensorId: 'ff' },
  { id: 'nikon-z50-ii', brand: 'Nikon', model: 'Z50 II', sensorId: 'apsc_n' },
  { id: 'nikon-zfc', brand: 'Nikon', model: 'Z fc', sensorId: 'apsc_n' },
  { id: 'nikon-d850', brand: 'Nikon', model: 'D850', sensorId: 'ff' },
]
```

```ts
// index.ts
import type { DofCamera } from '../types'
import { CANON_CAMERAS } from './canon'
import { NIKON_CAMERAS } from './nikon'
import { SONY_CAMERAS } from './sony'
import { FUJIFILM_CAMERAS } from './fujifilm'
import { PANASONIC_CAMERAS } from './panasonic'
import { OM_SYSTEM_CAMERAS } from './om-system'
import { LEICA_CAMERAS } from './leica'
import { PENTAX_CAMERAS } from './pentax'

export const DOF_CAMERAS: DofCamera[] = [
  ...CANON_CAMERAS, ...NIKON_CAMERAS, ...SONY_CAMERAS, ...FUJIFILM_CAMERAS,
  ...PANASONIC_CAMERAS, ...OM_SYSTEM_CAMERAS, ...LEICA_CAMERAS, ...PENTAX_CAMERAS,
].sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model))

export const CAMERA_BRANDS: string[] = [...new Set(DOF_CAMERAS.map((c) => c.brand))]

export function getCameraById(id: string): DofCamera | undefined {
  return DOF_CAMERAS.find((c) => c.id === id)
}
```

- [ ] **Step 1: Write the failing validation test**

```ts
import { describe, it, expect } from 'vitest'
import { DOF_CAMERAS, getCameraById, CAMERA_BRANDS } from './index'
import { DOF_SENSORS } from '../sensors'

describe('camera DB validation', () => {
  it('has unique ids', () => {
    const ids = DOF_CAMERAS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every sensorId resolves to a real sensor', () => {
    const sensorIds = new Set(DOF_SENSORS.map((s) => s.id))
    for (const cam of DOF_CAMERAS) expect(sensorIds, `${cam.id} → ${cam.sensorId}`).toContain(cam.sensorId)
  })
  it('ids follow brand-model kebab-case', () => {
    for (const cam of DOF_CAMERAS) expect(cam.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)+$/)
  })
  it('meets seed minimums', () => {
    const count = (brand: string) => DOF_CAMERAS.filter((c) => c.brand === brand).length
    for (const brand of ['Canon', 'Nikon', 'Sony', 'Fujifilm']) expect(count(brand)).toBeGreaterThanOrEqual(8)
    expect(CAMERA_BRANDS.length).toBeGreaterThanOrEqual(8)
  })
})
```

- [ ] **Step 2: Run to verify FAIL.** — **Step 3:** write all 8 brand files (spec facts only: body name + sensor format) + index. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): camera database seed with CI validation"`

### Task 8: Lens database (seed + validation + aperture interpolation)

**Files:**
- Create: `src/lib/data/dofSimulator/lenses/index.ts` + brand files: `canon.ts`, `nikon.ts`, `sony.ts`, `fujifilm.ts`, `sigma.ts`, `tamron.ts`, `panasonic.ts`, `om-system.ts`
- Test: `src/lib/data/dofSimulator/lenses/lenses.test.ts`

**Interfaces:**
- Produces: `DOF_LENSES: DofLens[]`, `LENS_BRANDS: string[]`, `getLensById(id): DofLens | undefined`, `maxApertureAt(lens: DofLens, fl: number): number` (linear-in-stops interpolation — documented approximation).

**Seeding rule:** ≥6 lenses per brand file covering primes + standard zooms, `minFocusM` populated where commonly known. Example rows:

```ts
// nikon.ts
import type { DofLens } from '../types'
export const NIKON_LENSES: DofLens[] = [
  { id: 'nikkor-z-85mm-f1-8-s', brand: 'Nikon', model: 'NIKKOR Z 85mm f/1.8 S', flMin: 85, flMax: 85, apMaxWide: 1.8, apMaxTele: 1.8, apMin: 16, minFocusM: 0.8 },
  { id: 'nikkor-z-24-70mm-f2-8-s', brand: 'Nikon', model: 'NIKKOR Z 24-70mm f/2.8 S', flMin: 24, flMax: 70, apMaxWide: 2.8, apMaxTele: 2.8, apMin: 22, minFocusM: 0.38 },
  { id: 'nikkor-z-dx-16-50mm-f3-5-6-3', brand: 'Nikon', model: 'NIKKOR Z DX 16-50mm f/3.5-6.3 VR', flMin: 16, flMax: 50, apMaxWide: 3.5, apMaxTele: 6.3, apMin: 22, minFocusM: 0.2 },
]
```

```ts
// index.ts — aggregation identical in shape to cameras/index.ts, plus:
export function maxApertureAt(lens: DofLens, fl: number): number {
  if (lens.flMax === lens.flMin) return lens.apMaxWide
  const t = Math.min(Math.max((fl - lens.flMin) / (lens.flMax - lens.flMin), 0), 1)
  const stopsW = Math.log2(lens.apMaxWide * lens.apMaxWide)
  const stopsT = Math.log2(lens.apMaxTele * lens.apMaxTele)
  return Math.sqrt(2 ** (stopsW + (stopsT - stopsW) * t)) // linear in stops (approximation; real lenses step)
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { DOF_LENSES, getLensById, maxApertureAt } from './index'

describe('lens DB validation', () => {
  it('has unique ids and sane ranges', () => {
    const ids = DOF_LENSES.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of DOF_LENSES) {
      expect(l.flMin, l.id).toBeGreaterThanOrEqual(4)
      expect(l.flMax, l.id).toBeLessThanOrEqual(2000)
      expect(l.flMax).toBeGreaterThanOrEqual(l.flMin)
      expect(l.apMaxWide, l.id).toBeGreaterThanOrEqual(0.7)
      expect(l.apMin, l.id).toBeLessThanOrEqual(64)
      expect(l.apMin).toBeGreaterThan(l.apMaxTele)
      if (l.minFocusM !== undefined) expect(l.minFocusM).toBeGreaterThan(0)
    }
  })
  it('constant-aperture zoom stays constant', () => {
    const l = getLensById('nikkor-z-24-70mm-f2-8-s')!
    expect(maxApertureAt(l, 24)).toBeCloseTo(2.8, 5)
    expect(maxApertureAt(l, 50)).toBeCloseTo(2.8, 5)
  })
  it('variable zoom interpolates in stops', () => {
    const l = getLensById('nikkor-z-dx-16-50mm-f3-5-6-3')!
    expect(maxApertureAt(l, 16)).toBeCloseTo(3.5, 5)
    expect(maxApertureAt(l, 50)).toBeCloseTo(6.3, 5)
    const mid = maxApertureAt(l, 33)
    expect(mid).toBeGreaterThan(3.5)
    expect(mid).toBeLessThan(6.3)
  })
  it('clamps FL outside the lens range', () => {
    const l = getLensById('nikkor-z-dx-16-50mm-f3-5-6-3')!
    expect(maxApertureAt(l, 8)).toBeCloseTo(3.5, 5)
    expect(maxApertureAt(l, 300)).toBeCloseTo(6.3, 5)
  })
})
```

- [ ] **Step 2: Run to verify FAIL.** — **Step 3:** write brand files + index. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): lens database seed with stop-interpolated max aperture"`

---

## Phase 2 — Assets (AI-generated, original)

### Task 9: Asset processing scripts (cutout + slice compositor)

**Files:**
- Create: `scripts/dof-assets/cutout.mjs`, `scripts/dof-assets/slice.mjs`, `scripts/dof-assets/README.md`
- Modify: `package.json` (add `sharp` to devDependencies via `npm i -D sharp`)

**Interfaces:**
- Produces CLI tools consumed by Tasks 10–11:
  `node scripts/dof-assets/cutout.mjs <in.png> <out.webp>` — chroma-key `#00FF00` background → transparent WebP with despill + feathered edge.
  `node scripts/dof-assets/slice.mjs <cutout.webp> <mask.svg> <out.webp>` — applies an SVG alpha mask (dest-in) to produce one depth-slice layer.

- [ ] **Step 1: Write cutout.mjs**

```js
import sharp from 'sharp'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) { console.error('usage: cutout.mjs <in> <out.webp>'); process.exit(1) }

const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  if (g > 150 && g > r * 1.5 && g > b * 1.5) {
    data[i + 3] = 0 // key out green
  } else if (g > Math.max(r, b)) {
    data[i + 1] = Math.max(r, b) // despill green fringe on kept pixels
  }
}
// 1px alpha feather: box-blur only the alpha channel
const alpha = await sharp(data, { raw: info }).extractChannel(3).blur(1).toBuffer()
for (let i = 0; i < alpha.length; i++) data[i * 4 + 3] = Math.min(data[i * 4 + 3], alpha[i])
await sharp(data, { raw: info }).webp({ quality: 90, alphaQuality: 90 }).toFile(outPath)
console.log('wrote', outPath)
```

- [ ] **Step 2: Write slice.mjs**

```js
import sharp from 'sharp'

const [, , inPath, maskPath, outPath] = process.argv
if (!inPath || !maskPath || !outPath) { console.error('usage: slice.mjs <in.webp> <mask.svg> <out.webp>'); process.exit(1) }

const { width, height } = await sharp(inPath).metadata()
const mask = await sharp(maskPath).resize(width, height).png().toBuffer()
await sharp(inPath)
  .composite([{ input: mask, blend: 'dest-in' }])
  .webp({ quality: 90, alphaQuality: 90 })
  .toFile(outPath)
console.log('wrote', outPath)
```

- [ ] **Step 3: Verify on a synthetic fixture** — create a 100×100 green PNG with a red square via `sharp` one-liner (`node -e "..."`), run cutout, assert output has transparent corners (`node -e` reading alpha at 1,1). Expected: alpha 0 at corners, 255 in the square.
- [ ] **Step 4: Write README.md** documenting both commands, the `#00FF00` convention, and mask authoring (SVG: white = keep, black = drop, feathered with `<feGaussianBlur stdDeviation="6">` on the shape edge).
- [ ] **Step 5: Commit** — `git add scripts/dof-assets package.json package-lock.json && git commit -m "feat(dof): asset cutout + slice compositor scripts"`

### Task 10: Generate 8 subjects + models.ts manifests

**Files:**
- Create: `public/dof/subjects/{id}/` asset sets, `scripts/dof-assets/masks/*.svg`, `src/lib/data/dofSimulator/models.ts`
- Test: `src/lib/data/dofSimulator/models.test.ts`

**Interfaces:**
- Produces: `DOF_SUBJECTS: DofSubject[]` (8 entries), `getSubjectById(id): DofSubject` (falls back to first).

**Subject roster (ids, heights, art direction):** `woman-a` 1.70, `man-a` 1.85, `woman-b` 1.60, `man-b` 1.75, `girl-a` 1.15 (child), `boy-a` 1.30 (child), `teen-a` 1.45, `man-c` 1.90. Professional, realistic, editorial-photo style; varied wardrobe/ethnicity; neutral confident poses; consistent soft frontal daylight.

**Generation procedure per subject (uses the `generate_image` / `edit_image` MCP tools):**

1. Master: `generate_image` size **4K**, prompt template — "Full-body professional portrait of [description], standing, facing camera, relaxed confident pose, arms at sides, photorealistic editorial photography style, soft diffused frontal daylight, sharp focus head to toe, entire body visible with margin, plain solid pure green background (#00FF00), no shadows on background". Save as `master-{id}.png`.
2. `node scripts/dof-assets/cutout.mjs master-{id}.png public/dof/subjects/{id}/full.webp`
3. Torso: `edit_image` with the master as input — "Crop to a torso-up composition of the SAME person, identical face, wardrobe and lighting, re-render at high detail, plain solid pure green background (#00FF00)", size 4K → cutout → `torso.webp`.
4. Face: `edit_image` with the master as input — "Tight head-and-shoulders portrait of the SAME person, identical face and lighting, re-render at maximum facial detail, plain solid pure green background (#00FF00)", size 4K → cutout → `face.webp`.
5. Slice masks: author per-subject SVGs in `scripts/dof-assets/masks/` — `face-near.svg` (nose/front-face ellipse), `face-mid.svg` (eye-plane band, inverse-overlapping near by ~8%), `face-far.svg` (ears/hair/shoulders remainder); `torso-near.svg` (head+chest), `torso-far.svg` (remainder). All edges feathered (`feGaussianBlur stdDeviation="6"`). Run `slice.mjs` to emit `face-near.webp`, `face-mid.webp`, `face-far.webp`, `torso-near.webp`, `torso-far.webp` per subject.
6. Record measured `assetPxHeight` and visually-measured `eyeLineRatio` (eye Y ÷ image height) into the manifest row.
7. Visual QA: render all 8 side by side (open the files); reject any subject whose style/lighting deviates; regenerate before proceeding.

**Depth offsets (same for all subjects):** face slices −40mm (near), 0 (mid), +90mm (far); torso slices 0 (near), +120mm (far); full crop = single slice at 0.

- [ ] **Step 1: Write the failing manifest test**

```ts
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DOF_SUBJECTS, getSubjectById } from './models'

const PUB = join(process.cwd(), 'public')

describe('subject manifests', () => {
  it('has 8 subjects with unique ids and sane heights', () => {
    expect(DOF_SUBJECTS).toHaveLength(8)
    expect(new Set(DOF_SUBJECTS.map((s) => s.id)).size).toBe(8)
    for (const s of DOF_SUBJECTS) {
      expect(s.heightM).toBeGreaterThanOrEqual(0.9)
      expect(s.heightM).toBeLessThanOrEqual(2.0)
    }
  })
  it('every asset file exists on disk', () => {
    for (const s of DOF_SUBJECTS) {
      for (const level of ['full', 'torso', 'face'] as const) {
        const crop = s.crops[level]
        expect(existsSync(join(PUB, crop.src)), crop.src).toBe(true)
        expect(crop.eyeLineRatio).toBeGreaterThan(0)
        expect(crop.eyeLineRatio).toBeLessThan(1)
        for (const slice of crop.slices) expect(existsSync(join(PUB, slice.src)), slice.src).toBe(true)
      }
    }
  })
  it('slice depth offsets are ordered near→far', () => {
    for (const s of DOF_SUBJECTS) {
      const offsets = s.crops.face.slices.map((x) => x.depthOffsetMm)
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
    }
  })
  it('falls back to the first subject', () => {
    expect(getSubjectById('nope').id).toBe(DOF_SUBJECTS[0].id)
  })
})
```

- [ ] **Step 2: Run to verify FAIL.**
- [ ] **Step 3: Generate assets** per the procedure (8 subjects × [master, torso, face] + slices). Keep each `full.webp` under 250 KB (resize to max 2600px height before webp if needed); `face.webp` may be up to 350 KB.
- [ ] **Step 4: Write `models.ts`** — manifest rows following the `DofSubject` schema exactly; `src` paths are `/dof/subjects/{id}/{file}.webp`; face slices `[{src: .../face-near.webp, depthOffsetMm: -40}, {..., 0}, {..., 90}]`, torso `[0, 120]`, full single slice `[{src: full.webp, depthOffsetMm: 0}]` (the crop's own src doubles as its only slice). Export `getSubjectById` with first-entry fallback. Run test → PASS.
- [ ] **Step 5: Commit** — `git add public/dof/subjects scripts/dof-assets/masks src/lib/data/dofSimulator && git commit -m "feat(dof): 8 AI-generated subjects with crop levels + depth slices"`

### Task 11: Generate 8 backgrounds + backgrounds.ts

**Files:**
- Create: `public/dof/backgrounds/*.webp` (16 images), `src/lib/data/dofSimulator/backgrounds.ts`
- Test: `src/lib/data/dofSimulator/backgrounds.test.ts`

**Interfaces:**
- Produces: `DOF_BACKGROUNDS: DofBackground[]` (8), `getBackgroundById(id): DofBackground` (first-entry fallback).

**Scene roster:** `city-skyline` (300m, highlightRich), `old-town-street` (25m, highlightRich), `mountains` (2000m), `park` (40m), `autumn-tree` (15m), `cathedral` (60m), `modern-building` (80m), `night-lights` (50m, highlightRich — the bokeh showcase).

**Generation per scene:** `generate_image` size 2K, one landscape one portrait, prompt — "[scene description], photographed from eye level, no people in frame, generous margins on all sides for cropping (wide overscan composition), consistent warm neutral color grade, realistic photographic style". For `night-lights`: "defocused-friendly night city scene with many small bright point lights, signs and lanterns". Convert: `npx sharp-cli` not needed — save PNG then `node -e` with sharp: resize longest edge 2048, `.webp({ quality: 82 })` → `{id}-landscape.webp` / `{id}-portrait.webp`. Keep each ≤ 300 KB.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DOF_BACKGROUNDS, getBackgroundById } from './backgrounds'

describe('background manifests', () => {
  it('has 8 scenes, unique ids, at least 3 highlight-rich', () => {
    expect(DOF_BACKGROUNDS).toHaveLength(8)
    expect(new Set(DOF_BACKGROUNDS.map((b) => b.id)).size).toBe(8)
    expect(DOF_BACKGROUNDS.filter((b) => b.highlightRich).length).toBeGreaterThanOrEqual(3)
  })
  it('every image exists and distances are positive', () => {
    for (const b of DOF_BACKGROUNDS) {
      expect(existsSync(join(process.cwd(), 'public', b.srcLandscape)), b.srcLandscape).toBe(true)
      expect(existsSync(join(process.cwd(), 'public', b.srcPortrait)), b.srcPortrait).toBe(true)
      expect(b.distanceM).toBeGreaterThan(0)
    }
  })
  it('falls back to the first background', () => {
    expect(getBackgroundById('nope').id).toBe(DOF_BACKGROUNDS[0].id)
  })
})
```

- [ ] **Step 2: FAIL.** — **Step 3:** generate + convert the 16 images. — **Step 4:** write `backgrounds.ts` (schema rows, `/dof/backgrounds/...` paths) → PASS.
- [ ] **Step 5: Commit** — `git add public/dof/backgrounds src/lib/data/dofSimulator && git commit -m "feat(dof): 8 AI-generated backgrounds (landscape+portrait)"`

---

## Phase 3 — State

### Task 12: Control state slices

**Files:**
- Create: `_components/state/useOptics.ts`, `useAppearance.ts`, `useFraming.ts`, `useUiPrefs.ts` (all under `src/app/[locale]/dof-simulator/`)
- Test: `_components/state/controlSlices.test.tsx`

**Interfaces (exact — later tasks depend on these names):**

```ts
// useOptics.ts
export interface OpticsState {
  focalLength: number; aperture: number; distanceM: number
  sensorId: string; cameraId: string | null; lensId: string | null
  teleconverterId: TeleconverterId
  customCocMm: number | null            // advanced override
  backgroundDistanceM: number | null    // advanced override (null = scene default)
}
export interface OpticsApi extends OpticsState {
  setFocalLength(v: number): void; setAperture(v: number): void; setDistanceM(v: number): void
  setSensorId(v: string): void; setCameraId(v: string | null): void; setLensId(v: string | null): void
  setTeleconverterId(v: TeleconverterId): void
  setCustomCocMm(v: number | null): void; setBackgroundDistanceM(v: number | null): void
}
export function useOptics(): OpticsApi
// defaults: fl 85, f/2.8, 3m, 'ff', nulls, 'none'.
// setCameraId(id) ALSO sets sensorId from the camera row (getCameraById).
// setLensId(id) ALSO clamps focalLength into [flMin, flMax] and aperture to ≥ maxApertureAt(lens, fl).
```

```ts
// useAppearance.ts
export interface AppearanceApi {
  subjectId: string; backgroundId: string; orientation: 'landscape' | 'portrait'
  setSubjectId(v: string): void; setBackgroundId(v: string): void
  setOrientation(v: 'landscape' | 'portrait'): void
}
export function useAppearance(): AppearanceApi // defaults: first subject, first background, 'landscape'
```

```ts
// useFraming.ts
export interface FramingApi {
  activePreset: FramingPresetDef['key'] | null
  lockFov: boolean
  lockedFrameHeightMm: number | null
  setActivePreset(v: FramingPresetDef['key'] | null): void
  setLockFov(v: boolean): void
  setLockedFrameHeightMm(v: number | null): void
}
export function useFraming(): FramingApi // defaults: null, false, null
```

```ts
// useUiPrefs.ts — persisted to localStorage 'phototools.dof.uiprefs.v1' (try/catch both ways)
export interface UiPrefsApi {
  advanced: boolean; imperial: boolean
  setAdvanced(v: boolean): void; setImperial(v: boolean): void
}
export function useUiPrefs(): UiPrefsApi
```

- [ ] **Step 1: Write the failing test** — `renderHook` from `@testing-library/react`:

```tsx
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptics } from './useOptics'
import { useFraming } from './useFraming'

describe('useOptics', () => {
  it('has spec defaults', () => {
    const { result } = renderHook(() => useOptics())
    expect(result.current.focalLength).toBe(85)
    expect(result.current.aperture).toBe(2.8)
    expect(result.current.distanceM).toBe(3)
    expect(result.current.sensorId).toBe('ff')
  })
  it('selecting a camera adopts its sensor', () => {
    const { result } = renderHook(() => useOptics())
    act(() => result.current.setCameraId('nikon-z50-ii'))
    expect(result.current.sensorId).toBe('apsc_n')
  })
  it('selecting a lens clamps FL and aperture into its envelope', () => {
    const { result } = renderHook(() => useOptics())
    act(() => result.current.setAperture(1.2))
    act(() => result.current.setLensId('nikkor-z-dx-16-50mm-f3-5-6-3'))
    expect(result.current.focalLength).toBe(50) // 85 clamped to flMax
    expect(result.current.aperture).toBeGreaterThanOrEqual(6.3)
  })
})

describe('useFraming', () => {
  it('starts unlocked with no preset', () => {
    const { result } = renderHook(() => useFraming())
    expect(result.current.activePreset).toBeNull()
    expect(result.current.lockFov).toBe(false)
  })
})
```

- [ ] **Step 2: FAIL.** — **Step 3:** implement the four hooks exactly to the interfaces (plain `useState` bundles; the camera/lens side-effects live inside the setters). — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): control state slices"`

### Task 13: Saved settings store + hook

**Files:**
- Create: `_components/state/savedSettingsStore.ts`, `_components/state/useSavedSettings.ts`
- Test: `_components/state/savedSettings.test.ts`

**Interfaces:**

```ts
// savedSettingsStore.ts — pure, storage injected for testability
export interface SavedRow {
  id: string                 // crypto.randomUUID()
  cameraLabel: string        // e.g. "Full Frame" or "Nikon Z8"
  focalLength: number; aperture: number; distanceM: number
  bokeh: BokehShapeId
}
export const SAVED_KEY = 'phototools.dof.saved.v1'
export const SAVED_CAP = 20
export function loadRows(storage: Pick<Storage, 'getItem'>): SavedRow[]        // [] on missing/corrupt/version mismatch
export function persistRows(storage: Pick<Storage, 'setItem'>, rows: SavedRow[]): boolean // false on quota/error
// stored shape: { v: 1, rows: SavedRow[] }

// useSavedSettings.ts
export interface SavedSettingsApi {
  rows: SavedRow[]
  addRow(row: Omit<SavedRow, 'id'>): void   // prepends; drops overflow past SAVED_CAP
  removeRow(id: string): void
  sortBy(key: 'cameraLabel' | 'focalLength' | 'aperture' | 'distanceM'): void
}
export function useSavedSettings(): SavedSettingsApi // uses window.localStorage, falls back to in-memory on error
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { loadRows, persistRows, SAVED_KEY } from './savedSettingsStore'

function memStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    dump: () => m,
  }
}

describe('savedSettingsStore', () => {
  it('round-trips rows', () => {
    const s = memStorage()
    const rows = [{ id: 'a', cameraLabel: 'Full Frame', focalLength: 85, aperture: 1.4, distanceM: 3, bokeh: 'disc' as const }]
    expect(persistRows(s, rows)).toBe(true)
    expect(loadRows(s)).toEqual(rows)
  })
  it('returns [] for corrupt or wrong-version payloads', () => {
    expect(loadRows(memStorage({ [SAVED_KEY]: 'not json' }))).toEqual([])
    expect(loadRows(memStorage({ [SAVED_KEY]: JSON.stringify({ v: 99, rows: [{}] }) }))).toEqual([])
  })
  it('reports persistence failure instead of throwing', () => {
    const bad = { setItem: () => { throw new Error('quota') } }
    expect(persistRows(bad, [])).toBe(false)
  })
})
```

- [ ] **Step 2: FAIL.** — **Step 3:** implement store (JSON parse in try/catch, validate `v === 1` and `Array.isArray(rows)`), then the hook (initialize from `loadRows`, persist on change, in-memory fallback flag when `persistRows` returns false). — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): versioned saved-settings store"`

### Task 14: Derived values, A/B slice, query schema, facade

**Files:**
- Create: `_components/state/useDofDerived.ts`, `useAbCompare.ts`, `paramSchema.ts`, `useDofState.ts`
- Test: `_components/state/derived.test.ts`

**Interfaces:**

```ts
// useDofDerived.ts — pure function + memo hook wrapper
export interface DerivedInput {
  optics: OpticsState
  subject: DofSubject; background: DofBackground
  orientation: 'landscape' | 'portrait'
  bokeh: BokehShapeId
}
export interface DofDerived {
  sensor: SensorPreset; sensorWMm: number; sensorHMm: number   // orientation-swapped
  effectiveFl: number                                          // fl × TC factor
  effectiveMaxAperture: number | null                          // from lens (TC stops applied), null w/o lens
  cocMm: number                                                // customCocMm ?? 0.03/cropFactor
  dof: ReturnType<typeof calcDoF>                              // near/far/total/hyperfocal
  backgroundBlurMm: number; backgroundBlurPct: number          // calcDefocusBlur at background distance
  figureFrac: number; cropLevel: CropLevel
  equivalent: ReturnType<typeof calcEquivalentSettings> | null // vs full frame; null when sensor is FF
  isDiffractionLimited: boolean
  belowMinFocus: boolean                                       // lens minFocusM violated
  inFrontM: number; behindM: number; inFrontPct: number        // DOF split around subject
}
export function computeDerived(input: DerivedInput): DofDerived
export function useDofDerived(input: DerivedInput): DofDerived  // useMemo over computeDerived

// useAbCompare.ts
export interface AbApi {
  mode: 'off' | 'wipe' | 'split'; setMode(m: AbApi['mode']): void
  activeSet: 'a' | 'b'; setActiveSet(v: 'a' | 'b'): void
  dividerPos: number; setDividerPos(v: number): void            // clamped 0.1–0.9
  b: OpticsApi                                                  // full second optics slice
}
export function useAbCompare(): AbApi

// paramSchema.ts — built from querySync util builders
export const PARAM_SCHEMA = {
  fl: numParam(85, 8, 1200), f: numParam(2.8, 0.7, 64), d: numParam(3, 0.1, 100),
  s: sensorParam('ff'), cam: strOrNullParam(), lens: strOrNullParam(),
  tc: strParam<TeleconverterId>('none', ['none', 'tc14', 'tc20']),
  subj: sensorParam('woman-a'), bg: sensorParam('city-skyline'),
  orient: strParam<'landscape' | 'portrait'>('landscape', ['landscape', 'portrait']),
  bokeh: strParam<BokehShapeId>('disc', BOKEH_SHAPE_IDS),  // from '@/lib/data/dofSimulator/bokeh'
  ab: strParam<'off' | 'wipe' | 'split'>('off', ['off', 'wipe', 'split']),
  b_fl: numParam(50, 8, 1200), b_f: numParam(5.6, 0.7, 64), b_d: numParam(3, 0.1, 100), b_s: sensorParam('ff'),
}
// FL bounds 8–1200 match the LensPanel slider range (Task 20) — keep them in sync.
// strOrNullParam(): ParamDef<string | null> with default null — define it here.

// useDofState.ts — the facade DofSimulator.tsx consumes
export interface DofStateApi {
  optics: OpticsApi; appearance: AppearanceApi; framing: FramingApi; uiPrefs: UiPrefsApi
  ab: AbApi; saved: SavedSettingsApi
  derived: DofDerived; derivedB: DofDerived | null              // null when ab off
  bokeh: BokehShapeId; setBokeh(v: BokehShapeId): void
  changeFocalLength(v: number): { clamped: boolean }            // honors lens envelope + lock-FOV re-solve
  changeDistance(v: number): { clamped: boolean }               // honors lock-FOV re-solve of FL
  applyFramingPreset(key: FramingPresetDef['key']): void        // solves DISTANCE at current FL (spec)
}
export function useDofState(): DofStateApi
// applyFramingPreset: d = distanceForFraming(preset.frameHeightMm, effectiveFl, sensorHMm),
//   clamped to [0.1, 100]; sets activePreset + lockedFrameHeightMm.
// changeFocalLength with lockFov && lockedFrameHeightMm: re-solve distance; clamp; if distance
//   clamps, keep framing honest by re-solving FL back from the clamped distance.
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { computeDerived } from './useDofDerived'
import { getSubjectById } from '@/lib/data/dofSimulator/models'
import { getBackgroundById } from '@/lib/data/dofSimulator/backgrounds'

const base = {
  optics: {
    focalLength: 85, aperture: 2.8, distanceM: 3, sensorId: 'ff', cameraId: null, lensId: null,
    teleconverterId: 'none' as const, customCocMm: null, backgroundDistanceM: null,
  },
  subject: getSubjectById('woman-a'), background: getBackgroundById('city-skyline'),
  orientation: 'landscape' as const, bokeh: 'disc' as const,
}

describe('computeDerived', () => {
  it('orientation swaps sensor dimensions', () => {
    expect(computeDerived(base).sensorHMm).toBe(24)
    expect(computeDerived({ ...base, orientation: 'portrait' }).sensorHMm).toBe(36)
  })
  it('teleconverter multiplies effective FL', () => {
    const d = computeDerived({ ...base, optics: { ...base.optics, teleconverterId: 'tc20' } })
    expect(d.effectiveFl).toBe(170)
  })
  it('custom CoC overrides the sensor-derived value', () => {
    const d = computeDerived({ ...base, optics: { ...base.optics, customCocMm: 0.05 } })
    expect(d.cocMm).toBe(0.05)
  })
  it('DOF split percentages sum to 100', () => {
    const d = computeDerived(base)
    expect(d.inFrontPct).toBeGreaterThan(0)
    expect(d.inFrontPct).toBeLessThan(100)
    expect(d.inFrontM + d.behindM).toBeCloseTo(d.dof.totalDoF, 3)
  })
  it('equivalent is null on FF and populated on crop', () => {
    expect(computeDerived(base).equivalent).toBeNull()
    const d = computeDerived({ ...base, optics: { ...base.optics, sensorId: 'apsc_n' } })
    expect(d.equivalent).not.toBeNull()
  })
  it('flags focus closer than the lens MFD', () => {
    const d = computeDerived({ ...base, optics: { ...base.optics, lensId: 'nikkor-z-85mm-f1-8-s', distanceM: 0.5 } })
    expect(d.belowMinFocus).toBe(true)
  })
})
```

- [ ] **Step 2: FAIL.** — **Step 3:** implement `computeDerived` (compose `getDofSensor`, `calcDoF`, `calcDefocusBlur`, `figureFraction`, `selectCropLevel`, `calcEquivalentSettings`, `calcAiryDisk`; `behind = min(farFocus, backgroundDist) − d` capped at scene distance for the split; hyperfocal-infinite far → `behindM = totalDoF − inFrontM`), then `useAbCompare`, `paramSchema.ts`, and the `useDofState` facade wiring `useQueryInit`/`useToolQuerySync` exactly as the old build did (see git history if needed). — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): derived-values engine, A/B slice, query schema, state facade"`

---

## Phase 4 — Viewport

### Task 15: WebGL helpers + shaders

**Files:**
- Create: `_components/viewport/webgl/glContext.ts`, `glProgram.ts`, `glTexture.ts`, `_components/viewport/shaders/bokehBlur.frag.ts`, `passthrough.vert.ts`
- Test: `_components/viewport/webgl/gl.test.ts` (pure parts only — uniform packing, UV-rect math)

**Interfaces:**

```ts
// glContext.ts
export interface GlHandle { gl: WebGL2RenderingContext; canvas: HTMLCanvasElement; lost: boolean }
export function createGl(canvas: HTMLCanvasElement): GlHandle | null   // null when webgl2 unavailable
export function attachLossHandlers(h: GlHandle, onLost: () => void, onRestored: () => void): () => void
// mirrors the perspective-compression pattern (see its _components for reference): preventDefault on
// 'webglcontextlost', re-init resources on 'webglcontextrestored'. Create context with
// { preserveDrawingBuffer: true, antialias: false }.
export function sizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number): void
// backing store = css size × min(devicePixelRatio, 2)

// glProgram.ts
export function buildProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram
// throws Error with the shader info log on compile/link failure (caught by useRenderer → Sentry + fallback)

// glTexture.ts
export function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture>
// Image() load → texImage2D RGBA → generateMipmap; CLAMP_TO_EDGE both axes;
// TEXTURE_MIN_FILTER = LINEAR_MIPMAP_LINEAR. Rejects on load error.

// pure helpers (unit-tested):
export function packTaps(taps: Tap[]): Float32Array               // [x0,y0,x1,y1,...] for uniform2fv array upload
export function uvRectForAspect(texAspect: number, viewAspect: number): [number, number, number, number]
// center-crop the overscan texture to the view aspect: returns [offX, offY, scaleX, scaleY]
```

- [ ] **Step 1: Write the failing test for the pure helpers**

```ts
import { describe, it, expect } from 'vitest'
import { packTaps, uvRectForAspect } from './glTexture'

describe('packTaps', () => {
  it('flattens taps xy-interleaved', () => {
    expect(Array.from(packTaps([{ x: 1, y: 2 }, { x: 3, y: 4 }]))).toEqual([1, 2, 3, 4])
  })
})
describe('uvRectForAspect', () => {
  it('is identity when aspects match', () => {
    expect(uvRectForAspect(1.5, 1.5)).toEqual([0, 0, 1, 1])
  })
  it('crops width when texture is wider than view', () => {
    const [ox, , sx, sy] = uvRectForAspect(2, 1)
    expect(sy).toBe(1)
    expect(sx).toBeCloseTo(0.5, 6)
    expect(ox).toBeCloseTo(0.25, 6)
  })
  it('crops height when texture is taller than view', () => {
    const [, oy, sx, sy] = uvRectForAspect(1, 2)
    expect(sx).toBe(1)
    expect(sy).toBeCloseTo(0.5, 6)
    expect(oy).toBeCloseTo(0.25, 6)
  })
})
```

- [ ] **Step 2: FAIL.**

- [ ] **Step 3: Write shaders + helpers.** Shader sources as template-literal exports:

```ts
// passthrough.vert.ts
export const PASSTHROUGH_VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`
```

```ts
// bokehBlur.frag.ts
export const BOKEH_BLUR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTaps[64];        // aperture-shaped Poisson taps, unit radius
uniform float uRadiusFrac;     // blur radius as fraction of view height
uniform float uViewAspect;     // viewW / viewH
uniform vec4 uUvRect;          // overscan crop: xy offset, zw scale
uniform float uBloom;          // highlight boost 0..3
in vec2 vUv;
out vec4 outColor;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec2 base = uUvRect.xy + vUv * uUvRect.zw;
  if (uRadiusFrac < 0.0005) { outColor = vec4(texture(uTex, base).rgb, 1.0); return; }
  float lod = clamp(log2(max(uRadiusFrac * 1080.0, 1.0)) - 3.0, 0.0, 5.0);
  vec2 tapScale = vec2(uRadiusFrac / uViewAspect, uRadiusFrac) * uUvRect.zw;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 c = textureLod(uTex, base + uTaps[i] * tapScale, lod).rgb;
    float w = 1.0 + uBloom * pow(max(lum(c) - 0.6, 0.0) * 2.5, 2.0);
    acc += c * w;
    wsum += w;
  }
  outColor = vec4(acc / wsum, 1.0);
}`
```

Implement `glContext.ts`/`glProgram.ts`/`glTexture.ts` to the interfaces (quad VBO of 2 triangles covering clip space lives in glContext's `createGl`).

- [ ] **Step 4: Run helper tests → PASS.** Shader correctness is verified visually in Task 16 and by e2e screenshot diff in Task 27.
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): WebGL2 helpers + 64-tap shaped bokeh shader"`

### Task 16: Renderer hook + Viewport + fallback

**Files:**
- Create: `_components/viewport/useRenderer.ts`, `Viewport.tsx`, `Viewport.module.css`
- Test: manual — `npm run dev`, temporary page wiring (removed before commit) rendering `<Viewport/>` with hardcoded props

**Interfaces:**

```ts
// useRenderer.ts
export interface RenderSide {
  blurRadiusFrac: number      // blurMmToPx(...) / viewportH, precomputed by caller
  bokeh: BokehShapeId
  uvRect: [number, number, number, number]
}
export interface RendererApi { status: 'loading' | 'ready' | 'fallback' | 'error' }
export function useRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  textureUrl: string,
  sideA: RenderSide,
  sideB: RenderSide | null,     // non-null in A/B modes
  dividerPos: number,           // 0..1, used when sideB present (wipe: scissor split at divider; split: 50/50)
): RendererApi
// Draw on dependency change only (useEffect) — no RAF loop. Kernel taps regenerated only when
// bokeh shape changes (memo). Scissor: sideA = [0, divider·W], sideB = [divider·W, W].
// createGl null → status 'fallback'. Program build throw → Sentry captureException + 'error' → fallback UI.

// Viewport.tsx — 'use client'. Props:
export interface ViewportProps {
  background: DofBackground; orientation: 'landscape' | 'portrait'
  viewAspect: number            // sensorWMm / sensorHMm from derived
  sideA: RenderSide; sideB: RenderSide | null; dividerPos: number
  fallbackBlurPx: number        // CSS blur for the no-WebGL path
  children?: ReactNode          // ModelLayer + overlays render above the canvas
}
```

Fallback branch renders `<img src={background.src...} style={{ filter: blur(fallbackBlurPx) }}>` plus a translated notice (`t('webglFallbackNotice')`); the canvas is not mounted. Container is `position: relative; overflow: hidden`, `aspect-ratio` set from `viewAspect`, max-height bounded by the CSS module so desktop stays 100vh-safe.

- [ ] **Step 1:** implement `useRenderer` per interface. **Step 2:** implement `Viewport.tsx` + module CSS (surface tokens from `globals.css`). **Step 3:** wire a temporary render into the tool page, `rm -rf .next && npm run dev`, verify: image renders, blur visibly grows when `blurRadiusFrac` prop is raised, bokeh shape switch changes highlight rendering on `night-lights`, DevTools → "WebGL2 disabled" (chrome://flags or `--disable-webgl2`) shows the fallback. **Step 4:** remove temporary wiring; `npx vitest run` (full suite green) + `npm run type-check`.
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): render-on-change viewport with scissored A/B and CSS fallback"`

### Task 17: ModelLayer

**Files:**
- Create: `_components/viewport/ModelLayer.tsx`
- Test: `_components/viewport/modelLayer.test.tsx`

**Interfaces:**

```ts
export interface ModelLayerProps {
  subject: DofSubject
  derived: Pick<DofDerived, 'figureFrac' | 'cropLevel' | 'sensorWMm' | 'cocMm'>
  optics: Pick<OpticsState, 'focalLength' | 'aperture' | 'distanceM'>  // effectiveFl passed as focalLength
  viewportPx: { w: number; h: number }                                  // measured by parent (ResizeObserver)
  side?: 'a' | 'b'
}
export function ModelLayer(props: ModelLayerProps): ReactNode
```

Behavior (all math via Phase-1 helpers — no local formulas):
1. `crop = subject.crops[derived.cropLevel]`; `figurePx = figureFraction × viewportPx.h`; `layout = modelLayout(figurePx, viewportPx.h, crop.eyeLineRatio)`.
2. Render `crop.slices` as stacked absolutely-positioned `<img>`s in manifest order (near→far), each sized `layout.heightPx`, top `layout.topPx`, horizontally centered. Nearer slices stack above via `zIndex: slices.length - index` — do NOT reorder the DOM (the Task test indexes imgs by manifest order).
3. Per slice: `blurMm = calcDefocusBlur({ focalLength, aperture, focusDistance: distanceM, targetDistance: distanceM + depthOffsetMm / 1000 })`; `blurPx = blurMmToPx(blurMm, sensorWMm, viewportPx.w)`; apply `style.filter = blur(${Math.min(blurPx, 24)}px)` when `blurPx > 0.5`, else no filter.
4. `onError` on any slice `<img>` sets a state flag that swaps the stack for the single unsliced `crop.src` image (spec's slice-failure fallback).
5. `alt=""` `aria-hidden` (decorative; the results panel carries the information).

- [ ] **Step 1: Write the failing test** (jsdom render, assert layout + slice count):

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ModelLayer } from './ModelLayer'
import { getSubjectById } from '@/lib/data/dofSimulator/models'

const subject = getSubjectById('woman-a')

describe('ModelLayer', () => {
  it('renders one img per slice for the active crop level', () => {
    const { container } = render(
      <ModelLayer subject={subject}
        derived={{ figureFrac: 4, cropLevel: 'face', sensorWMm: 36, cocMm: 0.03 }}
        optics={{ focalLength: 135, aperture: 1.4, distanceM: 1.2 }}
        viewportPx={{ w: 900, h: 600 }} />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(subject.crops.face.slices.length)
  })
  it('blurs off-plane slices but not the eye-plane slice', () => {
    const { container } = render(
      <ModelLayer subject={subject}
        derived={{ figureFrac: 4, cropLevel: 'face', sensorWMm: 36, cocMm: 0.03 }}
        optics={{ focalLength: 135, aperture: 1.4, distanceM: 1.2 }}
        viewportPx={{ w: 900, h: 600 }} />,
    )
    const imgs = [...container.querySelectorAll('img')] as HTMLImageElement[]
    const eyePlane = imgs[1]  // slices ordered near→mid→far; mid = offset 0
    expect(eyePlane.style.filter).toBe('')
    expect(imgs[0].style.filter).toMatch(/blur/)
  })
})
```

- [ ] **Step 2: FAIL.** — **Step 3:** implement. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): subject ModelLayer with crop levels + depth-slice blur"`

### Task 18: BokehInset, AbDivider, aperture sweep

**Files:**
- Create: `_components/viewport/BokehInset.tsx`, `AbDivider.tsx`, `useApertureSweep.ts` (+ one shared `viewport/overlays.module.css`)
- Test: `_components/viewport/overlays.test.tsx`

**Interfaces:**

```ts
// BokehInset.tsx — corner SVG preview of the current aperture opening
export function BokehInset(props: { bokeh: BokehShapeId; blurPx: number }): ReactNode
// SVG 72×72: shape from ngonVertices(n) as <polygon> (disc/cata as <circle>, cata with a hole via fill-rule),
// scaled by clamp(blurPx, 4, 30); label below shows blurPx rounded ("~14 px"). Hidden when blurPx < 1.

// AbDivider.tsx
export function AbDivider(props: { pos: number; onChange(pos: number): void }): ReactNode
// vertical bar + drag handle; pointer capture; onChange(clamp(x/width, 0.1, 0.9));
// role="separator" aria-orientation="vertical" aria-valuenow for a11y; ←/→ arrows nudge ±0.02.

// useApertureSweep.ts
export const SWEEP_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16]
export function useApertureSweep(setAperture: (v: number) => void): { playing: boolean; toggle(): void }
// setInterval 700ms stepping SWEEP_STOPS; stops at end; toggle cancels; if
// matchMedia('(prefers-reduced-motion: reduce)').matches, toggle() jumps straight to f/16 instead of animating.
```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { BokehInset } from './BokehInset'
import { useApertureSweep, SWEEP_STOPS } from './useApertureSweep'

describe('BokehInset', () => {
  it('renders a polygon for blade shapes and hides under 1px blur', () => {
    const { container, rerender } = render(<BokehInset bokeh="blade6" blurPx={12} />)
    expect(container.querySelector('polygon')).not.toBeNull()
    rerender(<BokehInset bokeh="blade6" blurPx={0.4} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})

describe('useApertureSweep', () => {
  it('steps through stops on an interval', () => {
    vi.useFakeTimers()
    const setAperture = vi.fn()
    const { result } = renderHook(() => useApertureSweep(setAperture))
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(700 * SWEEP_STOPS.length + 50))
    expect(setAperture).toHaveBeenCalledWith(1.4)
    expect(setAperture).toHaveBeenCalledWith(16)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: FAIL.** — **Step 3:** implement all three. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): bokeh inset, A/B divider, aperture sweep"`

---

## Phase 5 — UI

**Phase-wide notes:** Panels compose the existing shared components — read `src/components/shared/ControlPanel.tsx`, `FocalLengthField.tsx`, `ApertureField.tsx`, `DistanceField.tsx`, `ModeToggle.tsx`, `InfoTooltip.tsx` before writing any panel; reuse them wherever they fit. Every label through `useTranslations('toolUI.dof-simulator')` — add the English key to `src/lib/i18n/messages/en/tools/dof-simulator.json` the moment you use it (create the file in Task 19 Step 1 with `{ "toolUI": { "dof-simulator": {} } }` and grow it; it is registered in `request.ts` in Task 25). Component tests assert behavior (callbacks fired, values rendered), not styling.

### Task 19: InterfacePanel, AppearancePanel, picker modals

**Files:**
- Create: `_components/panels/InterfacePanel.tsx`, `AppearancePanel.tsx`, `ModelPickerModal.tsx`, `BackgroundPickerModal.tsx`, `panels.module.css`; `src/lib/i18n/messages/en/tools/dof-simulator.json`
- Test: `_components/panels/appearance.test.tsx`

**Interfaces:**

```ts
export function InterfacePanel(props: { uiPrefs: UiPrefsApi }): ReactNode
// two ModeToggle rows: basic/advanced, metric/imperial

export function AppearancePanel(props: {
  appearance: AppearanceApi
  subjects: DofSubject[]; backgrounds: DofBackground[]
}): ReactNode
// current subject/background as buttons opening the modals + orientation ModeToggle

export function ModelPickerModal(props: {
  open: boolean; subjects: DofSubject[]; activeId: string
  onSelect(id: string): void; onClose(): void
}): ReactNode
export function BackgroundPickerModal(props: {
  open: boolean; backgrounds: DofBackground[]; activeId: string
  onSelect(id: string): void; onClose(): void
}): ReactNode
// grid dialogs (thumbnails: subject full.webp / background landscape webp, name + height/name label),
// <dialog> element with showModal() for free focus trap + Escape; onSelect closes.
```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { AppearancePanel } from './AppearancePanel'
import { DOF_SUBJECTS } from '@/lib/data/dofSimulator/models'
import { DOF_BACKGROUNDS } from '@/lib/data/dofSimulator/backgrounds'

beforeAll(() => {
  // jsdom has no dialog implementation
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

function makeAppearance() {
  return {
    subjectId: DOF_SUBJECTS[0].id, backgroundId: DOF_BACKGROUNDS[0].id,
    orientation: 'landscape' as const,
    setSubjectId: vi.fn(), setBackgroundId: vi.fn(), setOrientation: vi.fn(),
  }
}

describe('AppearancePanel', () => {
  it('opens the model picker and reports the chosen subject', () => {
    const appearance = makeAppearance()
    const { getByText, getByRole } = render(
      <AppearancePanel appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />,
    )
    fireEvent.click(getByText(DOF_SUBJECTS[0].name))          // opener shows current subject name
    fireEvent.click(getByRole('button', { name: new RegExp(DOF_SUBJECTS[2].name) }))
    expect(appearance.setSubjectId).toHaveBeenCalledWith(DOF_SUBJECTS[2].id)
  })
  it('opens the background picker and reports the chosen scene', () => {
    const appearance = makeAppearance()
    const { getByText, getByRole } = render(
      <AppearancePanel appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />,
    )
    fireEvent.click(getByText(DOF_BACKGROUNDS[0].name))
    fireEvent.click(getByRole('button', { name: new RegExp(DOF_BACKGROUNDS[3].name) }))
    expect(appearance.setBackgroundId).toHaveBeenCalledWith(DOF_BACKGROUNDS[3].id)
  })
})
```
- [ ] **Step 2: FAIL.** — **Step 3:** implement (thumbnails via `next/image` with fixed sizes; grid ~4 columns desktop, 2 mobile). — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): interface + appearance panels with grid picker dialogs"`

### Task 20: CameraPanel, LensPanel, DistancePanel, FramingPanel, AdvancedPanel

**Files:**
- Create: the five panels + `_components/panels/SearchCombobox.tsx` (shared by camera/lens pickers)
- Test: `_components/panels/controls.test.tsx`

**Interfaces:**

```ts
export function SearchCombobox<T extends { id: string }>(props: {
  items: T[]; groupBy(item: T): string; label(item: T): string
  value: string | null; onChange(id: string | null): void
  placeholder: string; clearLabel: string
}): ReactNode
// text input filtering label(item) case-insensitively, results grouped by groupBy,
// listbox semantics (role=combobox/listbox/option, aria-expanded, ↑/↓/Enter), clear button → onChange(null)

export function CameraPanel(props: { optics: OpticsApi; derived: DofDerived }): ReactNode
// ModeToggle sensor-size ⟷ camera-model; sensor <select> over DOF_SENSORS (value = id) OR
// SearchCombobox over DOF_CAMERAS grouped by brand; crop factor readout from derived.sensor.cropFactor

export function LensPanel(props: {
  optics: OpticsApi; derived: DofDerived; uiPrefs: UiPrefsApi
  onFocalLengthChange(v: number): void       // facade changeFocalLength (lock-FOV aware) — NOT optics.setFocalLength
}): ReactNode
// SearchCombobox over DOF_LENSES grouped by brand (optional constraint) + FL slider (log scale 8–1200,
// clamped to lens envelope when set) + aperture slider (clamped to maxApertureAt when lens set)
// + teleconverter select (advanced only)

export function DistancePanel(props: {
  optics: OpticsApi; derived: DofDerived; uiPrefs: UiPrefsApi
  onDistanceChange(v: number): void          // facade changeDistance
}): ReactNode
// slider (log 0.3–50m) + numeric input; imperial display via formatters; MFD warning chip when derived.belowMinFocus

export function FramingPanel(props: { framing: FramingApi; onPreset(key: FramingPresetDef['key']): void }): ReactNode
// five preset buttons (active state) + lock-FOV checkbox

export function AdvancedPanel(props: { optics: OpticsApi; background: DofBackground; uiPrefs: UiPrefsApi }): ReactNode
// rendered only when uiPrefs.advanced: custom CoC numeric input (clearable → null),
// background distance slider (default = background.distanceM, clearable → null)
```

Also create `_components/state/formatters.ts`: `formatDistance(m: number, imperial: boolean): string` (metric: `2.4 m` / `85 cm` under 1m; imperial: `7 ft 10 in`), `formatMm(v: number): string` — with unit tests in `formatters.test.ts` (`0.85m → "85 cm"`, `2.4m imperial → "7 ft 10 in"`).

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { SearchCombobox } from './SearchCombobox'
import { FramingPanel } from './FramingPanel'
import { DOF_CAMERAS } from '@/lib/data/dofSimulator/cameras'
import type { DofCamera } from '@/lib/data/dofSimulator/types'
import { formatDistance } from '../state/formatters'

const comboProps = {
  items: DOF_CAMERAS,
  groupBy: (c: DofCamera) => c.brand,
  label: (c: DofCamera) => `${c.brand} ${c.model}`,
  value: null, onChange: vi.fn(), placeholder: 'Search cameras', clearLabel: 'Clear',
}

describe('SearchCombobox', () => {
  it('filters options by query', () => {
    const { getByRole, queryByText } = render(<SearchCombobox {...comboProps} />)
    fireEvent.change(getByRole('combobox'), { target: { value: 'z8' } })
    expect(queryByText(/Nikon Z8/)).not.toBeNull()
    expect(queryByText(/Sony/)).toBeNull()
  })
  it('selects on click and clears to null', () => {
    const onChange = vi.fn()
    const { getByRole, getByText } = render(<SearchCombobox {...comboProps} onChange={onChange} />)
    fireEvent.change(getByRole('combobox'), { target: { value: 'z8' } })
    fireEvent.click(getByText(/Nikon Z8/))
    expect(onChange).toHaveBeenCalledWith('nikon-z8')
    const cleared = render(<SearchCombobox {...comboProps} value="nikon-z8" onChange={onChange} />)
    fireEvent.click(cleared.getByText('Clear'))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe('FramingPanel', () => {
  it('fires onPreset with the preset key', () => {
    const onPreset = vi.fn()
    const framing = {
      activePreset: null, lockFov: false, lockedFrameHeightMm: null,
      setActivePreset: vi.fn(), setLockFov: vi.fn(), setLockedFrameHeightMm: vi.fn(),
    }
    const { getAllByRole } = render(<FramingPanel framing={framing} onPreset={onPreset} />)
    fireEvent.click(getAllByRole('button')[0])
    expect(onPreset).toHaveBeenCalledWith('face')
  })
})

describe('formatDistance', () => {
  it('uses cm under a meter, m above, ft/in for imperial', () => {
    expect(formatDistance(0.85, false)).toBe('85 cm')
    expect(formatDistance(2.4, false)).toBe('2.4 m')
    expect(formatDistance(2.4, true)).toBe('7 ft 10 in')
  })
})
```
- [ ] **Step 2: FAIL.** — **Step 3:** implement panels + formatters. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): camera/lens/distance/framing/advanced panels"`

### Task 21: SavedSettingsPanel + ResultsPanel

**Files:**
- Create: `_components/panels/SavedSettingsPanel.tsx`, `ResultsPanel.tsx`
- Test: `_components/panels/results.test.tsx`

**Interfaces:**

```ts
export function SavedSettingsPanel(props: {
  saved: SavedSettingsApi
  current: Omit<SavedRow, 'id'>              // built by DofSimulator from state
  onApply(row: SavedRow): void               // facade restores fl/aperture/distance/bokeh (+ sensor via label match skipped — label is display-only)
}): ReactNode
// table: sortable headers (saved.sortBy), row click → onApply, ✕ → removeRow, "Save settings" → addRow(current)

export function ResultsPanel(props: { derived: DofDerived; imperial: boolean; bokeh: BokehShapeId }): ReactNode
// definition list: total DOF, near/far limits, in front/behind (+ %), hyperfocal, CoC,
// background blur mm + % of frame, equivalent settings line (when non-null; links to
// /equivalent-settings-calculator via Link from @/lib/i18n/navigation), effective FL when TC active,
// full-frame equivalent FL line when derived.sensor is a phone preset,
// diffraction warning chip (isDiffractionLimited), MFD warning chip (belowMinFocus)
```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ResultsPanel } from './ResultsPanel'
import { SavedSettingsPanel } from './SavedSettingsPanel'
import { computeDerived } from '../state/useDofDerived'
import { getSubjectById } from '@/lib/data/dofSimulator/models'
import { getBackgroundById } from '@/lib/data/dofSimulator/backgrounds'

function derivedFor(sensorId: string) {
  return computeDerived({
    optics: {
      focalLength: 85, aperture: 2.8, distanceM: 3, sensorId, cameraId: null, lensId: null,
      teleconverterId: 'none', customCocMm: null, backgroundDistanceM: null,
    },
    subject: getSubjectById('woman-a'), background: getBackgroundById('city-skyline'),
    orientation: 'landscape', bokeh: 'disc',
  })
}

describe('ResultsPanel', () => {
  it('shows the equivalence line on crop sensors and hides it on FF', () => {
    const crop = render(<ResultsPanel derived={derivedFor('apsc_n')} imperial={false} bokeh="disc" />)
    expect(crop.container.textContent).toMatch(/equivalent/i)
    const ff = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    expect(ff.container.textContent).not.toMatch(/equivalent/i)
  })
  it('always renders hyperfocal distance', () => {
    const { container } = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    expect(container.textContent).toMatch(/hyperfocal/i)
  })
})

describe('SavedSettingsPanel', () => {
  const row = { id: 'r1', cameraLabel: 'Full Frame', focalLength: 85, aperture: 1.4, distanceM: 3, bokeh: 'disc' as const }
  const saved = { rows: [row], addRow: vi.fn(), removeRow: vi.fn(), sortBy: vi.fn() }
  it('applies a row on click and saves the current setup', () => {
    const onApply = vi.fn()
    const { getByText } = render(
      <SavedSettingsPanel saved={saved} onApply={onApply}
        current={{ cameraLabel: 'Full Frame', focalLength: 50, aperture: 2, distanceM: 2, bokeh: 'disc' }} />,
    )
    fireEvent.click(getByText('Full Frame'))
    expect(onApply).toHaveBeenCalledWith(row)
    fireEvent.click(getByText(/save settings/i))
    expect(saved.addRow).toHaveBeenCalled()
  })
})
```
- [ ] **Step 2: FAIL.** — **Step 3:** implement. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): saved settings table + results panel"`

### Task 22: DOF ruler

**Files:**
- Create: `_components/ruler/rulerScale.ts`, `DofRuler.tsx`, `RulerFigures.tsx`, `ruler.module.css`
- Test: `_components/ruler/rulerScale.test.ts`

**Interfaces:**

```ts
// rulerScale.ts — pure log-scale mapping for the 0.3m–50m+∞ axis
export const RULER_MIN = 0.3
export const RULER_MAX = 50
export function distToX(distanceM: number, widthPx: number): number
// log10 mapping; distances > RULER_MAX pin to widthPx (the ∞ zone); clamp ≥ RULER_MIN
export function xToDist(x: number, widthPx: number): number   // inverse (x at width → RULER_MAX)
export function rulerTicks(): number[]                        // [0.3, 0.5, 1, 2, 3, 5, 10, 15, 25, 50]

// DofRuler.tsx
export function DofRuler(props: {
  distanceM: number; nearFocus: number; farFocus: number; hyperfocal: number
  onDistanceChange(v: number): void
}): ReactNode
// SVG strip: ground gradient, tick labels, shaded band nearFocus→min(farFocus, ∞ pin),
// hyperfocal marker line, camera figure at x=0, draggable subject figure at distToX(distanceM)
// (pointer capture → xToDist → onDistanceChange), keyboard: figure focusable, ←/→ = ±0.1m.
// RulerFigures.tsx exports <CameraFigure/> and <SubjectFigure/> as original simple SVG silhouettes.
```

- [ ] **Step 1: Failing test** — `distToX(0.3, 800) = 0`; `distToX(50, 800) = 800`; `xToDist(distToX(5, 800), 800) ≈ 5`; `distToX(1000, 800) = 800`; ticks ascend.
- [ ] **Step 2: FAIL.** — **Step 3:** implement scale, then components. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): log-scale DOF ruler with draggable subject"`

### Task 23: Image export

**Files:**
- Create: `_components/export/useImageExport.ts`
- Test: `_components/export/exportLayout.test.ts` (pure layout math only; canvas compositing verified in e2e Task 27)

**Interfaces:**

```ts
export interface ExportLayout {
  canvasW: number; canvasH: number; captionH: number
  slices: { src: string; x: number; y: number; w: number; h: number; blurPx: number }[]
}
export function computeExportLayout(
  viewportPx: { w: number; h: number },
  subject: DofSubject, derived: DofDerived, optics: OpticsState,
  scale: number,                       // export at 2× viewport
): ExportLayout                        // pure — reuses modelLayout/figureFraction/calcDefocusBlur/blurMmToPx

export function useImageExport(deps: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  subject: DofSubject; derived: DofDerived; optics: OpticsState
  viewportPx: { w: number; h: number }
  captionText: string                  // e.g. "85mm · f/1.8 · 3.0m · Full Frame — phototools.io"
}): { exportPng(): Promise<void>; busy: boolean }
// exportPng: offscreen canvas at 2× → drawImage(webgl canvas) → for each layout slice: load img,
// ctx.filter = blur(blurPx), drawImage → caption bar (surface color, 13px system font, captionText)
// → toBlob('image/png') → anchor download 'dof-simulation.png'. Errors → Sentry + no-op (busy resets).
```

- [ ] **Step 1: Failing test** — `computeExportLayout` doubles dimensions at scale 2, slice count matches the active crop level, caption height is 48·scale.
- [ ] **Step 2: FAIL.** — **Step 3:** implement. — **Step 4: PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): PNG export with composited subject + caption"`

### Task 24: Composition root, page, teardown of the old build

**Files:**
- Create: `_components/DofSimulator.tsx`, `DofSimulator.module.css`
- Modify: `src/app/[locale]/dof-simulator/page.tsx` (rewrite), `src/lib/data/dofSimulator.ts` (DELETE — replaced by the `dofSimulator/` directory)
- Delete: every old file under `_components/` (the 18 files from the old build), `public/scenes/*`
- Test: existing integration suites must stay green

**Steps:**

- [ ] **Step 1: Check shared-component consumers before deleting anything** — run `grep -rn "DoFDiagram\|DoFCanvas\|dofScenes\|dofDrawing\|dof-diagram-helpers" src --include='*.ts*' | grep -v dof-simulator`. Files in `components/shared/` with hits outside this tool STAY. Also `grep -rn "data/dofSimulator'" src` to find importers of the old flat data file (hyperfocal or others may import `FRAMING_PRESETS` etc.) — migrate any external importer to the new module paths first.
- [ ] **Step 2: Write `DofSimulator.tsx`** — 'use client'; `useDofState()`; three-column structure mirroring the FOV Simulator layout: `ToolHeading slug="dof-simulator"`, sidebar (`ToolActions`, InterfacePanel, AppearancePanel, CameraPanel, LensPanel, DistancePanel, FramingPanel, AdvancedPanel, SavedSettingsPanel, ResultsPanel; A/B `ModeToggle` switching which optics set the panels edit), center (`Viewport` + `ModelLayer` children + `BokehInset` + `AbDivider` when ab≠off + sweep button, `DofRuler` below), right `LearnPanel slug="dof-simulator"`, plus mobile controls duplicate + `RelatedTools variant="inline"`. Track params via `useToolSession().trackParam` on FL/aperture/distance/preset changes. Measure viewport with a `ResizeObserver` (local `useViewportSize` helper inside the file if small, else `viewport/useViewportSize.ts`). Read `ToolActions` first — it provides the share affordance; add a Reset button beside it (parity item 11) that calls `window.history.replaceState(null, '', window.location.pathname)` and resets every slice to defaults (expose `reset()` on the facade that re-initializes each slice's state).
- [ ] **Step 3: Rewrite `page.tsx`** — server component: `generateMetadata` via `getTranslations('metadata')` + `getAlternates('/dof-simulator')` (copy the pattern from the FOV simulator's page.tsx verbatim, changing the slug), render `<DofSimulator/>` + `<FaqSection/>` + `<JsonLd/>` exactly as the FOV page does.
- [ ] **Step 4: Delete** old `_components` files, `src/lib/data/dofSimulator.ts`, `public/scenes/` — then `rm -rf .next && npm run type-check && npx vitest run` and fix every break (old imports in tests, the education integration test, etc.). `npm run dev` → manual smoke: all controls live, A/B wipe works, export downloads.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(dof): new composition root + page; remove legacy depth-map build"`

---

## Phase 6 — Content, breadth & QA

### Task 25: English i18n + education content + registration

**Files:**
- Modify: `src/lib/i18n/messages/en/tools/dof-simulator.json` (complete — grown since Task 19), `src/lib/i18n/messages/en/tools.json` (name/description refresh), `src/lib/i18n/request.ts` (register BOTH new files), `src/lib/data/education/content-dof.ts` (rewrite skeleton)
- Create: `src/lib/i18n/messages/en/education/dof-simulator.json`

**Steps:**

- [ ] **Step 1: Finalize `en/tools/dof-simulator.json`** — audit every panel/overlay/warning for `t('...')` keys; ensure the file covers all of them under `{ "toolUI": { "dof-simulator": { ... } } }`. Required key groups (exact keys come from the components built in Phase 4–5): interface (`basic`, `advanced`, `metric`, `imperial`), appearance (`model`, `background`, `chooseModel`, `chooseBackground`, `portrait`, `landscape`), camera (`sensorSize`, `cameraModel`, `crop`, `searchCameras`, `clear`), lens (`chooseMake`, `searchLenses`, `focalLength`, `aperture`, `teleconverter`), distance (`modelFocus`, `belowMinFocus`), framing (`face`, `portraitShot`, `mediumShot`, `americanShot`, `fullShot`, `lockFov`, `limitReached`), results (`totalDof`, `inFrontOf`, `behind`, `hyperfocal`, `circleOfConfusion`, `backgroundBlur`, `equivalentOn`, `equivalentFl`, `diffractionWarning`), saved (`savedSettings`, `saveSettings`, `remove`, `bokeh`), viewport (`webglFallbackNotice`, `sweepPlay`, `abOff`, `abWipe`, `abSplit`, `exportPng`), a11y strings (`dividerLabel`, `rulerSubjectLabel`).
- [ ] **Step 2: Write `en/education/dof-simulator.json`** — `{ "education": { "dof-simulator": { ... } } }` with: `beginner` (2–3 sentences: what DOF is, what the three controls do), `deeper` as 3 sections (`{ heading, text }`: aperture geometry & CoC; focal length + distance dominance; sensor size & equivalence), `keyFactors` (4 bullets), `proTips` (3 bullets: eye-plane focus at wide apertures, framing-preset workflow, diffraction sweet spot), `challenges` — 5 items matching the skeleton in Step 3 (question, 4 options, explanation each; e.g. "You're at 85mm f/1.8, subject 3m — what's the fastest way to double background blur?" correct: "halve subject distance").
- [ ] **Step 3: Rewrite `content-dof.ts` skeleton** — keep the export name and `ToolEducationSkeleton` shape used by `content.ts`; 5 challenges with ids `dof-c1`…`dof-c5`, difficulty `beginner`×2/`intermediate`×2/`advanced`×1, `correctOption` indexes matching Step 2's JSON. Run `npx vitest run src/lib/data/education` — the existing education integrity tests must pass.
- [ ] **Step 4: Register in `request.ts`** — add both files to the `Promise.all` import array and to the `educationMessages`/`toolUIMessages` reducer arrays (miss this and every key 404s as MISSING_MESSAGE at runtime). Update `en/tools.json`: name "Depth of Field Simulator", description matching the registry entry. `rm -rf .next && npm run dev` → open `/en/dof-simulator`, confirm zero MISSING_MESSAGE console errors.
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): English strings, education content, message registration"`

### Task 26: 31-locale translation fill + DB breadth fill (parallel agents)

**Files:**
- Create: `messages/{locale}/tools/dof-simulator.json` + `messages/{locale}/education/dof-simulator.json` for the 30 non-English locales
- Modify: `messages/{locale}/tools.json` for all 30, camera/lens brand files (breadth to ~300 cameras / ~200 lenses)

**Steps:**

- [ ] **Step 1: Translation fill** — dispatch parallel agents (batch locales ~6 per agent). Each agent: translate the two English files + the `tools.json` entry into its locales, using `src/lib/i18n/glossary.photography.json` as the canonical terminology reference; keep brand names, camera/lens/subject model names, and `{placeholders}` untouched; mirror the exact key structure.
- [ ] **Step 2: Verify translations** — `node scripts/check-translations.mjs` (zero missing keys) and `node scripts/find-english-leaks.mjs` (zero HARD leaks). Fix and re-run until clean.
- [ ] **Step 3: DB breadth fill** — dispatch parallel agents per brand to extend `cameras/*.ts` (~300 total: each brand's ILC line-up back ~8 years + notable fixed-lens/compact bodies mapped to their sensor format) and `lenses/*.ts` (~200: each mount's primes 14–135mm, standard zoom trinities, popular telephotos, macro; `minFocusM` from spec sheets). Facts only: model name, sensor format, FL range, apertures, MFD.
- [ ] **Step 4: Validate** — `npx vitest run src/lib/data/dofSimulator` (all validation suites green), `npm run type-check`, spot-check 5 random rows per DB against manufacturer spec pages.
- [ ] **Step 5: Commit** — `git commit -am "feat(dof): 31-locale translations + camera/lens DB breadth"`

### Task 27: E2E suite

**Files:**
- Rewrite: `src/e2e/tools/dof-simulator.spec.ts`

**Interfaces:**
- Consumes the running production build (`npm run build` + `npm run start`, port 3200). Selector rules from CLAUDE.md: scope to `aside`/`[class*="sidebar"]` first (mobile duplicates every control), `[class*=...]` for hashed CSS-module classes, `selectOption('value')` for selects.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test'

const URL = '/en/dof-simulator'
const sidebar = (page) => page.locator('aside').first()

test.describe('DOF Simulator', () => {
  test('loads with viewport canvas and clean console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto(URL)
    await expect(page.locator('canvas').first()).toBeVisible()
    expect(errors.filter((e) => !/favicon|cookieyes|adsbygoogle|adsense|speed-insights/.test(e))).toEqual([])
  })

  test('aperture change re-renders the background', async ({ page }) => {
    await page.goto(`${URL}?bg=night-lights&f=1.4`)
    const canvas = page.locator('canvas').first()
    await canvas.waitFor()
    await page.waitForTimeout(600)
    const wide = await canvas.screenshot()
    await page.goto(`${URL}?bg=night-lights&f=16`)
    await page.waitForTimeout(600)
    const narrow = await page.locator('canvas').first().screenshot()
    expect(Buffer.compare(wide, narrow)).not.toBe(0)
  })

  test('model picker swaps the subject', async ({ page }) => {
    await page.goto(URL)
    await sidebar(page).locator('button', { hasText: /model/i }).first().click()
    await page.locator('dialog [class*="pickerItem"]').nth(2).click()
    await expect(page.locator('dialog')).not.toBeVisible()
  })

  test('framing preset drives distance', async ({ page }) => {
    await page.goto(`${URL}?fl=85&d=5`)
    await sidebar(page).locator('button', { hasText: 'Face' }).click()
    await expect(sidebar(page).locator('input[type="number"]').first()).toHaveValue(/1\.1/)
  })

  test('lock-FOV holds framing across focal length change', async ({ page }) => {
    await page.goto(`${URL}?fl=85`)
    const sb = sidebar(page)
    await sb.locator('button', { hasText: 'Face' }).click()
    await sb.locator('input[type="checkbox"]').first().check() // lock FOV
    await sb.locator('input[type="range"]').first().fill('170')
    const d = await sb.locator('input[type="number"]').first().inputValue()
    expect(parseFloat(d)).toBeGreaterThan(2) // distance re-solved ~2.27m
  })

  test('A/B wipe divider drags', async ({ page }) => {
    await page.goto(`${URL}?ab=wipe`)
    const divider = page.locator('[role="separator"]').first()
    await expect(divider).toBeVisible()
    const box = (await divider.boundingBox())!
    await page.mouse.move(box.x + 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + box.height / 2)
    await page.mouse.up()
  })

  test('saved settings roundtrip', async ({ page }) => {
    await page.goto(`${URL}?fl=135&f=1.8`)
    const sb = sidebar(page)
    await sb.locator('button', { hasText: /save settings/i }).click()
    await expect(sb.locator('table tbody tr')).toHaveCount(1)
    await page.reload()
    await expect(sidebar(page).locator('table tbody tr')).toHaveCount(1)
    await sidebar(page).locator('table tbody tr button').last().click() // remove
    await expect(sidebar(page).locator('table tbody tr')).toHaveCount(0)
  })

  test('share URL restores state', async ({ page }) => {
    await page.goto(`${URL}?fl=200&f=4&d=7&orient=portrait&bokeh=blade6`)
    const sb = sidebar(page)
    await expect(sb.locator('input[type="range"]').first()).toHaveValue('200')
    await expect(sb.locator('input[type="number"]').first()).toHaveValue('7')
  })

  test('export downloads a PNG', async ({ page }) => {
    await page.goto(URL)
    const download = page.waitForEvent('download')
    await page.locator('button', { hasText: /export/i }).first().click()
    expect((await download).suggestedFilename()).toMatch(/\.png$/)
  })

  test('falls back gracefully without WebGL2', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        return type === 'webgl2' ? null : orig.call(this, type, ...rest)
      }
    })
    await page.goto(URL)
    await expect(page.locator('img[class*="fallback"]').first()).toBeVisible()
    await expect(sidebar(page).locator('input[type="range"]').first()).toBeEnabled()
  })
})
```

- [ ] **Step 2:** `npm run build` (fix any build break first), `npm run start` in background, `npx playwright test src/e2e/tools/dof-simulator.spec.ts` — iterate on selectors until all pass (adjust to the real DOM, keeping the scoping rules; port conflict: `lsof -ti:3200 | xargs kill -9`).
- [ ] **Step 3:** run the full e2e suite `npm run test:e2e` — the smoke spec must also pass for the tool page (no console errors, no desktop scroll).
- [ ] **Step 4:** `npx vitest run` + `npm run lint` + `npm run type-check` — all green.
- [ ] **Step 5: Commit** — `git commit -am "test(dof): full e2e coverage incl. WebGL fallback"`

### Task 28: QA gate (pre-launch checklist — no prod flip in this plan)

**Files:**
- Create: `docs/internal/dof-simulator-qa.md` (findings log)

**Steps:**

- [ ] **Step 1: Numeric parity spot-check** — for 10 configurations spanning FF/APS-C/M43/phone × 24–255mm × f/1.4–f/16 × 0.5–10m, record our hyperfocal, near/far limits, total DOF, in-front/behind %, background blur %, and compare against dofsimulator.net's readouts (open the site with matching settings; verification reference only). Tolerance: ≤2% or explainable by CoC convention difference (document ours: 0.03/cropFactor). Log the table in the QA doc.
- [ ] **Step 2: Payload budget** — `npm run build`, load `/en/dof-simulator` with DevTools network tab, cold cache: initial route transfer (default subject + background included) must be < 600 KB images / < 1 MB total. Log numbers; if over, tighten webp quality or resize.
- [ ] **Step 3: Locale smoke** — script or manual: `/es/`, `/ja/`, `/zh-TW/`, `/bn/` + 4 random locales render the tool without MISSING_MESSAGE and with translated panel labels (Japanese/Bengali also verify conditional fonts apply).
- [ ] **Step 4: Manual UX pass** — desktop no-page-scroll at 1440×900 and 1280×800; mobile (iPhone viewport) stacks correctly; theme toggle (dark/light) keeps contrast; aperture sweep + reduced-motion (emulate via DevTools rendering tab); keyboard-only walkthrough (tab order, dialogs, divider arrows, ruler arrows).
- [ ] **Step 5: Close out** — fix everything found (small fixes inline; anything structural gets its own commit), re-run `npx vitest run && npm run test:e2e`, commit `git commit -am "chore(dof): QA gate fixes + parity log"`. Leave `prod: 'draft'` — flipping to `'live'` is the user's call after review.

---

## Self-review checklist (run after writing, before handoff)

- Spec coverage: parity items 1–11 → Tasks 12–24; improvements 1–8 → Tasks 14 (equivalence), 17 (slices), 18 (inset/sweep), 21 (warnings/phone-equiv), 23 (export), 16+14 (A/B); i18n/education/SEO → Tasks 24 (page metadata/FAQ/JsonLd), 25, 26; error handling → Tasks 13, 16, 17, 23; testing/QA → every task + 27, 28.
- Placeholders: none — every code step has real code; data-breadth steps define exact schemas, formats, and validation gates.
- Type consistency: `DofDerived`, `OpticsApi`, `RenderSide`, `SavedRow`, `Clamped` names match across Tasks 12–24.

## Execution notes

- Task order is dependency order; Tasks 9–11 (assets) can run in parallel with 12–14 (state) after Phase 1 lands. Task 26's translation and DB agents are parallelizable.
- If a task reveals a spec conflict, stop and surface it — don't improvise around the spec.



