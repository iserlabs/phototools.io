import { describe, expect, it } from 'vitest'
import { aggregateFocalLengthPerZoom } from './focal-length-per-zoom'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateFocalLengthPerZoom', () => {
  it('returns empty zooms on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    expect(aggregateFocalLengthPerZoom(db).zooms).toEqual([])
  })

  it('ignores primes (lenses with <3 distinct focal lengths)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '50mm prime', focalLength: 50 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: '50mm prime', focalLength: 50 },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: '50mm prime', focalLength: 50 },
    ]))
    expect(aggregateFocalLengthPerZoom(db).zooms).toEqual([])
  })

  it('detects a zoom lens with ≥3 distinct focal lengths', () => {
    const photos = [
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 24 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 35 },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 70 },
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateFocalLengthPerZoom(db)
    expect(r.zooms).toHaveLength(1)
    expect(r.zooms[0].lens).toBe('24-70mm')
    expect(r.zooms[0].histogram).toHaveLength(3)
  })

  it('computes topMm and topMmPct for a zoom', () => {
    const photos = [
      ...Array.from({ length: 6 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: '24-70mm', focalLength: 24,
      })),
      { id: 100, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 35 },
      { id: 101, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 70 },
      { id: 102, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 70 },
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateFocalLengthPerZoom(db)
    expect(r.zooms[0].topMm).toBe(24)
    // 6 of 9 shots at 24mm = 66.67%
    expect(r.zooms[0].topMmPct).toBeCloseTo(66.67, 1)
  })

  it('returns top 6 zooms ordered by shot count', () => {
    const lenses = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7']
    const photos = lenses.flatMap((lens, lensIdx) =>
      // Each zoom gets 3 distinct focal lengths; Z1 gets the most shots, Z7 the fewest.
      [24, 35, 70].flatMap((fl, flIdx) =>
        Array.from({ length: 10 - lensIdx }, (_, i) => ({
          id: lensIdx * 1000 + flIdx * 100 + i + 1,
          captureTime: '2024-01-01T10:00:00',
          cameraModel: 'A',
          lens, focalLength: fl,
        })),
      ),
    )
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateFocalLengthPerZoom(db)
    expect(r.zooms.map((z) => z.lens)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6'])
  })

  it('respects AnalysisFilter (camera filter narrows the set)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 24 },
      { id: 2, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 35 },
      { id: 3, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: '24-70mm', focalLength: 70 },
      { id: 4, captureTime: '2024-01-01T10:00:00', cameraModel: 'B', lens: '70-200mm', focalLength: 70 },
      { id: 5, captureTime: '2024-01-01T10:00:00', cameraModel: 'B', lens: '70-200mm', focalLength: 135 },
      { id: 6, captureTime: '2024-01-01T10:00:00', cameraModel: 'B', lens: '70-200mm', focalLength: 200 },
    ]))
    const r = aggregateFocalLengthPerZoom(db, { cameras: ['A'] })
    expect(r.zooms.map((z) => z.lens)).toEqual(['24-70mm'])
  })
})
