import { describe, expect, it } from 'vitest'
import { aggregateRatings } from './ratings'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateRatings', () => {
  it('counts rating distribution and treats pick=-1 as rejected (regardless of stars)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', pick: -1, rating: 0 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', pick: -1, rating: 5 },   // still rejected
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1', pick: 0, rating: 0 },
      { id: 4, captureTime: '2024-01-04T10:00:00', cameraModel: 'A', lens: 'L1', pick: 0, rating: 1 },
      { id: 5, captureTime: '2024-01-05T10:00:00', cameraModel: 'A', lens: 'L1', pick: 1, rating: 2 },
      { id: 6, captureTime: '2024-01-06T10:00:00', cameraModel: 'A', lens: 'L1', pick: 1, rating: 3 },
      { id: 7, captureTime: '2024-01-07T10:00:00', cameraModel: 'A', lens: 'L1', pick: 1, rating: 4 },
      { id: 8, captureTime: '2024-01-08T10:00:00', cameraModel: 'A', lens: 'L1', pick: 1, rating: 5 },
    ]))
    const r = aggregateRatings(db)
    expect(r.distribution).toEqual({
      rejected: 2, r0: 1, r1: 1, r2: 1, r3: 1, r4: 1, r5: 1,
    })
  })

  it('groups color labels by raw string, ordered by count desc', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', colorLabel: 'Red' },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', colorLabel: 'Red' },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1', colorLabel: 'Wedding 2024' },
      { id: 4, captureTime: '2024-01-04T10:00:00', cameraModel: 'A', lens: 'L1', colorLabel: 'Wedding 2024' },
      { id: 5, captureTime: '2024-01-05T10:00:00', cameraModel: 'A', lens: 'L1', colorLabel: 'Wedding 2024' },
      { id: 6, captureTime: '2024-01-06T10:00:00', cameraModel: 'A', lens: 'L1' }, // no label → not counted
    ]))
    const r = aggregateRatings(db)
    expect(r.colorLabels).toEqual([
      { label: 'Wedding 2024', count: 3 },
      { label: 'Red', count: 2 },
    ])
  })

  it('reports pick-rate-by-body and -by-lens with pct rounded to 1 decimal', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', rating: 5 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', rating: 0 },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1', rating: 0 },
    ]))
    const r = aggregateRatings(db)
    const body = r.pickRateByBody.find((b) => b.body === 'A')
    expect(body?.pickRatePct).toBeCloseTo(33.3, 1)
  })

  it('handles an empty catalog cleanly', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateRatings(db)
    expect(r.distribution).toEqual({ rejected: 0, r0: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 })
    expect(r.colorLabels).toEqual([])
    expect(r.pickRateByBody).toEqual([])
    expect(r.pickRateByLens).toEqual([])
  })

  it('respects the cameras filter', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', rating: 5 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'B', lens: 'L1', rating: 5 },
    ]))
    const r = aggregateRatings(db, { cameras: ['A'] })
    expect(r.distribution.r5).toBe(1)
  })
})
