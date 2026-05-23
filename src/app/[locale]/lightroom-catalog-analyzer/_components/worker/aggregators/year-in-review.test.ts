import { describe, expect, it } from 'vitest'
import { aggregateYearInReview } from './year-in-review'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

// Monotonic id counter so multiple genPhotos() calls in one catalog never
// collide on id_local (the plan's original year*10000+month*100+i formula
// produced duplicate ids whenever two calls shared year+month).
let nextPhotoId = 1
function genPhotos(year: number, count: number, opts: { body?: string; lens?: string; fl?: number; aperture?: number; month?: number; hour?: number } = {}) {
  const month = opts.month ?? 1
  const hour = opts.hour ?? 10
  return Array.from({ length: count }, (_, i) => ({
    id: nextPhotoId++,
    captureTime: `${year}-${String(month).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`,
    cameraModel: opts.body ?? 'Sony A7R V',
    lens: opts.lens ?? '24-70mm f/2.8',
    focalLength: opts.fl ?? 35,
    aperture: opts.aperture ?? 2.8,
  }))
}

describe('aggregateYearInReview', () => {
  it('reports totals, top gear, and most-prolific month for a single year', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 50, { month: 8, body: 'Sony A7R V', lens: '24-70mm f/2.8', fl: 35 }),
      ...genPhotos(2024, 20, { month: 3, body: 'Fuji X100V', lens: '23mm fixed', fl: 23 }),
      ...genPhotos(2023, 100, { month: 6 }),
    ]))
    const r = aggregateYearInReview(db, 2024)
    expect(r.year).toBe(2024)
    expect(r.totalPhotos).toBe(70)
    expect(r.topBody).toBe('Sony A7R V')
    expect(r.topLens).toBe('24-70mm f/2.8')
    expect(r.topFocalLengthMm).toBe(35)
    expect(r.mostProlificMonth?.month).toBe('2024-08')
    expect(r.mostProlificMonth?.count).toBe(50)
  })

  it('filters out other years entirely', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 10),
      ...genPhotos(2023, 999),
    ]))
    expect(aggregateYearInReview(db, 2024).totalPhotos).toBe(10)
    expect(aggregateYearInReview(db, 2023).totalPhotos).toBe(999)
  })

  it('handles a year with no photos', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 10),
    ]))
    const r = aggregateYearInReview(db, 2099)
    expect(r.totalPhotos).toBe(0)
    expect(r.topBody).toBe(null)
    expect(r.mostProlificMonth).toBe(null)
    expect(r.monthlyVolume).toHaveLength(12)
    expect(r.monthlyVolume.every((m) => m.count === 0)).toBe(true)
  })

  it('emits a 12-row monthlyVolume (zero-filled)', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 5, { month: 1 }),
      ...genPhotos(2024, 3, { month: 7 }),
    ]))
    const r = aggregateYearInReview(db, 2024)
    expect(r.monthlyVolume).toHaveLength(12)
    expect(r.monthlyVolume[0]).toEqual({ month: '2024-01', count: 5 })
    expect(r.monthlyVolume[6]).toEqual({ month: '2024-07', count: 3 })
    expect(r.monthlyVolume[5]).toEqual({ month: '2024-06', count: 0 })
  })

  it('reports top 5 gear share as percentages summing to ≤ 100', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 60, { body: 'A', lens: 'L1' }),
      ...genPhotos(2024, 30, { body: 'A', lens: 'L2' }),
      ...genPhotos(2024, 10, { body: 'B', lens: 'L3' }),
    ]))
    const r = aggregateYearInReview(db, 2024)
    expect(r.topGearShare.length).toBeLessThanOrEqual(5)
    const sum = r.topGearShare.reduce((a, b) => a + b.pct, 0)
    expect(sum).toBeLessThanOrEqual(100.01)
    expect(sum).toBeGreaterThan(99.9)
  })

  it('reports the top lens used in the most-prolific month', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 30, { month: 8, lens: 'BusySummerLens' }),
      ...genPhotos(2024, 10, { month: 8, lens: 'OtherLens' }),
      ...genPhotos(2024, 5, { month: 2, lens: 'WinterLens' }),
    ]))
    const r = aggregateYearInReview(db, 2024)
    expect(r.mostProlificMonth?.month).toBe('2024-08')
    expect(r.topLensInMonth).toBe('BusySummerLens')
  })

  it('buckets time-of-day into 4 buckets summing to 100%', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 25, { hour: 7 }),   // morning
      ...genPhotos(2024, 25, { hour: 13 }),  // midday
      ...genPhotos(2024, 25, { hour: 19 }),  // evening
      ...genPhotos(2024, 25, { hour: 2 }),   // night
    ]))
    const r = aggregateYearInReview(db, 2024)
    const sum = r.timeOfDayShare.reduce((a, b) => a + b.pct, 0)
    expect(sum).toBeCloseTo(100, 1)
    expect(r.timeOfDayShare.map((s) => s.bucket).sort()).toEqual(['evening', 'midday', 'morning', 'night'])
  })

  it('computes daysShot and avgShotsPerDay', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 10, { month: 1 }),
    ]))
    const r = aggregateYearInReview(db, 2024)
    expect(r.daysShot).toBeGreaterThan(0)
    expect(r.avgShotsPerDay).toBeCloseTo(r.totalPhotos / r.daysShot, 2)
  })

  it('reports top aperture as a single number', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...genPhotos(2024, 80, { aperture: 1.4 }),
      ...genPhotos(2024, 20, { aperture: 5.6 }),
    ]))
    const r = aggregateYearInReview(db, 2024)
    expect(r.topApertureFNumber).toBeCloseTo(1.4, 2)
  })
})
