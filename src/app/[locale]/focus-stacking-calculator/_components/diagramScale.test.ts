import { describe, it, expect } from 'vitest'
import { buildDistanceScale, buildMacroScale } from './diagramScale'

const SHOTS = [
  { number: 1, focusDistance: 1.05, nearFocus: 1, farFocus: 1.2 },
  { number: 2, focusDistance: 1.3, nearFocus: 1.15, farFocus: 1.5 },
]

describe('buildDistanceScale', () => {
  it('maps monotonically on a log axis', () => {
    const sc = buildDistanceScale(SHOTS, 1, 5, 56, 720)
    expect(sc.toX(2)).toBeGreaterThan(sc.toX(1))
    expect(sc.infinite).toBe(false)
    expect(sc.ticks.length).toBeGreaterThan(0)
  })
  it('flags infinite and caps max at 2× the last focus distance', () => {
    const shots = [...SHOTS, { number: 3, focusDistance: 30, nearFocus: 15, farFocus: Infinity }]
    const sc = buildDistanceScale(shots, 1, Infinity, 56, 720)
    expect(sc.infinite).toBe(true)
    expect(sc.max).toBeCloseTo(60, 5)
  })
})

describe('buildMacroScale', () => {
  it('maps linearly from 0 to the covered end', () => {
    const sc = buildMacroScale(10, 10.4, 56, 720)
    expect(sc.toX(0)).toBe(56)
    expect(sc.toX(5.2) - 56).toBeCloseTo((sc.toX(10.4) - 56) / 2, 5)
    expect(sc.infinite).toBe(false)
  })
})
