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

  it('cross-sensor focal both directions', () => {
    expect(equivalentFocal(50, 1, 1.53)).toBe(33) // FF lens seen from APS-C
    expect(equivalentFocal(50, 1.53, 1)).toBe(77) // APS-C framing in FF terms (76.5 → 77)
  })

  it('equivalent aperture 1dp', () => {
    expect(equivalentAperture(2.8, 1.53, 1)).toBe(4.3)
  })
})
