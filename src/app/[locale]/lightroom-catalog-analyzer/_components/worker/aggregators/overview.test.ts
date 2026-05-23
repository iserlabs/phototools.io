import { describe, expect, it } from 'vitest'
import { aggregateOverview } from './overview'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateOverview', () => {
  it('reports counts, range, and top gear', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'Sony A7R V', lens: '24-70mm', focalLength: 35 },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'Sony A7R V', lens: '24-70mm', focalLength: 35 },
      { id: 3, captureTime: '2024-06-01T10:00:00', cameraModel: 'Fuji X100V', lens: '23mm', focalLength: 23 },
    ]))
    const r = aggregateOverview(db)
    expect(r.totalPhotos).toBe(3)
    expect(r.dateRange.first).toBe('2024-01-01T10:00:00')
    expect(r.dateRange.last).toBe('2024-06-01T10:00:00')
    expect(r.bodyCount).toBe(2)
    expect(r.lensCount).toBe(2)
    expect(r.topBody).toBe('Sony A7R V')
    expect(r.topLens).toBe('24-70mm')
    expect(r.topFocalLengthMm).toBe(35)
  })

  it('handles an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateOverview(db)
    expect(r.totalPhotos).toBe(0)
    expect(r.bodyCount).toBe(0)
    expect(r.topBody).toBe(null)
  })

  it('counts distinct days shot', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00' },
      { id: 2, captureTime: '2024-01-01T11:00:00' },
      { id: 3, captureTime: '2024-01-02T10:00:00' },
    ]))
    expect(aggregateOverview(db).daysShot).toBe(2)
  })
})
