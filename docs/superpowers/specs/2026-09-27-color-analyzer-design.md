# Color Analyzer — Design

**Date:** 2026-09-27
**Status:** Approved design, pending implementation plan
**Replaces:** Color Scheme Generator (`color-scheme-generator`, live in prod)
**New slug:** `color-analyzer` · **Name:** Color Analyzer · **Category:** visualizer

## 1. Summary

Rebuild the Color Scheme Generator as a photo color analyzer, modelled on the
"Color Lab" tool that ships with Louimagin's *The Color Code* course
(louimagin.com/how-to-color-grade-photos). The user drops a photo, places up to
8 labelled sample points, sees every sample plotted on an HSL hue/saturation
wheel, picks a target harmony, and gets per-sample guidance: which way to push
each color, how far, and a suggested hex. The current generator (pick a key
color, get a palette) is not a separate mode: it is what the analyzer shows
when there is one sample or no photo, because a harmony's *unfilled slots* are
the generated scheme.

Everything runs in the browser. Nothing is uploaded, nothing is persisted.

### Reference tool, as observed

Screenshots of the Color Lab (June/July 2026) show: numbered sample points on
the photo with editable labels; an HSL wheel with a three-way control
(Natural / Pure hues / Harmony guide); a color-values panel with hex (tap to
copy), a hue name, and H/S/L; harmony buttons (split-complementary,
complementary, square, triadic, analogous, monochromatic, custom); dashed
target positions with arrows from each dot; per-color lines such as "Aligned",
"Slight nudge toward pink", "Big shift toward pink" with a suggested hex; a
lock per color to anchor the harmony; light/dark theme. No editing, no export
to Lightroom.

## 2. Decisions taken during design

| Decision | Choice | Why |
|---|---|---|
| Home | Rebuild the existing tool, not a sibling | User decision: analysis becomes the primary feature |
| Slug | `color-analyzer`, permanent redirect from the old slug | Short, catches "photo/image color analyzer" queries, not harmony-only |
| Generator | Folded in, no mode toggle | Unfilled harmony slots *are* the palette; one code path |
| Color model | HSL, extend `drawWheel.ts` | Matches Adobe Color and Lightroom's HSL panel, where the user makes the edit next. OKLCh would be more honest but would not match the editing tools. Math is isolated in `lib/math` so a perceptual wheel can be added later |
| Sampling | Manual points, plus an Auto-pick seed | Intentional workflow is the product; auto-pick removes the blank-start friction |
| Rollout | Ship `prod: 'live'` in the same PR | It replaces a live tool; a draft stage would pull the old tool off the nav |

## 3. Flow and layout

Same shell as every tool: 280px sidebar, flexible center, 260px LearnPanel
(collapsible). Desktop never scrolls the page; panels scroll internally.

**Center:** palette bar on top, then the **photo pane** and the **wheel** side
by side. The photo pane has a fixed height (fills the center column) and
letterboxes the image, so any aspect ratio causes no layout shift. Below
~1400px viewport the wheel drops to its existing 280px size and the photo pane
takes the remaining width. Below 1024px (existing breakpoint) everything
stacks and the page scrolls.

