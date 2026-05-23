import { describe, expect, it } from 'vitest'
import { aggregateTimeOfDay } from './time-of-day'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateTimeOfDay', () => {
  it('returns zeroed buckets on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateTimeOfDay(db)
    expect(r.byClockHour).toHaveLength(24)
    expect(r.byClockHour.every((b) => b.count === 0)).toBe(true)
    expect(r.bySunAngle.gpsPhotosCount).toBe(0)
    expect(r.perGearByClockHour).toEqual([])
  })

  it('buckets photos by clock hour', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T06:30:00', cameraModel: 'A', lens: 'L' },
      { id: 2, captureTime: '2024-01-01T06:45:00', cameraModel: 'A', lens: 'L' },
      { id: 3, captureTime: '2024-01-01T12:00:00', cameraModel: 'A', lens: 'L' },
      { id: 4, captureTime: '2024-01-01T23:15:00', cameraModel: 'A', lens: 'L' },
    ]))
    const r = aggregateTimeOfDay(db)
    expect(r.byClockHour[6].count).toBe(2)
    expect(r.byClockHour[12].count).toBe(1)
    expect(r.byClockHour[23].count).toBe(1)
  })

  it('classifies sun-angle buckets only for GPS photos (v1 crude buckets)', () => {
    const db = adaptForAggregators(createTestCatalog([
      // Morning/golden — hour 7 with GPS
      { id: 1, captureTime: '2024-01-01T07:30:00', cameraModel: 'A', lens: 'L', gpsLat: 40, gpsLng: -74 },
      // Midday — hour 13 with GPS
      { id: 2, captureTime: '2024-01-01T13:00:00', cameraModel: 'A', lens: 'L', gpsLat: 40, gpsLng: -74 },
      // Evening/golden — hour 19 with GPS
      { id: 3, captureTime: '2024-01-01T19:00:00', cameraModel: 'A', lens: 'L', gpsLat: 40, gpsLng: -74 },
      // Blue hour — hour 20 with GPS
      { id: 4, captureTime: '2024-01-01T20:30:00', cameraModel: 'A', lens: 'L', gpsLat: 40, gpsLng: -74 },
      // Night — hour 2 with GPS
      { id: 5, captureTime: '2024-01-01T02:00:00', cameraModel: 'A', lens: 'L', gpsLat: 40, gpsLng: -74 },
      // No GPS — should not count toward sun-angle
      { id: 6, captureTime: '2024-01-01T12:00:00', cameraModel: 'A', lens: 'L' },
    ]))
    const r = aggregateTimeOfDay(db)
    expect(r.bySunAngle.gpsPhotosCount).toBe(5)
    expect(r.bySunAngle.goldenHour).toBe(2) // hours 7 + 19
    expect(r.bySunAngle.midday).toBe(1) // hour 13
    expect(r.bySunAngle.blueHour).toBe(1) // hour 20
    expect(r.bySunAngle.night).toBe(1) // hour 2
  })

  it('builds per-gear clock-hour breakdown for top gear', () => {
    const photos = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L1',
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: i + 100, captureTime: '2024-01-01T15:00:00',
        cameraModel: 'A', lens: 'L1',
      })),
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateTimeOfDay(db)
    const lens = r.perGearByClockHour.find((g) => g.gear === 'L1')
    expect(lens).toBeTruthy()
    expect(lens?.histogram.find((b) => b.hour === 10)?.count).toBe(5)
    expect(lens?.histogram.find((b) => b.hour === 15)?.count).toBe(3)
  })

  it('respects AnalysisFilter (date range)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2023-06-01T10:00:00', cameraModel: 'A', lens: 'L' },
      { id: 2, captureTime: '2024-06-01T15:00:00', cameraModel: 'A', lens: 'L' },
    ]))
    const r = aggregateTimeOfDay(db, { dateRange: { start: '2024-01-01', end: '2024-12-31' } })
    expect(r.byClockHour[10].count).toBe(0)
    expect(r.byClockHour[15].count).toBe(1)
  })
})
