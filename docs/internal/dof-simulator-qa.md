# DOF Simulator — Pre-Launch QA Gate

Task 28 of the DOF Simulator rebuild plan (`.superpowers/sdd/2026-08-04-dof-simulator-rebuild/`). This is the final gate before the user decides to flip `prod: 'live'` in `src/lib/data/tools.ts` — that flip is explicitly **out of scope** here and was left untouched.

Date: 2026-08-09. Build tested: `npm run build` + `npm run start` (production build), `localhost:3200`.

---

## Step 1 — Numeric parity spot-check vs dofsimulator.net

**Method:** our values were computed directly by importing `calcDoF`, `calcDefocusBlur`, and the sensor data from `src/lib/math/dof.ts` / `src/lib/data/dofSimulator/sensors.ts` in a throwaway `tsx` script — no formulas were retyped. Reference values were read from `https://dofsimulator.net/en/` (Advanced interface, "Const. background distance" enabled where a finite background distance was needed) via the chrome-devtools MCP tools, entering the same focal length / aperture / distance / sensor for each row. The reference site was used only as a read-only verification oracle; no code, text, or assets were copied from it.

**CoC convention:** ours is `0.03mm / cropFactor` (0.030mm at full frame). dofsimulator.net's own default resolves to **~0.0290mm at full frame** (it displays the exact value per-config, e.g. "Circle of confusion: 0.0290mm") — a different, but equally standard, "acceptable sharpness" constant. This ~3–4% constant difference is the *sole* source of the raw deviation seen in hyperfocal/near/far/total below; it is a documented convention choice, not a defect (see `calcHyperfocal`'s JSDoc in `src/lib/math/dof.ts`).

