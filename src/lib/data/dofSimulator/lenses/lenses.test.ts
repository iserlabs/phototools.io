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
