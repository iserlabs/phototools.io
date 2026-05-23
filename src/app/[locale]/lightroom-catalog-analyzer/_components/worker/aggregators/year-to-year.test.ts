import { describe, expect, it } from 'vitest'
import { aggregateYearToYear } from './year-to-year'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

// Monotonic id counter so multiple gen() calls in one catalog never collide
// on id_local.
let nextPhotoId = 1
function gen(year: number, count: number, opts: { body?: string; lens?: string; fl?: number; aperture?: number; rating?: number; hour?: number; developSettings?: string | null } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: nextPhotoId++,
    captureTime: `${year}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}T${String(opts.hour ?? 10).padStart(2, '0')}:00:00`,
    cameraModel: opts.body ?? 'Sony A7R V',
    lens: opts.lens ?? '24-70mm f/2.8',
    focalLength: opts.fl ?? 35,
    aperture: opts.aperture ?? 2.8,
    rating: opts.rating ?? 0,
    developSettings: opts.developSettings ?? null,
  }))
}

describe('aggregateYearToYear', () => {
  it('reports the most recent N years descending', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...gen(2022, 5),
      ...gen(2023, 10),
      ...gen(2024, 15),
      ...gen(2025, 20),
    ]))
    const r = aggregateYearToYear(db, 3)
    expect(r.years).toEqual([2025, 2024, 2023])
  })

  it('defaults to 3 years when fewer years exist in the catalog', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...gen(2024, 10),
      ...gen(2025, 20),
    ]))
    const r = aggregateYearToYear(db, 3)
    expect(r.years).toEqual([2025, 2024])
  })

  it('emits totalPhotos row with values aligned to years[]', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...gen(2024, 10),
      ...gen(2025, 20),
    ]))
    const r = aggregateYearToYear(db, 2)
    const row = r.rows.find((row) => row.statKey === 'totalPhotos')
    expect(row?.values).toEqual([20, 10])
  })

  it('computes deltas as percentages, null for the oldest year', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...gen(2024, 10),
      ...gen(2025, 20),
    ]))
    const r = aggregateYearToYear(db, 2)
    const row = r.rows.find((row) => row.statKey === 'totalPhotos')
    // year 2025 vs 2024: (20 - 10) / 10 * 100 = 100%
    expect(row?.deltas[0]).toBe(100)
    // oldest year has no prior — delta is null
    expect(row?.deltas[1]).toBe(null)
  })

  it('picks the biggest absolute delta as biggestShift', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...gen(2024, 10, { body: 'Sony A7R V' }),
      ...gen(2025, 100, { body: 'Sony A7R V' }),
    ]))
    const r = aggregateYearToYear(db, 2)
    expect(r.biggestShift).not.toBe(null)
    expect(r.biggestShift?.year).toBe(2025)
  })

  it('reports pctRated4Plus row', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...gen(2024, 10, { rating: 5 }),
      ...gen(2024, 10, { rating: 0 }),
      ...gen(2025, 20, { rating: 0 }),
    ]))
    const r = aggregateYearToYear(db, 2)
    const row = r.rows.find((row) => row.statKey === 'pctRated4Plus')
    // 2024 = 50%, 2025 = 0%
    expect(row?.values).toEqual([0, 50])
  })

  it('reports keywordsPerPhoto row (zero when no keywords)', () => {
    const db = adaptForAggregators(createTestCatalog([
      ...gen(2024, 10),
      ...gen(2025, 20),
    ]))
    const r = aggregateYearToYear(db, 2)
    const row = r.rows.find((row) => row.statKey === 'keywordsPerPhoto')
    expect(row?.values).toEqual([0, 0])
  })

  it('returns empty years/rows when catalog is empty', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateYearToYear(db, 3)
    expect(r.years).toEqual([])
    expect(r.rows).toEqual([])
    expect(r.biggestShift).toBe(null)
  })
})
