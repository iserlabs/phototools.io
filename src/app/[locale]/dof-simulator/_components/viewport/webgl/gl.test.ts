import { describe, it, expect } from 'vitest'
import { packTaps, uvRectForAspect } from './glTexture'

describe('packTaps', () => {
  it('flattens taps xy-interleaved', () => {
    expect(Array.from(packTaps([{ x: 1, y: 2 }, { x: 3, y: 4 }]))).toEqual([1, 2, 3, 4])
  })
})
describe('uvRectForAspect', () => {
  it('is identity when aspects match', () => {
    expect(uvRectForAspect(1.5, 1.5)).toEqual([0, 0, 1, 1])
  })
  it('crops width when texture is wider than view', () => {
    const [ox, , sx, sy] = uvRectForAspect(2, 1)
    expect(sy).toBe(1)
    expect(sx).toBeCloseTo(0.5, 6)
    expect(ox).toBeCloseTo(0.25, 6)
  })
  it('crops height when texture is taller than view', () => {
    const [, oy, sx, sy] = uvRectForAspect(1, 2)
    expect(sx).toBe(1)
    expect(sy).toBeCloseTo(0.5, 6)
    expect(oy).toBeCloseTo(0.25, 6)
  })
})
