import { describe, it, expect } from 'vitest'
import { distanceForFraming, flForFraming, clampTo } from './framingSolver'
import { frameHeightAtDistance } from './projection'

describe('framingSolver', () => {
  it('face preset (320mm) at 85mm FF needs ~1.13m', () => {
    expect(distanceForFraming(320, 85, 24)).toBeCloseTo(1.133, 2)
  })
  it('round-trips with frameHeightAtDistance', () => {
    const d = distanceForFraming(700, 50, 24)
    expect(frameHeightAtDistance(d, 50, 24)).toBeCloseTo(700, 6)
  })
  it('solves FL to hold framing at fixed distance', () => {
    const fl = flForFraming(1700, 5, 24)
    expect(frameHeightAtDistance(5, fl, 24)).toBeCloseTo(1700, 6)
  })
  it('clampTo reports clamping', () => {
    expect(clampTo(500, 24, 300)).toEqual({ value: 300, clamped: true })
    expect(clampTo(0.1, 0.3, 25)).toEqual({ value: 0.3, clamped: true })
    expect(clampTo(50, 24, 300)).toEqual({ value: 50, clamped: false })
  })
})
