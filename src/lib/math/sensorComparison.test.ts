import { describe, it, expect } from 'vitest'
import { compareSensors, NEAR_EQUAL_EV } from './sensorComparison'

const FF = { w: 36, h: 24, cropFactor: 1.0 }
const APSC = { w: 23.5, h: 15.6, cropFactor: 1.53 }
const VV = { w: 40.96, h: 21.6, cropFactor: 0.93 }   // area 884.7 vs FF 864 — within 0.15 EV
const SIX_BY_SEVEN = { w: 70, h: 56, cropFactor: 0.48 }

describe('compareSensors direction awareness', () => {
  it('attributes light to the larger sensor and reach to the smaller, whichever side it is', () => {
    const ab = compareSensors(FF, APSC)
    expect(ab.larger).toBe('a')
    expect(ab.smaller).toBe('b')
    const ba = compareSensors(APSC, FF)
    expect(ba.larger).toBe('b')
    expect(ba.smaller).toBe('a')
    // the physical facts are order-independent
    expect(ab.lightRatio).toBeCloseTo(ba.lightRatio, 6)
    expect(ab.reachFactor).toBeCloseTo(ba.reachFactor, 6)
    expect(ab.lightEvAbs).toBeCloseTo(ba.lightEvAbs, 6)
  })

  it('computes FF vs APS-C light and reach', () => {
    const c = compareSensors(FF, APSC)
    expect(c.lightRatio).toBeCloseTo(864 / 366.6, 3)   // ≈2.357
    expect(c.lightEvAbs).toBeCloseTo(1.237, 2)
    expect(c.reachFactor).toBeCloseTo(1.53, 3)         // 1.53 / 1.0
    expect(c.evDelta).toBeGreaterThan(0)               // A (FF) gathers more
  })

  it('flags a near-equal pair and zeroes the advantage fields', () => {
    const c = compareSensors(FF, VV)
    expect(Math.abs(c.evDelta)).toBeLessThan(NEAR_EQUAL_EV)
    expect(c.nearEqual).toBe(true)
    expect(c.larger).toBeNull()
    expect(c.smaller).toBeNull()
    expect(c.lightRatio).toBe(1)
    expect(c.reachFactor).toBe(1)
  })

  it('exposes both area ratios and both cross-focal directions', () => {
    const c = compareSensors(APSC, SIX_BY_SEVEN)
    expect(c.areaRatioAB).toBeCloseTo(366.6 / 3920, 4)
    expect(c.areaRatioBA).toBeCloseTo(3920 / 366.6, 3)
    expect(c.focalAonB).toBe(159)   // 50 * 1.53 / 0.48 = 159.4 → 159
    expect(c.focalBonA).toBe(16)    // 50 * 0.48 / 1.53 = 15.7 → 16
  })

  it('honours a custom focal length', () => {
    expect(compareSensors(FF, APSC, 85).focalAonB).toBe(56)  // 85 * 1 / 1.53 = 55.6 → 56
  })
})
