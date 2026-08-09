import { describe, it, expect } from 'vitest'
import { areaRatio, evDiff, formatEv, equivalentFocal, equivalentAperture } from './sensorEquivalence'

describe('sensorEquivalence', () => {
  it('areaRatio vs FF', () => {
    expect(areaRatio(23.5, 15.6)).toBeCloseTo(0.424, 3)
    expect(areaRatio(70, 56)).toBeCloseTo(4.537, 3)
    expect(areaRatio(36, 24)).toBe(1)
  })

  it('evDiff is log2 of area ratio', () => {
    expect(evDiff(23.5, 15.6)).toBeCloseTo(-1.237, 2)
    expect(evDiff(70, 56)).toBeCloseTo(2.182, 2)
  })

  it('formatEv signs', () => {
    expect(formatEv(2.18)).toBe('+2.2 EV')
    expect(formatEv(-1.24)).toBe('−1.2 EV')
    expect(formatEv(0.04)).toBe('0.0 EV')
  })

  it('formatEv boundary cases (rounds to zero)', () => {
    expect(formatEv(-0.05)).toBe('0.0 EV') // -0.05 rounds to -0, must be unsigned
    expect(formatEv(0.05)).toBe('+0.1 EV') // 0.05 rounds to 0.1, stays positive
    expect(formatEv(-0.04)).toBe('0.0 EV') // -0.04 is caught by guard, unsigned
  })

  it('cross-sensor focal both directions', () => {
    expect(equivalentFocal(50, 1, 1.53)).toBe(33) // FF lens seen from APS-C
    expect(equivalentFocal(50, 1.53, 1)).toBe(77) // APS-C framing in FF terms (76.5 → 77)
  })

  it('equivalent aperture 1dp', () => {
    expect(equivalentAperture(2.8, 1.53, 1)).toBe(4.3)
  })

  it('cross-sensor reference (non-default)', () => {
    // APS-C (23.5×15.6) vs Micro Four Thirds (17.3×13)
    // Ratio: (23.5 * 15.6) / (17.3 * 13) = 366.6 / 224.9 ≈ 1.630
    expect(areaRatio(23.5, 15.6, 17.3, 13)).toBeCloseTo(1.630, 2)
    // EV diff: log₂(1.630) ≈ 0.704
    expect(evDiff(23.5, 15.6, 17.3, 13)).toBeCloseTo(0.704, 2)
  })
})
