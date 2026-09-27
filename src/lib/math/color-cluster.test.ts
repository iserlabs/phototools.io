import { describe, it, expect } from 'vitest'
import { mulberry32, dominantColors } from './color-cluster'

/** Build an RGBA buffer from a function of (x, y). */
function image(width: number, height: number, px: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = px(x, y)
    const i = (y * width + x) * 4
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
  }
  return data
}

describe('mulberry32', () => {
  it('is deterministic for a seed and stays in [0,1)', () => {
    const a = mulberry32(7); const b = mulberry32(7)
    const xs = Array.from({ length: 5 }, () => a())
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()))
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) }
  })
})

describe('dominantColors', () => {
  const threeBlocks = image(30, 10, (x) => x < 10 ? [220, 30, 30] : x < 20 ? [30, 200, 60] : [40, 60, 220])

  it('recovers three pure colour blocks and drops empty clusters', () => {
    const picks = dominantColors(threeBlocks, 30, 10, { k: 5 })
    expect(picks.length).toBe(3)
    const reds = picks.filter((p) => p.rgb.r > 200)
    expect(reds).toHaveLength(1)
    expect(reds[0].x).toBeLessThan(10 / 30)
  })

  it('is deterministic for the same seed', () => {
    const a = dominantColors(threeBlocks, 30, 10, { seed: 3 })
    const b = dominantColors(threeBlocks, 30, 10, { seed: 3 })
    expect(a).toEqual(b)
  })

  it('returns pixel-centre coordinates in 0..1', () => {
    for (const p of dominantColors(threeBlocks, 30, 10)) {
      expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(1)
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(1)
    }
  })

  it('prefers chromatic pixels over a dominant neutral background', () => {
    // 90% mid-gray, 10% orange stripe → clustering must still return orange, not five grays
    const mostlyGray = image(100, 10, (x) => x < 10 ? [230, 120, 20] : [128, 128, 128])
    const picks = dominantColors(mostlyGray, 100, 10, { k: 5 })
    expect(picks.every((p) => p.rgb.r > 200 && p.rgb.g < 140)).toBe(true)
  })

  it('falls back to all pixels when almost nothing is chromatic', () => {
    const gray = image(20, 20, (x) => x === 0 ? [200, 20, 20] : [100, 100, 100])   // 5% chromatic exactly → below? 20/400 = 5%
    const picks = dominantColors(gray, 20, 20, { k: 2, chromaticMinFraction: 0.1 })
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.some((p) => p.rgb.r === 100)).toBe(true)
  })

  it('returns an empty list for an empty image', () => {
    expect(dominantColors(new Uint8ClampedArray(0), 0, 0)).toEqual([])
  })
})
