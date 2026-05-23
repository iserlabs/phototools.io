import { describe, expect, it } from 'vitest'
import { aggregateHeatmap } from './heatmap'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateHeatmap', () => {
  it('returns empty on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateHeatmap(db)
    expect(r.byDay).toEqual([])
    expect(r.years).toEqual([])
  })

  it('handles a single photo on one day', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-03-15T10:00:00', cameraModel: 'A', lens: 'L1' },
    ]))
    const r = aggregateHeatmap(db)
    expect(r.byDay).toEqual([{ date: '2024-03-15', count: 1, topLens: 'L1' }])
    expect(r.years).toEqual([2024])
  })

  it('counts photos per day and surfaces the top lens that day', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-03-15T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 2, captureTime: '2024-03-15T11:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 3, captureTime: '2024-03-15T12:00:00', cameraModel: 'A', lens: 'L2' },
      { id: 4, captureTime: '2024-03-16T10:00:00', cameraModel: 'A', lens: 'L2' },
    ]))
    const r = aggregateHeatmap(db)
    const mar15 = r.byDay.find((d) => d.date === '2024-03-15')
    const mar16 = r.byDay.find((d) => d.date === '2024-03-16')
    expect(mar15?.count).toBe(3)
    expect(mar15?.topLens).toBe('L1')
    expect(mar16?.count).toBe(1)
    expect(mar16?.topLens).toBe('L2')
  })

  it('includes every year that has at least one photo', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2022-01-01T10:00:00', cameraModel: 'A', lens: 'L' },
      { id: 2, captureTime: '2023-06-15T10:00:00', cameraModel: 'A', lens: 'L' },
      { id: 3, captureTime: '2025-12-31T10:00:00', cameraModel: 'A', lens: 'L' },
    ]))
    const r = aggregateHeatmap(db)
    expect(r.years).toEqual([2022, 2023, 2025])
  })

  it('returns null topLens when a day has no lens info', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-03-15T10:00:00', cameraModel: 'A' },
    ]))
    const r = aggregateHeatmap(db)
    expect(r.byDay[0].topLens).toBe(null)
  })

  it('respects AnalysisFilter (date range narrows years and days)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2023-12-31T10:00:00', cameraModel: 'A', lens: 'L' },
      { id: 2, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L' },
      { id: 3, captureTime: '2024-12-31T10:00:00', cameraModel: 'A', lens: 'L' },
    ]))
    // The Plan 1a filter compares captureTime as a raw string against the
    // end bound, so a date-only end ('2024-12-31') lexically excludes an
    // end-of-day timestamp on that day. A real caller includes the full last
    // day with an end-of-day bound — match that contract here.
    const r = aggregateHeatmap(db, { dateRange: { start: '2024-01-01', end: '2024-12-31T23:59:59' } })
    expect(r.years).toEqual([2024])
    expect(r.byDay.map((d) => d.date).sort()).toEqual(['2024-01-01', '2024-12-31'])
  })
})
