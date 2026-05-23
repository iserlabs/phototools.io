import { describe, expect, it } from 'vitest'
import { aggregateCurationFunnel } from './curation-funnel'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateCurationFunnel', () => {
  it('builds a funnel: total → notRejected → rated≥1 → rated≥4', () => {
    const db = adaptForAggregators(createTestCatalog([
      // 1 rejected (drops out at notRejected)
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', pick: -1, rating: 0 },
      // 2 unflagged, rating 0 (counted in notRejected only)
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', pick: 0, rating: 0 },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1', pick: 0, rating: 0 },
      // 2 rated 2 (counted up through rated≥1)
      { id: 4, captureTime: '2024-01-04T10:00:00', cameraModel: 'A', lens: 'L1', pick: 1, rating: 2 },
      { id: 5, captureTime: '2024-01-05T10:00:00', cameraModel: 'A', lens: 'L1', pick: 0, rating: 2 },
      // 2 rated 5 (counted everywhere through rated≥4)
      { id: 6, captureTime: '2024-01-06T10:00:00', cameraModel: 'A', lens: 'L1', pick: 1, rating: 5 },
      { id: 7, captureTime: '2024-01-07T10:00:00', cameraModel: 'B', lens: 'L2', pick: 1, rating: 5 },
    ]))
    const r = aggregateCurationFunnel(db)
    expect(r.funnel.total).toBe(7)
    expect(r.funnel.notRejected).toBe(6)        // 7 minus the one rejected
    expect(r.funnel.rated1Plus).toBe(4)          // ratings 2, 2, 5, 5
    expect(r.funnel.rated4Plus).toBe(2)          // ratings 5, 5
  })

  it('computes per-body pick rate as rated≥4 / total', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', rating: 5 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', rating: 5 },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1', rating: 0 },
      { id: 4, captureTime: '2024-01-04T10:00:00', cameraModel: 'A', lens: 'L1', rating: 0 },
      { id: 5, captureTime: '2024-01-05T10:00:00', cameraModel: 'B', lens: 'L2', rating: 5 },
    ]))
    const r = aggregateCurationFunnel(db)
    const a = r.pickRateByBody.find((b) => b.body === 'A')
    const b = r.pickRateByBody.find((b) => b.body === 'B')
    expect(a).toEqual({ body: 'A', total: 4, rated4Plus: 2, pickRatePct: 50 })
    expect(b).toEqual({ body: 'B', total: 1, rated4Plus: 1, pickRatePct: 100 })
  })

  it('computes per-lens pick rate', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', rating: 5 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', rating: 0 },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L2', rating: 4 },
    ]))
    const r = aggregateCurationFunnel(db)
    const l1 = r.pickRateByLens.find((l) => l.lens === 'L1')
    const l2 = r.pickRateByLens.find((l) => l.lens === 'L2')
    expect(l1?.pickRatePct).toBe(50)
    expect(l2?.pickRatePct).toBe(100)
  })

  it('handles an empty catalog with all-zero funnel and empty tables', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateCurationFunnel(db)
    expect(r.funnel).toEqual({ total: 0, notRejected: 0, rated1Plus: 0, rated4Plus: 0 })
    expect(r.pickRateByBody).toEqual([])
    expect(r.pickRateByLens).toEqual([])
  })

  it('respects the date-range filter', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2023-12-31T10:00:00', cameraModel: 'A', lens: 'L1', rating: 5 },
      { id: 2, captureTime: '2024-06-15T10:00:00', cameraModel: 'A', lens: 'L1', rating: 5 },
      { id: 3, captureTime: '2024-06-16T10:00:00', cameraModel: 'A', lens: 'L1', rating: 0 },
    ]))
    const r = aggregateCurationFunnel(db, { dateRange: { start: '2024-01-01', end: '2024-12-31' } })
    expect(r.funnel.total).toBe(2)
    expect(r.funnel.rated4Plus).toBe(1)
  })
})
