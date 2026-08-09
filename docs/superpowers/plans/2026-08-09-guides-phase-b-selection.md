# Guides Phase B — Selection & Adaptation Status

**Date:** 2026-08-09
**Spec:** `docs/superpowers/specs/2026-08-07-guides-section-design.md`
**Status:** Stage 1 selected, stage 2 drafted — **awaiting owner review before stages 3–5**

Phase A shipped the infrastructure with zero production-visible change. This
document records the flagship selection (stage 1) and the state of the English
adaptations (stage 2), and lists exactly what is blocked on the owner.

## Source corpus reality check

The spec points at Robin's publish index
(`~/workspace/robin/robin-assistant-v3/user-data/observability/publish/index.jsonl`).
It holds 654 records covering 237 unique public slugs. Of the 263 distinct
markdown source paths those records reference, **only 86 still exist on disk** —
the rest were published from `/tmp` scratch paths that have since been cleared.
The surviving sources cluster in
`user-data/content/knowledge/`, which is where the durable writing lives.

Every guide selected below has its source file present. Topics whose only source
was a `/tmp` path (notably the teleconverter comparisons and several golden-hour
colour-grade studies) were **dropped from the flagship set** rather than
reconstructed from the published HTML.

## Stage 1 — flagship selection (8 guides)

The spec's candidate shape was 8–12 guides with macro as the anchor cluster.
Selected 8, each mapping to at least one tool so the flywheel is live at launch.

| Slug | Category | Adapted from | relatedTools |
|---|---|---|---|
| `macro-photography-getting-started` | techniques | `macro-sharpness-budget`, `crystal-slide-preparation` | focus-stacking-calculator, dof-simulator, diffraction-calculator |
| `focus-stacking-macro` | techniques | `helicon-vs-zerene`, `crystal-slide-preparation`, `macro-sharpness-budget` | focus-stacking-calculator, dof-simulator, diffraction-calculator |
| `polarized-crystal-macro` | techniques | `crystal-macro-first-session`, `crystal-slide-preparation`, `clay-method-parallelism` | focus-stacking-calculator, dof-simulator |
| `flash-photography-basics` | techniques | `flash-photography` | exposure-simulator, equivalent-settings-calculator |
| `bird-photography-settings` | techniques | `bird-photography-field-guide` | shutter-speed-visualizer, exposure-simulator, equivalent-settings-calculator |
| `choosing-a-macro-lens` | gear | `lens-laowa-90mm-…`, `flower-lens-weight-weather` | dof-simulator, diffraction-calculator |
| `telephoto-support-and-sharpness` | gear | `wind-shutter-table`, `long-exposure-wind`, `birding-monopod` | shutter-speed-visualizer, exposure-simulator |
| `color-grading-fundamentals` | editing | `loud-edits` (+ `color-grade-street-festival-golden-hour`) | white-balance-visualizer, color-scheme-generator |

Three of the eight form the macro anchor cluster and cross-link through
`relatedGuides`. Category split is 5 techniques / 2 gear / 1 editing; the spec
asked for 2–3 editing guides, and editing is the thinnest part of the surviving
corpus — see the wave-2 list.

**Excluded as personal-voice** per stage 1 (trip reports, session runbooks,
critiques, essays, daily briefs, gear inventory): `forsythe-overnight-*`,
`great-swamp-*`, `jamaica-bay-*`, `still-up`, `storm-king-*`, `nybg-photo-day`,
`west-village-photo-walk`, `astoria-park-bridge-sunset`, `central-park-ebird-*`,
`daily-brief-*`, `gear-inventory`, `critique-prompt`.

## Stage 2 — adaptation rules applied

Each English draft was written against the spec's Adapt stage:

- **Gear-neutral.** Specific bodies and lenses are stripped from techniques
  guides entirely. The two gear guides are organised around decision criteria,
  with named products only as illustrative examples of a criterion.
- **Personal voice removed.** No first person, dates, place names, other
  people's names, or session narrative.
- **Substantial rewrite**, restructured for search intent with a front-loaded
  intro — not a copy-edit of the original.
- **Embeds:** `Callout` and `ToolCard` only. `Figure` is deliberately absent
  from the seven new guides because it reads image dimensions from disk at build
  time and **no assets exist yet** (stage 3). The macro anchor keeps its single
  existing `Figure` against the Phase A placeholder image.
- All drafts are `status: draft` — dev-visible only, 404 in production, exempt
  from translation parity. Production is unchanged.

## Blocked on the owner

Stages 3–5 cannot proceed without decisions and material only Kevin has:

1. **Selection sign-off** — the spec says final selection happens with Kevin at
   stage 1. The table above is a proposal.
2. **Adaptation review** — the spec names this the quality gate: *"Kevin reviews
   every flagship adaptation."* Nothing should go live unreviewed.
3. **Assets (stage 3)** — every guide needs photographs from Kevin's own
   catalogue, exported to `public/images/guides/<slug>/`, long edge ≤ 2000px,
   compressed, **all EXIF/GPS stripped**. `Figure` tags get added with the
   assets. The current `macro-photography-getting-started/subject.jpg` is a 4×4
   placeholder, not a real image.
4. **Translation (stage 4)** — 8 guides × 30 locales. Deliberately not started:
   `CLAUDE.md` records that the owner translates *after* English content locks,
   and translating before review would burn the work on prose that changes.
   A guide cannot go `live` until all 31 locale files exist and
   `check-guide-translations.mjs` passes.
5. **Duplicate-content calls** — for each guide, whether the askrobin original
   stays public, gets unpublished, or canonicalises to the phototools guide.
6. **Byline** — still open from the spec. `author` is an optional frontmatter
   field, so either answer is a one-line edit per guide.

Stage 5 (flip `status: live`) also needs the Phase B e2e suite the spec
describes — index navigation, TOC scroll-spy, ToolCard click-through, LearnPanel
guides block — plus `LearnPanel` wiring for the tools these guides reference.

## Wave 2 candidates (sources on disk, not adapted)

- `flower-photography-telephoto`, `flower-photography-rain` — techniques
- `fog-photography-night-predawn-dawn` — techniques
- `night-halation-filter-or-post` — editing, pairs with a grading guide
- `stackshot-runbook` + `breadboard-macro-rig` — gear, macro rail automation
- `lrc-catalog-analysis-2026-05` — strong flywheel fit with
  `lightroom-catalog-analyzer`; needs heavy de-personalising
- `nikon-z-birding-body-comparison` — gear, viable only with aggressive
  de-branding into "does a newer body improve your bird photos"
- `bird-video-*` cluster (6 pieces) — no home in the current
  `techniques | gear | editing` taxonomy; would need a category decision