**Before a photo:** the photo pane is the shared `FileDropZone` ("Drop a photo
or click to browse. It stays in your browser."). The wheel behaves like the
current generator: one draggable key dot with harmony targets around it. The
existing URL params (`h`, `sat`, `l`, `type`, `split`, `spread`, `tet`) keep
working in this state.

**After a photo:** the image renders at fit size. Clicking adds a numbered
sample point, up to 8. Each sample is the **average of a 5×5 patch on the
analysis canvas** (§5), not one pixel, so grain does not produce random hues.
The magnifier loupe shows on hover. Points are draggable, deletable (hover ×,
or Delete when selected), and each has an editable label defaulting to a hue
name ("sky blue", "red-orange"). **Auto-pick** seeds up to 5 points from the
image's dominant colors (§6). A **Change photo** control resets samples.
Photo and samples are session-only, like EXIF Viewer and Frame Studio; reload
starts over.

**Wheel:** every sample plotted at its true hue and saturation. Segmented
control beneath: **Natural** (true saturation), **Pure hues** (dots on the
rim), **Harmony guide** (targets and arrows). Clicking a dot selects the same
sample in the list and on the photo.

**Harmony guide** works with or without a lock. With no lock the template is
rotated to the best fit across all scorable samples. Locking a sample pins the
template to that hue. Two samples may map to the same slot.

**Sidebar**, top to bottom: `ToolActions` (copy image, share); harmony picker
with the five existing types plus **monochromatic** and **custom**, with a
"Closest fit" badge on the detected harmony (§6); the existing "Great for…"
suggestion line, keyed on the harmony and the warm/cool side of the **anchor
hue** (the key hue when there are no samples); the sample list, one `SampleCard` per sample with swatch,
label, hex (tap to copy), H/S/L, lock toggle, and in guide view the nudge line
("Aligned", "Slight nudge toward pink", "Big shift toward teal") with a
suggested hex swatch. Samples are measured, not edited: only label and
position change. With no samples the list is the single key-color card with
today's hue, saturation, lightness sliders and hex input.

**Palette bar:** the target harmony as swatches with the key marked; copy
hex/CSS/RGB as today. **Copy image** composes photo with numbered markers,
wheel, and swatch row into one PNG.

## 4. State model

```
Sample     { id, x, y (0..1 image-relative), rgb, hsl, neutral: boolean,
             label, locked }
State      { photo: { analysis: HTMLCanvasElement, width, height } | null,
             samples: Sample[], selectedId: string | null,
             harmony: HarmonyType, view: 'natural' | 'pure' | 'guide',
             key: { h, s, l },                    // used only when samples.length === 0
             splitAngle, analogousSpread, tetradicOffset,
             customTargets: Record<sampleId, hue> } // harmony === 'custom' only
HarmonyType  'complementary' | 'analogous' | 'triadic' | 'split-complementary'
           | 'tetradic' | 'monochromatic' | 'custom'
```

- `x, y` are image-relative so resizes and the export re-project without
  drift. `rgb`/`hsl` are cached at sampling time and re-read only when the
  point moves.
- **Neutral samples:** S < 8% → gray, L < 8% → black, L > 94% → white. They
  plot at the wheel centre, get a neutral name, are **excluded from the fit**,
  and the card reads "Neutral, not scored". They count toward the cap and
  appear in the export.
- **One lock at most.** Locking a sample unlocks any other.
- **Derived, never stored:** fit result, palette swatches, nudge text,
  suggested hexes; all `useMemo` over samples, harmony, params.
- **URL sync:** the seven existing params drive the no-photo key colour;
  `view` is added; the two new harmony types join the `type` enum. Samples are
  not URL-synced.
- **Custom targets** are keyed by sample id and initialised to each sample's
  own hue on entering custom, so a fresh custom state reads "Aligned".
- **Data file** `src/lib/data/colorAnalyzer.ts` (replaces
  `colorSchemeGenerator.ts`): 7 harmony keys; 24 hue-band keys (15° each) plus
  3 neutral keys; nudge thresholds in hue degrees (aligned ≤ 8°, slight ≤ 25°,
  big beyond); neutral thresholds; sample cap 8; patch size 5; analysis long
  edge 1600.

## 5. Sampling pipeline (`useSampling.ts`)

- Decode with `createImageBitmap(file, { imageOrientation: 'from-image',
  resizeWidth | resizeHeight })` to at most 1600px on the long edge (whichever
  axis is longer gets the constraint; the other follows the aspect ratio),
  inside try/catch. On
  failure (older Safari rejects the options) fall back to `<img>` decode and
  `drawImage` scaling; current browsers honour EXIF orientation on `<img>` by
  default. Unsupported formats (HEIC in Chrome) surface the existing
  `common.fileUpload` unsupported-file message.
- Draw once onto an offscreen **analysis canvas**. Every sample reads a 5×5
  patch average from it, never from the display canvas, so values are stable
  across resizes and the export re-projects from the same source.
  `patchAverage(data, width, height, x, y, size)` is a pure function over a
  `Uint8ClampedArray` with edge clamping.
- Values are sRGB as the browser hands them over; embedded profiles are
  converted on decode. The LearnPanel says so.
- Memory: a 45 MP file decoded at full size is ~180 MB of RGBA; the resize on
  decode keeps the analysis canvas under ~10 MB.

## 6. Harmony fit (`src/lib/math/color-fit.ts`, pure)

**Template.** `harmonyTemplate(type, params)` → hue offsets from an anchor:
complementary `[0, 180]`; split `[0, 180−split, 180+split]`; analogous
`[−spread, 0, +spread]`; triadic `[0, 120, 240]`; tetradic
`[0, off, 180, 180+off]`; monochromatic `[0]`. Custom has no template.

**Fit.** `fitHarmony(samples, type, params, lockedId, customTargets)` →

```
{ anchorHue, slots: [{ hue, sampleIds }],
  results: [{ id, targetHue, delta, band, suggestedHex }],
  meanError, normalizedError }
```

Scorable (non-neutral) samples only. Locked: anchor = that sample's hue.
Otherwise search the anchor in 1° steps minimising the sum of circular
distances to the nearest slot, ties broken by the smaller maximum error
(360 × N × slots comparisons; trivial). Many-to-one assignment. `delta` is the
signed shortest rotation (−180..180), `band` from the thresholds,
`suggestedHex` keeps the sample's S and L at the target hue. Custom skips the
search and reads `customTargets[id]`. With no scorable samples the anchor
falls back to the key hue and only targets are drawn.

**Detection.** `rankHarmonies(samples, params)` runs the fit for the six
template harmonies and sorts by `normalizedError = meanError / (180 /
slotCount)`, so a 4-slot template does not win by having more slots. Needs at
least 2 scorable samples. The picker shows a **"Closest fit"** badge on the
winner and the sidebar reads "Your photo is closest to split-complementary
(mean 9° off)". It never switches the harmony for the user; clicking the badge
does.

**Generator = unfilled slots.** With one sample, or the no-photo key, every
harmony is trivially aligned and the unfilled slots are the suggested colours:
dashed targets on the wheel, swatches in the palette bar. Unfilled-slot S and
L come from the locked sample, else the mean of scorable samples, else the key.
Filled slots show the assigned sample's actual colour (the nearest one when
several share a slot). Monochromatic palette is the anchor hue at the fill S
with L 20/35/50/65/80.

