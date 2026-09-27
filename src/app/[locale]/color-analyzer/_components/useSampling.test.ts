import { describe, it, expect } from 'vitest'
import { patchAverage } from './useSampling'

function solid(width: number, height: number, rgb: [number, number, number], override?: (x: number, y: number) => [number, number, number] | null) {
  const d = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = override?.(x, y) ?? rgb
    const i = (y * width + x) * 4
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255
  }
  return d
}

describe('patchAverage', () => {
  it('averages a 5×5 patch', () => {
    // 10×10 image, all (100,100,100) except the centre pixel (5,5) which is (200,200,200)
    const d = solid(10, 10, [100, 100, 100], (x, y) => (x === 5 && y === 5 ? [200, 200, 200] : null))
    const avg = patchAverage(d, 10, 10, 5, 5, 5)
    // 24 × 100 + 1 × 200 = 2600 / 25 = 104
    expect(avg).toEqual({ r: 104, g: 104, b: 104 })
  })

  it('clamps the patch at the image edge instead of reading out of range', () => {
    const d = solid(10, 10, [50, 60, 70], (x, y) => (x === 0 && y === 0 ? [250, 60, 70] : null))
    // patch centred at (0,0) covers x 0..2, y 0..2 → 9 pixels, one of them 250
    const avg = patchAverage(d, 10, 10, 0, 0, 5)
    expect(avg.r).toBe(Math.round((8 * 50 + 250) / 9))
    expect(avg.g).toBe(60)
  })

  it('rounds to integers', () => {
    const d = solid(3, 3, [1, 2, 3], (x) => (x === 0 ? [2, 2, 3] : null))
    const avg = patchAverage(d, 3, 3, 1, 1, 3)
    expect(Number.isInteger(avg.r)).toBe(true)
  })
})
