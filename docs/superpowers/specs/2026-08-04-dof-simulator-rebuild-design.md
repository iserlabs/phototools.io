# DOF Simulator Rebuild — Design

**Date:** 2026-08-04
**Status:** Approved pending final review
**Slug:** `dof-simulator` (unchanged; same URL)

## Context & Goal

Rebuild the Depth-of-Field Simulator from scratch as a feature-complete equivalent
of dofsimulator.net: an illustrated subject composited over a photographic
background whose blur is driven by real DOF math, with framing presets, camera and
lens databases, a DOF distance ruler, saved settings, and an advanced mode — plus
a set of improvements their tool doesn't have.

The existing `dof-simulator` (depth-map WebGL blur over full photos, `prod: 'draft'`,
never published) is **deleted and replaced**. It shares nothing with the new build
except `src/lib/math/dof.ts`, which survives because it is tested pure math.
Deletion scope is the tool-local tree (`_components/`, old `public/scenes/`)
only: shared components (`DoFDiagram`, `DoFCanvas`, `dofScenes` in
`components/shared/`) must be checked for other consumers (e.g. the hyperfocal
simulator) and are removed only if this tool was their sole user.

**Legal boundary:** we replicate functionality, interaction model, and behavior.
All artwork (subject illustrations, backgrounds) is original AI-generated work; all
camera/lens data is compiled from factual specifications (facts are not
copyrightable). No assets, code, or visual identity are copied from dofsimulator.net.

## Scope

### Parity features (all in v1)

1. Simulation composite: selectable subject (8 characters, heights 1.00–1.90 m)
   over selectable background (8 scenes), portrait/landscape orientation.
2. Camera section: sensor-size list **or** camera-model picker (grouped search
   combobox, ~300 bodies), crop-factor readout.
3. Lens section: free focal-length + aperture sliders, optional lens make/model
   picker (~200 lenses) that clamps slider ranges, teleconverter (1.4×/2×, advanced).
4. Distance: focus slider + numeric input. Focus is always locked to the subject's
   eye plane ("Model (focus)" semantics).
5. Framing presets (Face 320 mm / Portrait 480 mm / Medium 700 mm / American
   1000 mm / Full 1700 mm frame heights) + lock-field-of-view. A preset click
   solves **distance** at the current focal length (matching dofsimulator.net);
   with lock-FOV enabled, subsequent FL changes re-solve distance (and distance
   changes re-solve FL) to hold the frame height.
6. DOF ruler: photographer + subject silhouettes on a log-scaled distance axis,
   draggable subject, shaded in-focus band, near/far/hyperfocal markers,
   in-front/behind split (distance + %), CoC readout, total DOF.
7. Background blur readout (mm and % of frame width); bokeh shape selection
   (disc, 5–9 blade, catadioptric).
8. Saved settings table (localStorage, versioned key, ~20-row cap, column sort,
   apply-on-click, remove).
9. Basic/Advanced interface toggle. Advanced adds: custom CoC override,
   background-distance slider, teleconverter, extra readouts.
10. Metric/Imperial units (metric internally; imperial at the formatting layer only).
11. Share link (query-string state), reset.

### Improvements over dofsimulator.net (all in v1)

1. **A/B comparison** — wipe/split divider comparing two full setups visually.
2. **Subject depth-zone focus** — the subject renders as depth slices (nose /
   eye-plane / ears+hair) blurred independently, so f/1.4 close framing shows one
   eye sharp and the ear soft.
3. **Equivalent-settings readout** — "this look on APS-C ≈ 56 mm f/1.9",
   cross-linked to the equivalent-settings-calculator.