**Nudge wording.** Direction word is the band name of the target hue. If the
sample and target fall in the same 15° band, use the band one step further in
the direction of `delta`, so the sentence names where to push, never where it
already is. Three sentence templates per locale (aligned, slight, big); band
names from `src/lib/math/color-name.ts`: `hueBand(h, s, l)` → key.

**Auto-pick** (`src/lib/math/color-cluster.ts`). `dominantColors(pixels, k =
5)`: the analysis canvas downscaled to 64px wide, k-means in RGB, k-means++
seeding from a fixed-seed mulberry32 PRNG, 12 iterations, empty clusters
dropped (result may be fewer than k). **Chromatic first:** clustering runs over
pixels that pass the neutral test (S ≥ 8%, 8% ≤ L ≤ 94%); only when fewer than
5% of pixels are chromatic does it run over all pixels. Otherwise shadows and
highlights, which dominate most photos, would seed the wheel with grays. For
each cluster return the grid pixel nearest its centroid, mapped to
image-relative x, y. Those go through the normal sampling path (5×5 average,
neutral check). Auto-pick **replaces** the current sample set; samples are
cheap to place and nothing else depends on them, so no confirmation.

**Wheel geometry** stays in `drawWheel.ts`: sample at (hue, saturation) in
natural view, (hue, 100) in pure view; target at (targetHue, same radius);
arrow when band ≠ aligned.

## 7. Files and rename

**Route:** `git mv src/app/[locale]/color-scheme-generator
src/app/[locale]/color-analyzer`. Registry entry:

```ts
{ slug: 'color-analyzer', name: 'Color Analyzer',
  description: 'Sample the colors in a photo, read its harmony, and see which way to push each one',
  dev: 'live', prod: 'live', category: 'visualizer' }
```

Every code reference to the old slug (verified by grep, excluding message
files):

- `src/lib/data/tools.ts`, `src/lib/data/faq.ts`,
  `src/lib/data/education/content-color-fov.ts`
- `src/lib/i18n/request.ts` (tool list that imports message files)
- `src/components/shared/ToolIcon.tsx`, `src/lib/og.tsx`
- `src/app/[locale]/not-found.tsx` (popular-slugs list)
- `src/lib/data/colorSchemeGenerator.ts` + test → `colorAnalyzer.ts` + test
- `src/e2e/tools/color-scheme.spec.ts` → `color-analyzer.spec.ts`

**Redirects** (`src/lib/i18n/redirects.ts`). Config redirects run before the
proxy middleware, so two permanent rules: `/color-scheme-generator` →
`/color-analyzer` (middleware then adds the locale) and
`/:locale/color-scheme-generator` → `/:locale/color-analyzer`. Query strings
pass through, so old share links keep their key colour. The legacy
`/tools/color-scheme-generator` chains through two hops; acceptable.

