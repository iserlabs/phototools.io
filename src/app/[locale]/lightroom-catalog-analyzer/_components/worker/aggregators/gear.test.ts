import { describe, expect, it } from 'vitest'
import { aggregateGear } from './gear'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateGear', () => {
  it('returns top lenses sorted by count', () => {
    const photos = [
      ...Array.from({ length: 10 }, (_, i) => ({ id: i + 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1' })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: i + 100, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L2' })),
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateGear(db)
    expect(r.topLenses[0]).toEqual({ lens: 'L1', count: 10 })
    expect(r.topLenses[1]).toEqual({ lens: 'L2', count: 3 })
  })

  it('returns top body+lens combos', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 2, captureTime: '2024-02-01T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 3, captureTime: '2024-03-01T10:00:00', cameraModel: 'B', lens: 'L2' },
    ]))
    const r = aggregateGear(db)
    expect(r.topCombos[0]).toEqual({
      body: 'A', lens: 'L1', count: 2,
      firstUsed: '2024-01-01T10:00:00',
      lastUsed: '2024-02-01T10:00:00',
    })
  })

  it('flags retired gear (no photos in last 12 months relative to catalog end)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2022-01-01T10:00:00', cameraModel: 'OldBody', lens: 'L1' },
      { id: 2, captureTime: '2024-12-01T10:00:00', cameraModel: 'NewBody', lens: 'L1' },
    ]))
    const r = aggregateGear(db)
    expect(r.retired.find((e) => e.name === 'OldBody')).toBeTruthy()
    expect(r.retired.find((e) => e.name === 'NewBody')).toBeFalsy()
  })

  it('buckets photos-by-body monthly', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-15T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 2, captureTime: '2024-01-20T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 3, captureTime: '2024-02-10T10:00:00', cameraModel: 'A', lens: 'L1' },
    ]))
    const r = aggregateGear(db)
    const jan = r.bodiesOverTime.find((e) => e.month === '2024-01' && e.body === 'A')
    const feb = r.bodiesOverTime.find((e) => e.month === '2024-02' && e.body === 'A')
    expect(jan?.count).toBe(2)
    expect(feb?.count).toBe(1)
  })
})
