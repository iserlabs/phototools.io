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
    expect(fit.anchorHue).toBe(200)
    expect(fit.meanError).toBe(0)
    expect(fit.results.every((r) => r.band === 'aligned')).toBe(true)
  })

  it('anchors a lone sample on itself rather than its complement', () => {
    const fit = fitHarmony([s('a', 200)], 'complementary', P, { fallbackHue: 0 })
    expect(fit.anchorHue).toBe(200)
    expect(fit.slots[0].sampleIds).toEqual(['a'])
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
  it('breaks a tie in favour of fewer slots', () => {
    const same = [s('a', 120), s('b', 120)]
    expect(rankHarmonies(same, P)[0].type).toBe('monochromatic')
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
