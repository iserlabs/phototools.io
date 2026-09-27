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
  let bestAnchorDist = Infinity
  const anchorRef = hues[0]
  for (let a = 0; a < 360; a++) {
    const { sum, max } = errorForAnchor(a, template, hues)
    const anchorDist = circularDistance(a, anchorRef)
    const sumTied = Math.abs(sum - bestSum) <= 1e-9
    const maxTied = sumTied && Math.abs(max - bestMax) <= 1e-9
    if (
      sum < bestSum - 1e-9 ||
      (sumTied && max < bestMax) ||
      (maxTied && anchorDist < bestAnchorDist)
    ) {
      best = a; bestSum = sum; bestMax = max; bestAnchorDist = anchorDist
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
