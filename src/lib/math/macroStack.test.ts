import { describe, it, expect } from 'vitest'
import { calcMacroStack, macroShots } from './macroStack'

const BASE = { magnification: 1, aperture: 8, coc: 0.03, subjectDepthMm: 10, overlapPct: 0.2 }

describe('calcMacroStack', () => {
  it('1:1 at f/8 FF: effective aperture f/16, slice ≈ 0.96mm', () => {
    const r = calcMacroStack(BASE)
    expect(r.effectiveAperture).toBeCloseTo(16, 5)
    expect(r.sliceDofMm).toBeCloseTo(0.96, 2) // 2*0.03*8*2/1
  })
  it('step = slice × (1 - overlap); count covers the depth', () => {
    const r = calcMacroStack(BASE)
    expect(r.stepMm).toBeCloseTo(0.768, 3)
    expect(r.sliceDofMm + (r.shotCount - 1) * r.stepMm).toBeGreaterThanOrEqual(10)
    expect(r.coverageComplete).toBe(true)
  })
  it('single shot when depth fits one slice', () => {
    const r = calcMacroStack({ ...BASE, subjectDepthMm: 0.5 })
    expect(r.shotCount).toBe(1)
    expect(r.railTravelMm).toBe(0)
  })
  it('flags diffraction at 2× f/11 on FF (effective f/33)', () => {
    const r = calcMacroStack({ ...BASE, magnification: 2, aperture: 11 })
    expect(r.effectiveAperture).toBeCloseTo(33, 5)
    expect(r.diffractionLimited).toBe(true)
    expect(r.maxSharpAperture).toBeCloseTo(0.03 / (2.44 * 0.00055 * 3), 2)
  })
  it('does not flag 1:1 f/8 FF (effective f/16, airy 0.0215 < 0.03)', () => {
    expect(calcMacroStack(BASE).diffractionLimited).toBe(false)
  })
  it('caps at 300 shots and reports incomplete coverage', () => {
    const r = calcMacroStack({ magnification: 5, aperture: 2.8, coc: 0.005, subjectDepthMm: 500, overlapPct: 0.5 })
    expect(r.shotCount).toBe(300)
    expect(r.coverageComplete).toBe(false)
  })
})

describe('macroShots', () => {
  it('synthesizes uniform slices at rail positions k·step', () => {
    const r = calcMacroStack(BASE)
    const rows = macroShots(r)
    expect(rows.length).toBe(r.shotCount)
    expect(rows[0]).toEqual({ number: 1, railPositionMm: 0, sliceStartMm: 0, sliceEndMm: r.sliceDofMm })
    expect(rows[2].railPositionMm).toBeCloseTo(2 * r.stepMm, 6)
    expect(rows[rows.length - 1].sliceEndMm).toBeGreaterThanOrEqual(10)
  })
})