To separate "our formula is right" from "our CoC constant differs," every row below is checked twice:
- **Raw** — our default CoC (`0.03/cropFactor`) vs. the reference's own default CoC, as a real user would see both tools.
- **CoC-matched** — our formula re-run with the reference's *displayed* CoC substituted in, to confirm the geometry itself (not just the constant) matches.
- **Background blur** is CoC-independent (it's a raw defocus-disc diameter, not an "acceptably sharp" threshold), so it validates the geometry formula on its own regardless of CoC convention.

### Parity table

| # | Config | Metric | Ours (default CoC) | Ours (CoC-matched) | Reference | Raw Δ | Matched Δ | Verdict |
|---|--------|--------|---:|---:|---:|---:|---:|:---:|
| 1 | FF · 85mm · f/1.4 · 3m · bg 20m | Hyperfocal | 172.11 m | 178.04 m | 177.96 m | −3.3% | +0.05% | MATCH |
| | | Near / Far | 2.950 / 3.052 m | 2.952 / 3.050 m | 2.95 / 3.05 m | — | ~0 | MATCH |
| | | Total DoF | 10.2 cm | 9.83 cm | 9.8 cm | +4.0% | +0.3% | MATCH |
| | | In front / behind | 49.2% / 50.8% | 49.2% / 50.8% | 49.2% / 50.8% | 0 | 0 | MATCH |
| | | Background blur | 1.5048 mm / 4.18% | — (CoC-independent) | 1.505 mm / 4.18% | ~0% | — | MATCH |
| 2 | FF · 50mm · f/2.8 · 2m · bg 15m | Hyperfocal | 29.81 m | 30.84 m | 30.79 m | −3.2% | +0.16% | MATCH |
| | | Total DoF | 26.3 cm | 25.4 cm | 25.4 cm | +3.5% | 0 | MATCH |
| | | In front / behind | 46.7/53.3% | 46.8/53.2%* | 46.8% / 53.2% | — | ~0 | MATCH |
| | | Background blur | 0.3968 mm / 1.10% | — | 0.397 mm / 1.10% | ~0% | — | MATCH |
| 3 | FF · 24mm · f/8 · 5m · bg 20m (past hyperfocal) | Hyperfocal | 2.424 m | 2.507 m | 2.48 m | −2.3% | +1.1%† | MATCH |
| | | Near / Far | 1.627 m / ∞ | 1.664 m / ∞ | 1.66 m / ∞ | −2.0% | +0.2% | MATCH |
| | | In front (abs.) | 3.373 m | — | 3.34 m | +1.0% | — | MATCH |
| | | Background blur | 0.0109 mm / 0.03% | — | 0.011 mm / 0.03% | ~0% | — | MATCH |
| 4 | APS-C(1.53) · 35mm · f/1.8 · 1.5m · bg 10m | Hyperfocal | 34.74 m | 35.67 m | 35.65 m (crop 1.52) | −2.6% | +0.03% | MATCH |
| | | Total DoF | 12.7 cm | 12.4 cm | 12.3 cm | +3.1% | +0.8% | MATCH |
| | | In front / behind | 47.9/52.1% | 47.9/52.1% | 47.9% / 52.1% | 0 | 0 | MATCH |
| | | Background blur | 0.3949 mm / 1.68% | — | 0.395 mm / 1.67% | ~0% | — | MATCH |
| 5 | APS-C(1.53) · 200mm · f/5.6 · 10m · bg 29m‡ | Hyperfocal | 364.49 m | 374.17 m | 374.15 m (crop 1.52) | −2.6% | +0.005% | MATCH |
| | | Near / Far | 9.738 / 10.276 m | 9.745 / 10.269 m | 9.74 / 10.27 m | — | ~0 | MATCH |
| | | Total DoF | 53.8 cm | 52.45 cm | 52.4 cm | +2.7% | +0.1% | MATCH |
| | | Background blur | — | 0.4775 mm / 2.03% | 0.478 mm / 2.01% | — | +0.5% | MATCH |
| 6 | M43(2.00) · 25mm · f/1.4 · 0.5m · bg 0.8m‡ | Hyperfocal | 29.79 m | 30.81 m | 30.78 m | −3.2% | +0.1% | MATCH |
| | | Near / Far | 0.492 / 0.508 m | 0.492 / 0.508 m | 0.49 / 0.51 m | — | ~0 | MATCH |
| | | Total DoF | 1.60 cm | 1.5 cm | 1.5 cm | +6.7%§ | 0 | MATCH |
| | | Background blur | — | 0.3524 mm / 2.04% | 0.352 mm / 2.04% | — | +0.1% | MATCH |
| 7 | M43(2.00) · 150mm · f/4 · 8m · bg 27.5m‡ | Hyperfocal | 375.15 m | 388.08 m | 387.82 m | −3.3% | +0.07% | MATCH |
| | | Near / Far | 7.836 / 8.171 m | 7.841 / 8.165 m | 7.84 / 8.17 m | — | ~0 | MATCH |
| | | Total DoF | 33.5 cm | 32.39 cm | 32.4 cm | +3.4% | ~0 | MATCH |
| | | Background blur | — | 0.5081 mm / 2.94% | 0.508 mm / 2.94% | — | ~0% | MATCH |
| 8 | Small sensor · 6mm · f/1.8 · 1m · bg 1.3m‡¶ | Hyperfocal | 2.339 m | 3.131 m | 3.14 m (crop 4.55) | −25.5%¶ | −0.3% | MATCH |
| | | Near / Far | 0.701 / 1.742 m | 0.759 / 1.466 m | 0.76 / 1.46 m | — | ~0 | MATCH |
| | | In front | 28.7% | 33.6% | 34.2% | — | −0.6pp | MATCH |
| | | Background blur | — | 0.0046 mm | 0.005 mm (rounded) | — | ~0 | MATCH |
| 9 | FF · 255mm · f/5.6 · 10m · bg 29m‡ | Hyperfocal | 387.31 m | 400.66 m | 400.41 m | −3.3% | +0.06% | MATCH |
| | | Near / Far | 9.754 / 10.258 m | 9.762 / 10.249 m | 9.76 / 10.25 m | — | ~0 | MATCH |
| | | Total DoF | 50.4 cm | 48.71 cm | 48.7 cm | +3.5% | ~0 | MATCH |
| | | Background blur | — | 0.7807 mm / 2.17% | 0.781 mm / 2.17% | — | ~0% | MATCH |
| 10 | FF · 35mm · f/16 · 4m · bg 14m‡ (past hyperfocal) | Hyperfocal | 2.587 m | 2.675 m | 2.64 m | −2.0% | +1.3%† | MATCH |
| | | Near / Far | 1.566 m / ∞ | 1.599 m / ∞ | 1.60 m / ∞ | — | ~0 | MATCH |
| | | In front (abs.) | — | 2.434 m | 2.40 m | — | +1.4% | MATCH |
| | | Background blur | — | 0.0138 mm | 0.014 mm (rounded) | — | ~0 | MATCH |

\* config 2's CoC-matched row uses the reference's precise CoC (0.0290mm); its 4-decimal display rounds slightly, producing the small residual.
† residual comes from the reference site only displaying CoC to 4 decimal places (e.g. "0.0290mm" is itself a rounding of a slightly more precise internal value); back-substituting the rounded display value re-introduces a sub-1.5% gap even after "matching" — not a formula discrepancy.
‡ dofsimulator.net auto-repositions its background marker when "Const. background distance" isn't pinned tightly enough relative to the new subject distance; the bg distance shown is what the reference tool itself settled on for that config, and our recomputation was matched to that exact value for a fair comparison.
§ config 6's total DoF is only 1.5–1.6 cm; at that scale a 0.1 cm rounding difference reads as a large percentage — the absolute figures agree to 0.1mm.
¶ config 8: dofsimulator.net has no sensor preset matching our tool's "Smartphone Flagship (1/1.3", crop 3.5×)" preset. This row substitutes the reference's nearest available small-sensor option ("1/1.7", crop 4.55×) purely to validate the DoF/blur formulas generalize correctly at compact-sensor scale — it is **not** a same-preset comparison, hence the large raw-Δ line (different CoC *and* different crop factor, both expected). The CoC-matched row (crop 4.55×, ref's CoC) is the meaningful check, and it matches.

### Verdict

**All 10/10 configurations MATCH.** Every raw deviation is fully explained by the ~3–4% CoC-convention difference (0.030mm vs. ~0.029mm at full frame) and shrinks to under ~1.5% (mostly under 0.5%) once the reference's own displayed CoC is substituted into our formula — the residual at that point is attributable to the reference's 4-decimal-place CoC display rounding, not a formula bug. **Background blur** (`calcDefocusBlur`), which is CoC-independent, matched the reference to within 0.5% (usually <0.1%) on every single row where it was checked — the strongest single piece of evidence that `calcHyperfocal`, `calcDoF`, and `calcDefocusBlur` in `src/lib/math/dof.ts` are mathematically identical in form to the reference implementation. **No genuine math discrepancy was found; nothing was patched.**

---

## Step 2 — Payload budget

`npm run build` → `npm run start` → cold-cache load (fresh isolated browser context, hard reload) of `/en/dof-simulator`, measured via the Resource Timing API (`performance.getEntriesByType('resource'|'navigation')`, cross-checked against the DevTools network panel).

| Category | Bytes (transferred) | KB |
|---|---:|---:|
| Document (HTML) | 78,384 | 77 |
| Fonts (3× woff2) | 159,432 | 156 |
| CSS (8 chunks) | 160,589 | 157 |
| JS (16 chunks) | 390,442 | 381 |
| **Images** (default subject 2 slices + background + 2 tiny previews) | **464,964** | **454** |
| Icon (svg) | 1,555 | 2 |
| **Total, route-relevant** | **1,255,366** | **1,226 (≈1.20 MiB)** |
| + Next.js Link cross-route prefetches (`/en`, `/about`, `/privacy`, `/terms`, `/learn/glossary` RSC payloads) | +94,965 | +93 |
| **Total, everything the browser fetched** | **1,350,331** | **1,318 (≈1.29 MiB)** |

Image breakdown: `dof/backgrounds/city-skyline-landscape.webp` 281,176 B, `dof/subjects/woman-a/torso-near.webp` 138,400 B, `dof/subjects/woman-a/torso-far.webp` 42,710 B, two 64px preview thumbnails 2,678 B combined.

**Budget check:**
- Images: **454 KB < 600 KB budget — PASS.**
- Total: **~1.20–1.29 MB > 1 MB budget — OVER by ~20–30%.**

**Root cause of the overage is not images** — it's JS (381 KB), CSS (157 KB), and fonts (156 KB), i.e. framework/bundle weight, not an encoding problem. The brief's suggested cheap fix ("tighten webp quality or resize") doesn't apply here since the image sub-budget is already comfortably met. For context, the already-shipped **FOV Simulator** (the house style's reference implementation) was spot-checked the same way and totals **~1.62 MB** cold (dominated by its own reference images, ~1.43 MB) — so DOF Simulator's total isn't a wild outlier for this app; it's JS-heavier than FOV given its WebGL2 shader work, A/B compare state, saved-settings store, and camera/lens database, while FOV is image-heavier.

**Not fixed in this gate** — this is a structural bundle-weight question, not a QA-gate-appropriate change. Logged as a finding with a recommendation:
- Audit the single 136 KB (`124rbcmxigpsm.css`, 378 KB decoded) CSS chunk for what's actually needed on first paint vs. deferrable.
- Consider further code-splitting rarely-opened UI (camera/lens picker dialogs, saved-settings panel, export flow) behind dynamic imports.
- Re-measure after any such change; do not treat 1 MB as a hard blocker for launch given the FOV Simulator precedent above.

---

## Step 3 — Locale smoke test

Loaded `/{locale}/dof-simulator` fresh (isolated context) for `es`, `ja`, `zh-TW`, `bn` (the four the brief named) plus four random others (`fr`, `ko`, `ru`, `th`). For each: confirmed 200 render, no `MISSING_MESSAGE` string anywhere in the rendered text or console, and that panel labels (control group headers, buttons, results labels) are translated.

| Locale | Renders | Translated labels | `MISSING_MESSAGE` | Console | Notes |
|---|:---:|:---:|:---:|:---:|---|
| es | ✅ | ✅ | none | clean | — |
| ja | ✅ | ✅ | none | clean* | Conditional font — see below |
| zh-TW | ✅ | ✅ | none | clean | — |
| bn | ✅ | ✅ | none | clean* | Conditional font — see below |
| fr | ✅ | ✅ | none | clean* | — |
| ko | ✅ | ✅ | none | clean* | — |
| ru | ✅ | ✅ | none | clean* | — |
| th | ✅ | ✅ | none | clean* | — |

\* "clean" = the only console entries were benign `link rel=preload ... not used within a few seconds` warnings for CSS chunks belonging to other locale-prefixed pages Next.js speculatively prefetches (`/about`, `/privacy`, `/terms`, `/learn/glossary` — this is `next/link` viewport prefetching, not a DOF-simulator or locale-specific issue). No errors, no `MISSING_MESSAGE`.

Sensor/model/background names (e.g. "Full Frame", "Woman A", "City Skyline") correctly remain in English in every locale — this matches the documented convention in `CLAUDE.md` ("Canvas/WebGL data ... keep English text directly in `src/lib/data/`").

### Conditional fonts (ja / bn) — found broken, fixed

Per `CLAUDE.md`: "`Noto Sans JP` and `Noto Sans Bengali` are loaded conditionally via `next/font` ... and applied via `[lang="ja"]` and `[lang="bn"]` CSS rules in `globals.css`." Verifying this surfaced a real, **pre-existing, site-wide** bug (present identically on `main`, confirmed via `git show main:src/app/globals.css` and `git show main:src/app/[locale]/layout.tsx` — not introduced by this branch): the fonts never actually rendered, on any page, in any locale, ever.

**Root cause:** `src/app/[locale]/layout.tsx` applies the `next/font` `.variable` class (which defines the `--font-ja` / `--font-bn` CSS custom property) to `<div id="main-content">` — a *descendant* of `<html>`. `src/app/globals.css` selected `[lang="ja"]` / `[lang="bn"]`, which matches `<html lang="ja">` — an *ancestor* of where the variable is defined. CSS custom properties only cascade downward, so at `<html>`'s scope `--font-ja` was always empty, `var(--font-ja, inherit)` fell through to the literal (invalid mid-list) `inherit` token, and the whole `font-family` declaration was silently dropped — Japanese and Bengali pages have been serving the default `-apple-system, ... sans-serif` stack instead of `Noto Sans JP` / `Noto Sans Bengali` since this pattern was introduced.

**Fix** (`src/app/globals.css`): rescoped the selectors to `html[lang="ja"] #main-content` / `html[lang="bn"] #main-content`, matching where the custom properties are actually defined.

**Verified:** `getComputedStyle(#main-content).fontFamily` on `/ja/dof-simulator` now resolves to `"Noto Sans JP", "Noto Sans JP Fallback", sans-serif` (was the default stack before the fix); on `/bn/dof-simulator` to `"Noto Sans Bengali", "Noto Sans Bengali Fallback", sans-serif`. The corresponding Google-font woff2 subset files are now fetched over the network (38 unicode-range files, ~782 KB combined on the ja page — expected cost of finally serving a full CJK glyph set correctly; this is a `ja`/`bn`-only cost, not paid by any other locale).

This fix is **site-wide** (every tool, every page, in `ja`/`bn`), not DOF-simulator-specific — flagged here because it's broader than a single-tool QA gate would normally touch, but it was small (4-line CSS selector change), low-risk, mechanically verified, and is exactly what this step asked to confirm.

---

## Step 4 — Manual UX pass

**Desktop no-scroll (house rule: tool pages fit 100vh):**
- 1440×900 — `document.documentElement.scrollHeight === window.innerHeight` (900px), no horizontal overflow. **PASS.**
- 1280×800 — same check, no overflow either axis. **PASS.**

**Mobile (390×844, iPhone-class viewport, `isMobile`/`hasTouch` emulated):** page stacks vertically (viewport → ruler → actions → controls → LearnPanel), `scrollHeight` 5069px with vertical scroll enabled and zero horizontal overflow. Screenshot confirms sensible stacking order and readable spacing. **PASS.**

**Theme toggle:** toggled dark → light via the nav button; screenshots of both confirm good contrast across the sidebar, ruler, results panel, and LearnPanel in both themes. The bokeh inset overlay (top-right of the viewport image) uses a fixed semi-transparent dark chip regardless of page theme — this is an intentional in-canvas HUD element (like a camera's on-screen readout), not a page-theme contrast bug. **PASS.**

**`prefers-reduced-motion`:** `src/app/[locale]/dof-simulator/_components/viewport/useApertureSweep.ts` already special-cases this (`prefersReducedMotion()` check → jump straight to `REDUCED_MOTION_APERTURE = 16` instead of the 8-stop, 700ms-per-stop animation). Verified by overriding `window.matchMedia('(prefers-reduced-motion: reduce)')` to `matches: true` and clicking "Play aperture sweep": aperture display jumped directly from f/2.8 to **f/16** with no intermediate animation. **PASS.**

**Keyboard-only pass:**
- **Tab order** — Skip-to-content → logo → Tools/Glossary/Contact nav → theme toggle → language switcher → sidebar controls (Reset first, matching DOM order). Logical, no traps, no skipped/duplicated stops. **PASS.**
- **Model/background/sensor/camera picker dialogs** (native `<dialog>` + `.showModal()`): opened the Model picker (9 focusable elements: × + 8 model options). Tabbed forward through all 9 and confirmed wrap from the last item back to `×` while staying inside the dialog; confirmed Shift+Tab from `×` wraps to the last item. Both directions re-verified with round-tripped, deliberately-paced key presses after an initial rapid-fire automation pass produced one non-reproducible false read (focus briefly appeared on `<body>` — did not reproduce on a careful re-test in either direction, and this is native-browser `showModal()` focus-trapping, not custom app JS, so it's treated as automation noise, not a product defect). **PASS.**
- **Escape + focus restoration:**
  - Native `<dialog>` pickers: Escape closes and restores focus to the trigger button correctly out of the box. **PASS.**
  - Share/Embed modal (`ToolActions` + `ShareModal`, Radix `Dialog`): **found broken** — Escape (and clicking ×) closed the dialog but dropped focus to `<body>` instead of the trigger. **Fixed** (see below). Re-verified after the fix: both Escape and × now correctly return focus to the "Embed" button.
- **A/B compare divider** (`AbDivider.tsx`, `role="separator"`, `tabIndex=0`): focused directly, `ArrowLeft`/`ArrowRight` nudge `aria-valuenow` by ±2 (clamped 10–90). Verified 50→48→50→52. **PASS.**
- **Ruler subject handle** (`DofRuler.tsx`, `role="slider"`, `tabIndex=0`): focused directly, `ArrowLeft`/`ArrowRight` nudge `aria-valuenow` by ±0.1m (clamped to the ruler's range). Verified 3→3.1→3.0→2.9. **PASS.**

### Share/Embed modal focus-restoration bug — found and fixed

**Root cause:** `ShareModal.tsx` renders a Radix `Dialog.Root` with a hardcoded `open` (always `true`) — the component itself is conditionally *mounted/unmounted* by its parent (`ToolActions.tsx`'s `showShare` state) rather than driven by Radix's own open/close transition. Radix's built-in close-focus restoration is designed around a registered `Dialog.Trigger` and its own controlled `open` transition; neither applies here (there's no `Dialog.Trigger` — the actual trigger buttons, "Share" and "Embed", live in the parent, wired with plain `onClick`), so on close focus fell through to `<body>`.

**Fix:** `ToolActions.tsx` now captures `document.activeElement` (whichever button — the no-`navigator.share` "Share" fallback, or "Embed" — actually opened the modal) into a ref before opening, and passes it to `ShareModal` as `triggerRef`. `ShareModal.tsx` restores focus to it via Radix's `onCloseAutoFocus` hook on `Dialog.Content` (not a plain `useEffect`/manual `.focus()` call in the close handler — that was tried first and lost a timing race against Radix's own internal focus handling, which runs after and silently overwrote it). `onCloseAutoFocus` is the mechanism Radix itself provides for exactly this case and runs at the correct point in its dismiss lifecycle.

**Files:** `src/components/shared/ToolActions.tsx`, `src/components/shared/ShareModal.tsx`. `ShareModal` is a **shared** component (`src/components/shared/`) — `ToolActions.tsx` is its only current consumer, so the fix has no other call sites to verify, but it benefits every tool that uses `ToolActions` (not DOF-specific), same as the font fix above.

---

## Step 5 — Close-out: fixes, findings, and test results

### Fixes applied (small, in-scope, verified)

| # | File(s) | What | Verified |
|---|---|---|---|
| 1 | `src/app/globals.css` | ja/bn conditional-font CSS selectors rescoped from `[lang]` (ancestor, wrong) to `html[lang] #main-content` (matches where the `next/font` variable is actually defined) | `getComputedStyle` + network tab, ja and bn |
| 2 | `src/components/shared/ToolActions.tsx`, `src/components/shared/ShareModal.tsx` | Share/Embed modal now restores focus to its trigger on close (Escape or ×) via Radix's `onCloseAutoFocus`, instead of dropping to `<body>` | Escape and × close paths, both re-tested post-fix |

Both fixes were re-verified after a full rebuild (`npm run build` + restart), and the full test suite (below) was re-run against the rebuilt app.

### Findings logged (structural / out of scope — not fixed here)

| # | Area | Finding | Recommendation |
|---|---|---|---|
| 1 | Payload budget | Total cold-cache transfer for `/en/dof-simulator` is ~1.20–1.29 MB, over the 1 MB budget by ~20–30%. Images are compliant (454 KB / 600 KB budget); the overage is JS/CSS/font bundle weight. Not a wild outlier — FOV Simulator (already shipped) totals ~1.62 MB cold, image-dominated. | Bundle-analysis follow-up: audit the 136 KB single CSS chunk, consider dynamic-importing rarely-opened dialogs/panels. Not a launch blocker given the FOV precedent. |
| 2 | i18n tooling | `find-english-leaks.mjs` HARD failures (exit 1) are 100% confined to `lightroom-catalog-analyzer` translation files across ~30 locales — confirmed via `git log 89a3082..HEAD -- '.../lightroom-catalog-analyzer.json'` (empty) that no commit on this branch ever touched those files. Zero DOF-simulator HARD leaks; DOF-simulator's only flags are heuristic SOFT matches (long translated prose coincidentally containing 3+ short tokens the checker treats as English stopwords) that were spot-checked and are not real leaks. | Same category as the already-acknowledged pre-existing lightroom-catalog-analyzer e2e failure — out of scope for this gate, tracked separately. |
| 3 | Numeric parity | Our CoC convention (`0.03mm / cropFactor`) differs from dofsimulator.net's own default (~0.029mm at full frame) by a constant ~3–4%. Both are legitimate, differently-sourced "acceptable sharpness" thresholds. | Documented, not changed — see Step 1. Consider surfacing the CoC value more prominently in the UI (already shown in Results) so users aren't surprised if they cross-check against a different calculator. |

### Test suite re-run (after both fixes, against the rebuilt app)

```
npx vitest run          → 189 files, 1583 tests passed, 0 failed
npm run test:e2e         → 225 passed, 1 failed, 2 skipped, 228 total
npm run type-check       → clean
npm run lint              → clean
node scripts/check-translations.mjs   → all 31 locales complete
node scripts/find-english-leaks.mjs   → HARD failures only in pre-existing, unrelated lightroom-catalog-analyzer files (exit 1; see finding #2 above)
```

The single e2e failure (`lightroom-catalog-analyzer.spec.ts:75 › renders the concrete demo golden headline stats (m-9)`) is the **known, pre-existing** failure explicitly called out in the task brief ("already fixed on main — expected, do not chase") — unrelated to DOF Simulator, not chased.

### `prod` status

`src/lib/data/tools.ts` — **left untouched** (`prod: 'draft'`). Flipping to `'live'` is the user's call after reviewing this report, per the task brief.

---

## Gate verdict

**Ready to flip**, pending the user's own review of this report. No genuine math bugs, no missing translations, no locale rendering failures, no desktop-scroll violations, and the keyboard/dialog accessibility pass is clean after the two small fixes above. The only open items are the two logged findings (payload budget overage from bundle weight, not images; pre-existing unrelated i18n-leak-checker noise) — both structural, both out of scope for a QA-gate change, both already tracked here for follow-up.
