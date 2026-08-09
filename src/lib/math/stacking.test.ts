import { describe, it, expect } from 'vitest'
import { calcStackingSequence, focusForNearLimit } from './stacking'

const BASE = { focalLength: 100, aperture: 8, coc: 0.03, nearLimit: 1, farLimit: 5, overlapPct: 0.3 }

describe('focusForNearLimit', () => {
  it('inverts the near-limit formula: DoF at the returned focus has nearFocus == requested edge', () => {
    const s = focusForNearLimit(1, 100, 8, 0.03)
    // verify by round-trip through calcDoF's formula: near = s(H-f)/(H+s-2f)
    const H = (100 * 100) / (8 * 0.03) + 100 // mm
    const sMm = s * 1000
    const near = (sMm * (H - 100)) / (H + sMm - 2 * 100) / 1000
    expect(near).toBeCloseTo(1, 6)
  })
  it('returns Infinity when the requested edge is beyond H - f', () => {
    const Hm = ((100 * 100) / (8 * 0.03) + 100) / 1000
    expect(focusForNearLimit(Hm, 100, 8, 0.03)).toBe(Infinity)
  })
})

describe('calcStackingSequence (exact)', () => {
  it('first shot near edge lands exactly on the near limit', () => {
    const r = calcStackingSequence(BASE)
    expect(r.shots[0].nearFocus).toBeCloseTo(1, 4)
  })
  it('adjacent shots overlap by exactly overlapPct of the previous band', () => {
    const r = calcStackingSequence(BASE)
    for (let i = 1; i < r.shots.length; i++) {
      const prev = r.shots[i - 1]
      if (prev.farFocus === Infinity) break
      const band = prev.farFocus - prev.nearFocus
      const overlap = (prev.farFocus - r.shots[i].nearFocus) / band
      expect(overlap).toBeCloseTo(0.3, 3)
    }
  })
  it('covers the far limit and reports coverageComplete', () => {
    const r = calcStackingSequence(BASE)
    const last = r.shots[r.shots.length - 1]
    expect(last.farFocus).toBeGreaterThanOrEqual(5)
    expect(r.coverageComplete).toBe(true)
  })
  it('supports farLimit = Infinity: final shot at hyperfocal with farFocus Infinity', () => {
    const r = calcStackingSequence({ ...BASE, farLimit: Infinity })
    const last = r.shots[r.shots.length - 1]
    expect(last.farFocus).toBe(Infinity)
    expect(r.totalDepth).toBe(Infinity)
    expect(r.coverageComplete).toBe(true)
  })
  it('returns a single hyperfocal shot when the near limit is beyond H - f', () => {
    // 24mm f/16 coc .03 → H ≈ 1.22m; near limit 2m is beyond H - f
    const r = calcStackingSequence({ focalLength: 24, aperture: 16, coc: 0.03, nearLimit: 2, farLimit: Infinity, overlapPct: 0.2 })
    expect(r.shots.length).toBe(1)
    expect(r.shots[0].farFocus).toBe(Infinity)
  })
  it('clamps a nearLimit at/inside the focal length instead of producing NaN', () => {
    const r = calcStackingSequence({ focalLength: 200, aperture: 8, coc: 0.03, nearLimit: 0.1, farLimit: 5, overlapPct: 0.2 })
    expect(r.shots[0].nearFocus).toBeGreaterThan(0.2) // ≥ 200mm * 1.05
    expect(Number.isNaN(r.shots[0].focusDistance)).toBe(false)
  })
  it('flags incomplete coverage when the 100-shot cap truncates', () => {
    const r = calcStackingSequence({ focalLength: 200, aperture: 2.8, coc: 0.005, nearLimit: 1, farLimit: 1000, overlapPct: 0.5 })
    expect(r.shots.length).toBeLessThanOrEqual(100)
    expect(r.coverageComplete).toBe(false)
  })
})
