import { describe, expect, it } from 'vitest'
import { bucketFocalLengths } from './focalLengthBuckets'

describe('bucketFocalLengths', () => {
  it('returns [] for an empty histogram', () => {
    expect(bucketFocalLengths([])).toEqual([])
  })

  it('passes through unbucketed when distinct values fit in targetBuckets', () => {
    const hist = [
      { mm: 24, count: 10 },
      { mm: 35, count: 20 },
      { mm: 50, count: 5 },
    ]
    const out = bucketFocalLengths(hist, 8, 35)
    expect(out.map((b) => b.label)).toEqual(['24mm', '35mm', '50mm'])
    expect(out.map((b) => b.count)).toEqual([10, 20, 5])
    expect(out.find((b) => b.highlight)?.start).toBe(35)
  })

  it('groups many values into at most ~targetBuckets ranges and preserves the total', () => {
    // 70..200mm, one shot at each mm → 131 distinct values.
    const hist = Array.from({ length: 131 }, (_, i) => ({ mm: 70 + i, count: 1 }))
    const out = bucketFocalLengths(hist, 8)
    expect(out.length).toBeLessThanOrEqual(9) // targetBuckets, +1 for the trailing remainder
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(131)
    // Labels read as ranges, ascending, starting at the data min.
    expect(out[0]!.start).toBe(70)
    expect(out[0]!.label).toMatch(/^70–\d+mm$/)
  })

  it('highlights the bucket that contains highlightMm', () => {
    const hist = Array.from({ length: 131 }, (_, i) => ({ mm: 70 + i, count: 1 }))
    const out = bucketFocalLengths(hist, 8, 90)
    const highlighted = out.filter((b) => b.highlight)
    expect(highlighted).toHaveLength(1)
    expect(90).toBeGreaterThanOrEqual(highlighted[0]!.start)
  })
})