4. **Export as image** — composite + settings caption → PNG download.
5. **Phone sensor presets** — iPhone/Pixel main cameras in the sensor list.
   When a phone preset is active the results panel shows the full-frame
   equivalent focal length alongside the actual (users think in equivalents;
   an actual-mm slider alone reads as nonsense on a 1/1.28" sensor).
6. **Bokeh-ball inset** — magnified corner preview of the highlight shape.
7. **Diffraction warning + sweet-spot hint**, and **MFD warning** when focus
   distance is closer than the selected lens can focus (`minFocusM`).
8. **Aperture sweep animation** — steps f/1.4→f/16, respects
   `prefers-reduced-motion`.

Plus the standard PhotoTools layer their tool lacks: LearnPanel education +
challenges, 31-locale i18n, SEO metadata + FAQ + JSON-LD, RelatedTools.

### Non-goals (v1)

- Lens↔camera mount compatibility filtering (lens picker filters by brand only).
- Translated camera/lens/subject names (proper nouns stay English everywhere).
- Video/cine formats; tilt-shift; focus stacking (separate tool exists).

## Layout

PhotoTools three-column convention (FOV Simulator look & feel), desktop fits
100 vh with no page scroll, mobile stacks and scrolls with duplicated controls:

- **Left sidebar** (internal scroll): Interface + units · Appearance (subject
  picker, background picker — grid modal dialogs — orientation) · Camera (sensor
  list ⟷ camera combobox, crop readout) · Lens (make/model combobox, FL slider,
  aperture slider, TC in advanced) · Distance · Framing (presets + lock-FOV) ·
  Advanced panel · Saved settings table.
- **Center**: simulation viewport (+ blur readout chip, bokeh inset, A/B
  controls), DOF ruler below.
- **Right**: LearnPanel (collapsible).

## Rendering architecture

Layer stack in the viewport, bottom to top:

1. **WebGL2 canvas — background.** One texture per scene+orientation. Fragment
   shader applies aperture-shaped blur: **fixed ~64-tap Poisson-disc kernel shaped
   to the aperture polygon** (disc / 5–9 blade / catadioptric annulus), sampling
   from an auto-selected mip level so any blur radius costs the same. Kernel
   radius from `calcBackgroundBlur()` (mm on sensor → px in viewport =
   `viewportPx × blurMm / sensorWidthMm`). Highlights bloom into shaped bokeh via
   super-linear luminance weighting. Single uniform blur per frame (background at
   the scene's declared distance; advanced background-distance slider feeds the
   same calc).
2. **Subject layer — DOM `<img>` stack.** Scale from projection:
   `figurePx = viewportPx × subjectHeight / frameHeight(distance, FL, sensorH)`.
   Crop-level asset (full/torso/face) selected by on-screen scale so the subject
   is always crisp; each crop's manifest carries an eye-line anchor so framing
   changes keep the face stationary. Depth slices per crop level (face 3,
   torso 2, full 1) get small individual CSS Gaussian blurs from the DOF math
   (bokeh shape is irrelevant at 1–6 px radii).
3. **Overlays**: bokeh-ball inset, A/B divider, blur readout.

**Renderer behavior:** render on state change only (no continuous RAF; draws
during divider drag and aperture sweep). `preserveDrawingBuffer: true` (needed
for export compositing and Playwright canvas screenshots). Canvas backing store
clamped to `min(devicePixelRatio, 2)` with an internal render-scale knob.

**A/B mode:** ONE canvas, two scissored draws with different uniforms (wipe =
scissor at divider; split = side-by-side). One context, one texture upload. The
DOM subject layer is duplicated per side with independent scale and clipped at
the divider via `clip-path`. The viewport rect uses **set A's sensor aspect**;
set B renders its own FOV/blur inside that rect (overscan crop, no letterbox) —
comparing different-aspect sensors is inherently approximate and the B chip
notes it.

**Viewport aspect follows the selected sensor** (3:2, 4:3, …). Backgrounds are
generated with overscan and cropped to the active aspect via texture coordinates.

**Fallback:** if WebGL2 is unavailable or context loss is unrecoverable (reuse
the perspective-compression recovery pattern), swap to the background `<img>`
with CSS Gaussian blur + notice; bokeh controls disable, everything else works.

## Data model

All under `src/lib/data/dofSimulator/` (directory; 200-line limit forces
per-brand splits):

- `cameras/{brand}.ts` — `{ id, brand, model, sensorId }`. ~300 bodies target.
- `lenses/{brand}.ts` — `{ id, brand, model, flMin, flMax, apMaxWide, apMaxTele,
  apMin, minFocusM? }`. Variable-aperture zooms interpolate max aperture
  linearly in stops (documented approximation).
- `teleconverters.ts` — none / 1.4× / 2× (FL ×, minus 1 or 2 stops).
- `models.ts` — subject manifests: `{ id, name, heightM, crops: { full | torso |
  face: { src, assetPxHeight, eyeLineRatio, slices: [{ src, depthOffsetMm }] } } }`.
- `backgrounds.ts` — `{ id, name, distanceM, srcLandscape, srcPortrait,
  highlightRich }`. Scenes: city skyline, old-town street, mountains, park,
  single tree, cathedral exterior, modern building, night city lights (bokeh
  showcase).
- `bokeh.ts`, `framing.ts` — shapes and framing presets.
- Shared `sensors.ts` extended additively: phone presets + per-sensor aspect ratio.

**Curation plan:** ship gate is schema + validation tests + seeded core (~8 major
brands, current/recent bodies and lenses); breadth filled by parallel agents
before the prod flip. Validation tests enforce unique IDs, resolvable sensor
refs, sane ranges (FL 4–2000 mm, aperture f/0.7–f/64), manifest integrity, and
that every manifest `src` exists on disk. Bad rows fail CI, not runtime.

## Asset pipeline (all AI-generated, original)

Subjects (8, professional realistic art direction, consistent lighting spec,
transparent-background WebP):

1. Generate one 4K **master** full-body render per subject, then run background
   removal to produce the transparent master (generators do not emit
   transparency; the cutout is an explicit pipeline step with edge QA).
2. Derive torso + face crops via **reference-consistent image edits from the
   master** (never fresh generations) so identity/wardrobe/lighting match; each
   derived crop goes through the same cutout step.
3. Cut depth slices with **feathered, slightly overlapping alpha edges** (hard
   edges halo under differential blur).
4. Manifest entry + visual QA against the other seven for style consistency.

Backgrounds: per scene one landscape + one portrait generation with overscan,
graded to a shared palette.

Assets lazy-load per selection. Initial route payload budget: default subject +
default background < 600 KB.

## Math & state

New pure modules in `src/lib/math/` (TDD, co-located tests):

- `projection.ts` — frame height at distance, figure px scale, crop-level
  selection thresholds.
- `framingSolver.ts` — `distanceForFraming(frameH, fl, sensorH)`,
  `flForFraming(frameH, distance, sensorH)`; lock-FOV solves the counterpart
  variable on change; clamps to control bounds and **reports the clamp** so the
  UI shows "limit reached" (never silent drift).
- `bokehKernel.ts` — Poisson tap generation inside N-blade polygon / annulus;
  shader consumes the tap array.
- Equivalence math shared with equivalent-settings-calculator (reuse from
  `lib/math/` or extract there — DRY).
- `lib/math/dof.ts` reused; extended with a general two-sided
  `calcDefocusBlur(targetDistance)` valid for planes both nearer and farther
  than focus if `calcBackgroundBlur` proves behind-focus-only. Depth-slice blur
  uses this real defocus CoC — no ad-hoc overshoot heuristics (the old
  SubjectFigure's approach is explicitly not carried over).

State in `_components/state/` as hook slices (<200 lines each): `useOptics`,
`useAppearance`, `useFraming`, `useAbCompare`, `useUiPrefs` (persisted),
`useSavedSettings` (localStorage `phototools.dof.saved.v1`), composed by a
`useDofState` facade + one `useDofDerived` memo for all display values (DOF
result, blur mm/%/px, hyperfocal, equivalence, diffraction, isolation, MFD
warning). Query-string sync via existing `querySync` utils = share links; saved
settings never enter the URL. Analytics via `useToolSession` param tracking.

## Component tree (every file < 200 lines)

```
_components/
  DofSimulator.tsx            composition root only
  state/                      slices + querySync schema + savedSettings store
  viewport/
    Viewport.tsx              canvas + layer stack
    useRenderer.ts            render-on-change loop, uniforms
    webgl/                    context setup, program/texture helpers, context-loss recovery
    shaders/                  bokehBlur.frag.ts (64-tap Poisson), passthrough.vert.ts
    ModelLayer.tsx            crop selection, eye-line anchoring, slice imgs + CSS blur
    BokehInset.tsx            magnified highlight preview
    AbDivider.tsx             wipe/split interaction
    ApertureSweep.ts          animated f-stop stepper (reduced-motion aware)
  panels/
    InterfacePanel, AppearancePanel (+ ModelPickerModal, BackgroundPickerModal)
    CameraPanel, LensPanel, DistancePanel, FramingPanel, AdvancedPanel
    SavedSettingsPanel, ResultsPanel
  ruler/
    DofRuler.tsx, rulerScale.ts, RulerFigures.tsx
  export/
    useImageExport.ts         offscreen 2D composite → PNG
```

**Export compositing:** offscreen 2D canvas — draw WebGL canvas, then each
subject slice via `drawImage` with `ctx.filter` re-applying slice blurs, then
caption bar. (Canvas alone would export a subject-less background.)

**A11y:** picker dialogs focus-trap + Escape; native inputs for sliders/combobox
keyboard support; sweep respects `prefers-reduced-motion`; focus-state colors
have text equivalents in the results panel.

## i18n, education, SEO

- New `messages/{locale}/tools/dof-simulator.json` +
  `education/dof-simulator.json` in **all 31 locales**, both **registered in
  `src/lib/i18n/request.ts`** (documented MISSING_MESSAGE trap).
- `tools.json` name/description refreshed in all locales.
- Camera/lens/subject names untranslated; background names, framing labels,
  warnings, table headers translated. Photography glossary
  (`glossary.photography.json`) is the terminology reference.
- Gates: `check-translations.mjs` and `find-english-leaks.mjs` clean.
- Education skeleton + LearnPanel content (beginner, deeper physics, key
  factors, pro tips, 5 challenges).
- FAQ + JSON-LD, RelatedTools links (hyperfocal, equivalent-settings, exposure).

## Error handling

- WebGL2 unavailable / unrecoverable loss → CSS-blur fallback (above).
- Per-image load failure → skeleton + one retry → error chip; a failed slice
  falls back to the unsliced crop image.
- localStorage failure (quota/private mode) → in-memory store for the session.
- Query params validated + clamped by schema; hostile URLs cannot NaN solvers.
- Renderer errors → Sentry, `module: 'dof-simulator'`.

## Testing & QA

- **Unit (TDD):** projection, framing solvers (round-trip preset → distance →
  frame height), bokeh kernel (tap count, polygon containment, symmetry),
  equivalence, imperial formatters.
- **Data validation:** everything under "Curation plan".
- **Component:** panels render from state, saved-settings persistence (mocked
  storage), combobox filtering.
- **E2E** (rebuild `src/e2e/tools/dof-simulator.spec.ts`): page 200 + clean
  console, slider → canvas screenshot diff, picker dialogs, framing preset
  drives distance, lock-FOV holds framing across FL change, A/B divider drag,
  saved-settings roundtrip, share-URL restore, imperial toggle, export downloads
  a PNG, **WebGL-unavailable fallback** (stub `getContext('webgl2')` → null).
  Selectors follow documented pitfalls (sidebar scoping, `[class*=...]`).
- **QA gate before `prod: 'live'`:** numeric spot-check of ~10 configurations
  against dofsimulator.net (verification reference only), full-locale smoke,
  Lighthouse pass.

## Rollout

Build lands `dev: 'live', prod: 'draft'` → asset + DB fill → QA gate → flip
`prod: 'live'` (sitemap automatic). No push/deploy without explicit instruction.
