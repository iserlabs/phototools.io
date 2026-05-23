import { describe, expect, it } from 'vitest'
import { aggregateFocalLength } from './focal-length'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateFocalLength', () => {
  it('returns an empty block on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateFocalLength(db)
    expect(r.histogram).toEqual([])
    expect(r.topPeaks).toEqual([])
    expect(r.bestOnePrime).toBe(null)
  })

  it('handles a single photo', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', focalLength: 50, cropFactor: 1 },
    ]))
    const r = aggregateFocalLength(db)
    expect(r.histogram).toEqual([{ mm: 50, count: 1 }])
    expect(r.topPeaks[0]).toEqual({ mm: 50, pctOfTotal: 100 })
    // single photo at 50mm — best prime is 50 with 100% coverage
    expect(r.bestOnePrime).toEqual({ mm: 50, coveragePct: 100 })
  })

  it('applies crop factor to produce 35mm-equivalent bins', () => {
    // APS-C 35mm physical × 1.5 crop = 52.5mm equivalent → Math.round(52.5) = 53.
    // (The plan comment's "52" was loose arithmetic; standard half-up rounding
    // of 52.5 is 53. What matters is the crop factor is applied, not left at 35.)
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', focalLength: 35, cropFactor: 1.5 },
    ]))
    const r = aggregateFocalLength(db)
    expect(r.histogram[0].mm).toBe(53)
  })

  it('drops focal lengths outside 8..800 mm', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', focalLength: 5, cropFactor: 1 },
      { id: 2, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', focalLength: 1000, cropFactor: 1 },
      { id: 3, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', focalLength: 50, cropFactor: 1 },
    ]))
    const r = aggregateFocalLength(db)
    expect(r.histogram).toEqual([{ mm: 50, count: 1 }])
  })

  it('recommends 35mm prime when ≥30% of shots fall in 26..44mm (35 ± 25%)', () => {
    // 70 shots at 35mm, 30 shots at 200mm → 70% within 35 ± 25%
    const photos = [
      ...Array.from({ length: 70 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', focalLength: 35, cropFactor: 1,
      })),
      ...Array.from({ length: 30 }, (_, i) => ({
        id: i + 1000, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', focalLength: 200, cropFactor: 1,
      })),
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateFocalLength(db)
    expect(r.bestOnePrime?.mm).toBe(35)
    expect(r.bestOnePrime?.coveragePct).toBeGreaterThanOrEqual(30)
  })

  it('returns null bestOnePrime when no prime covers ≥30%', () => {
    // Spread across 8 wildly different focal lengths so no F ± 25% bucket reaches 30%.
    const focals = [14, 24, 50, 85, 135, 200, 400, 600]
    const photos = focals.flatMap((mm, i) =>
      Array.from({ length: 12 }, (_, j) => ({
        id: i * 100 + j + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', focalLength: mm, cropFactor: 1,
      })),
    )
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateFocalLength(db)
    expect(r.bestOnePrime).toBe(null)
  })

  it('applies AnalysisFilter (date range) to histogram', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2023-06-01T10:00:00', cameraModel: 'A', lens: 'L', focalLength: 24, cropFactor: 1 },
      { id: 2, captureTime: '2024-06-01T10:00:00', cameraModel: 'A', lens: 'L', focalLength: 85, cropFactor: 1 },
    ]))
    const r = aggregateFocalLength(db, { dateRange: { start: '2024-01-01', end: '2024-12-31' } })
    expect(r.histogram).toEqual([{ mm: 85, count: 1 }])
  })
})
