import { describe, expect, it } from 'vitest'
import { aggregateApertureSweetSpot } from './aperture-sweet-spot'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateApertureSweetSpot', () => {
  it('returns empty perLens on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    expect(aggregateApertureSweetSpot(db).perLens).toEqual([])
  })

  it('ignores lenses with fewer than 100 photos', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', aperture: 1.4 },
      { id: 2, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', aperture: 2.8 },
    ]))
    expect(aggregateApertureSweetSpot(db).perLens).toEqual([])
  })

  it('includes lenses with ≥100 photos and builds histogram', () => {
    const photos = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1, captureTime: '2024-01-01T10:00:00',
      cameraModel: 'A', lens: '50mm f/1.4',
      aperture: i < 70 ? 1.4 : i < 90 ? 2.8 : 5.6,
    }))
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateApertureSweetSpot(db)
    expect(r.perLens).toHaveLength(1)
    const lens = r.perLens[0]
    expect(lens.lens).toBe('50mm f/1.4')
    expect(lens.histogram).toEqual([
      { aperture: 1.4, count: 70 },
      { aperture: 2.8, count: 20 },
      { aperture: 5.6, count: 10 },
    ])
    // Wide-open is the smallest f-number observed (1.4); 70/100 = 70%.
    expect(lens.wideOpenPct).toBe(70)
  })

  it('orders perLens by shot count descending', () => {
    const photos = [
      ...Array.from({ length: 150 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'A-lens', aperture: 2.8,
      })),
      ...Array.from({ length: 100 }, (_, i) => ({
        id: i + 1000, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'B-lens', aperture: 5.6,
      })),
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateApertureSweetSpot(db)
    expect(r.perLens.map((p) => p.lens)).toEqual(['A-lens', 'B-lens'])
  })

  it('respects AnalysisFilter (camera filter changes which lenses qualify)', () => {
    const photos = [
      ...Array.from({ length: 100 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L1', aperture: 1.4,
      })),
      ...Array.from({ length: 100 }, (_, i) => ({
        id: i + 1000, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'B', lens: 'L2', aperture: 2.8,
      })),
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateApertureSweetSpot(db, { cameras: ['A'] })
    expect(r.perLens.map((p) => p.lens)).toEqual(['L1'])
  })
})
