import { describe, it, expect } from 'vitest'
import { RULER_MIN, RULER_MAX, distToX, xToDist, rulerTicks } from './rulerScale'

describe('rulerScale', () => {
  it('exports the documented axis bounds', () => {
    expect(RULER_MIN).toBe(0.3)
    expect(RULER_MAX).toBe(50)
  })

  describe('distToX', () => {
    it('maps RULER_MIN to x=0', () => {
      expect(distToX(0.3, 800)).toBe(0)
    })
    it('maps RULER_MAX to x=widthPx', () => {
      expect(distToX(50, 800)).toBe(800)
    })
    it('pins distances past RULER_MAX to widthPx (the ∞ zone)', () => {
      expect(distToX(1000, 800)).toBe(800)
    })
    it('pins Infinity to widthPx without producing NaN', () => {
      const x = distToX(Infinity, 800)
      expect(x).toBe(800)
      expect(Number.isNaN(x)).toBe(false)
    })
    it('clamps distances below RULER_MIN to x=0', () => {
      expect(distToX(0.05, 800)).toBe(0)
    })
    it('is monotonically increasing across the visible tick range', () => {
      const xs = rulerTicks().map((m) => distToX(m, 800))
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]).toBeGreaterThan(xs[i - 1])
      }
    })
  })

  describe('xToDist', () => {
    it('inverts distToX', () => {
      expect(xToDist(distToX(5, 800), 800)).toBeCloseTo(5, 5)
    })
    it('maps x=0 to RULER_MIN', () => {
      expect(xToDist(0, 800)).toBeCloseTo(RULER_MIN, 5)
    })
    it('maps x=widthPx to RULER_MAX', () => {
      expect(xToDist(800, 800)).toBeCloseTo(RULER_MAX, 5)
    })
  })

  describe('rulerTicks', () => {
    it('returns the fixed ascending tick set', () => {
      expect(rulerTicks()).toEqual([0.3, 0.5, 1, 2, 3, 5, 10, 15, 25, 50])
    })
  })
})