**Components** (`color-analyzer/_components/`):

| File | Role |
|---|---|
| `ColorAnalyzer.tsx` | state owner, replaces `ColorHarmony.tsx` |
| `PhotoPane.tsx` | shared `FileDropZone` when empty; image + markers, add/drag/delete, loupe, Change photo (absorbs `PhotoPicker`, private `DropZone`, `useMagnifier`) |
| `SampleMarkers.tsx` | numbered overlay dots on the photo; `touch-action: none` |
| `ColorWheel.tsx`, `drawWheel.ts`, `useWheelPointer.ts` | extended for N samples, targets, arrows, views |
| `AnalyzerSidebar.tsx` | harmony picker with badge; key-colour card or sample list |
| `SampleCard.tsx` | swatch, label, hex, HSL, lock, nudge line; focusable, Delete removes, arrows move by one analysis pixel |
| `PaletteBar.tsx`, `buildColorExport.ts` | extended: photo with markers + wheel + swatches |
| `useSampling.ts` | decode, analysis canvas, `patchAverage` |

**Pure code** in `src/lib/math/`: `color-fit.ts`, `color-name.ts`,
`color-cluster.ts`, each with a co-located test. `colorHarmonyHelpers.ts`
folds into `color-fit.ts` and `src/lib/data/colorAnalyzer.ts`.

## 8. i18n, education, SEO

**i18n.** Rename `tools/color-scheme-generator.json` and
`education/color-scheme-generator.json` in all 31 locales to the new slug;
update the `tools.json` and `metadata.json` entries and the slug in
`request.ts`. New keys: 27 band names, 3 nudge templates, view labels, lock,
auto-pick, neutral, change photo, detection sentence, two harmony names.
English first; the other 30 via `glossary.photography.json`;
`check-translations.mjs` and `find-english-leaks.mjs` gate the PR.

**Education.** LearnPanel rewritten around the four-step method (intention,
analysis, choice, transformation) with the caveat that the wheel is HSL, the
model Adobe Color and Lightroom's HSL panel use, not a perceptual one.
Challenges and FAQ (FAQPage schema) updated.

**SEO.** Title "Color Analyzer: read the color harmony in any photo".
Description keeps the phrases "color scheme generator" and "color harmony" so
existing rankings transfer through the 308. OG image regenerated.

## 9. Testing

**Unit (vitest, no DOM)**
- `color-fit.test.ts`: templates for all six types; best-fit anchor recovers a
  known rotation on synthetic samples; lock overrides the search; many-to-one
  assignment; delta sign and wrap at 0/360; band thresholds at the boundaries;
  custom targets; zero scorable samples falls back to the key hue;
  `rankHarmonies` picks the true harmony on synthetic data and is not biased
  toward tetradic.
- `color-name.test.ts`: band edges at 7.5°; neutral rules; direction word when
  sample and target share a band.
- `color-cluster.test.ts`: deterministic for a fixed seed; drops empty
  clusters; recovers centroids on a 3-colour synthetic image.
- `patchAverage`: edge clamping at image borders.
- `colorAnalyzer.test.ts`: harmony keys match the type union; thresholds
  ordered.

**Component (vitest + jsdom):** sidebar renders the key card with zero samples
and sample cards otherwise; lock is exclusive; hex copy; keyboard on
`SampleCard`. Canvas drawing stays untested in jsdom, as today.

**E2E (Playwright):** existing swatch-count test moved to the new slug; upload
the existing e2e fixture image, click three points, assert three cards and
three wheel dots; switch to harmony guide and assert a nudge line; old URL
308s with query string intact; mobile viewport stacks, scrolls, and a marker
drag does not scroll the page.

**Existing integration tests** (every live tool has education content, an
icon, translations) pick up the new slug automatically.

**Analytics:** `useToolSession` events for harmony, view, sample added,
auto-pick, lock, closest-fit clicked.

## 10. Rollout

Ships `prod: 'live'` in the same PR, since it replaces a live tool.
Verification on the PR's Vercel preview deployment at 1024, 1280, 1440 and
mobile widths, including the redirect. Merge, then watch Sentry on the route
and the 308 rate in Vercel logs for a week.

## 11. Out of scope

- Writing edits back to Lightroom or Photoshop (that is `color-warp`).
- A perceptual (OKLCh) wheel.
- Persisting photos or samples across reloads.
- Server-side anything.
