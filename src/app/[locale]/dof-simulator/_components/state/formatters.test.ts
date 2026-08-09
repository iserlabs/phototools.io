import { describe, it, expect } from 'vitest'
import { formatDistance, formatMm, formatPreciseMm } from './formatters'

describe('formatDistance', () => {
  it('shows centimeters under a meter (metric)', () => {
    expect(formatDistance(0.85, false)).toBe('85 cm')
    expect(formatDistance(0.05, false)).toBe('5 cm')
  })
  it('shows meters at/above a meter (metric)', () => {
    expect(formatDistance(2.4, false)).toBe('2.4 m')
    expect(formatDistance(5, false)).toBe('5 m')
    expect(formatDistance(1, false)).toBe('1 m')
  })
  it('shows feet and inches (imperial)', () => {
    expect(formatDistance(2.4, true)).toBe('7 ft 10 in')
    expect(formatDistance(0.3048, true)).toBe('1 ft 0 in')
  })
  it('rolls inches over into an extra foot at 12', () => {
    // 1.83m ≈ 6 ft 0.02 in worth of rounding edge cases; pick a value that
    // rounds to exactly 12 inches remainder to exercise the carry branch.
    const oneFootElevenPointFiveInches = (1 * 12 + 11.5) * 0.0254
    expect(formatDistance(oneFootElevenPointFiveInches, true)).toBe('2 ft 0 in')
  })
  it('returns the infinity symbol for non-finite input', () => {
    expect(formatDistance(Infinity, false)).toBe('∞')
    expect(formatDistance(Infinity, true)).toBe('∞')
  })
})

describe('formatMm', () => {
  it('rounds to the nearest whole millimeter and appends the unit', () => {
    expect(formatMm(50)).toBe('50mm')
    expect(formatMm(85.4)).toBe('85mm')
    expect(formatMm(85.6)).toBe('86mm')
  })
})

describe('formatPreciseMm', () => {
  it('shows meaningful digits for CoC-scale sub-0.1mm values, not "0"', () => {
    expect(formatPreciseMm(0.029)).toBe('0.029mm')
    expect(formatPreciseMm(0.0081)).toBe('0.0081mm')
    expect(formatPreciseMm(0.0196)).toBe('0.0196mm')
  })
  it('uses fewer decimals for a mid-range value under 1mm', () => {
    expect(formatPreciseMm(0.36)).toBe('0.36mm')
  })
  it('uses even fewer decimals for a value several mm large', () => {
    expect(formatPreciseMm(2.3)).toBe('2.3mm')
  })
  it('trims trailing zeros so they read as deliberate, not ragged', () => {
    expect(formatPreciseMm(0.03)).toBe('0.03mm')
    expect(formatPreciseMm(1)).toBe('1mm')
  })
  it('formats zero directly, with no stray decimal point', () => {
    expect(formatPreciseMm(0)).toBe('0mm')
  })
})
