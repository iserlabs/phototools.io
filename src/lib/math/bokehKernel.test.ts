import { describe, it, expect } from 'vitest'
import { generateKernel, insideShape, ngonVertices, TAP_COUNT } from './bokehKernel'

describe('bokehKernel', () => {
  it('produces exactly TAP_COUNT taps', () => {
    expect(generateKernel('disc')).toHaveLength(TAP_COUNT)
    expect(generateKernel('blade5')).toHaveLength(TAP_COUNT)
  })
  it('is deterministic for a given seed', () => {
    expect(generateKernel('blade7', TAP_COUNT, 7)).toEqual(generateKernel('blade7', TAP_COUNT, 7))
  })
  it('centroid is ~zero (no image shift)', () => {
    for (const shape of ['disc', 'blade6', 'cata'] as const) {
      const taps = generateKernel(shape)
      const cx = taps.reduce((a, t) => a + t.x, 0) / taps.length
      const cy = taps.reduce((a, t) => a + t.y, 0) / taps.length
      expect(Math.abs(cx)).toBeLessThan(1e-9)
      expect(Math.abs(cy)).toBeLessThan(1e-9)
    }
  })
  it('taps stay within unit-ish radius after recentering', () => {
    const taps = generateKernel('blade5')
    expect(Math.max(...taps.map((t) => Math.hypot(t.x, t.y)))).toBeLessThanOrEqual(1.25)
  })
  it('insideShape: annulus excludes the center', () => {
    expect(insideShape(0, 0, 'cata')).toBe(false)
    expect(insideShape(0.85, 0, 'cata')).toBe(true)
    expect(insideShape(0, 0, 'disc')).toBe(true)
  })
  it('ngonVertices returns n points on the unit circle', () => {
    const v = ngonVertices(6)
    expect(v).toHaveLength(6)
    for (const p of v) expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 6)
  })
})
