import { describe, expect, it } from 'vitest'
import { buildFilterPredicate } from './filter'
import type { AnalysisFilter } from '@/lib/lrcat/types'

describe('buildFilterPredicate', () => {
  it('returns empty WHERE for an empty filter', () => {
    const { sql, params } = buildFilterPredicate(undefined)
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('builds a date range predicate', () => {
    const f: AnalysisFilter = { dateRange: { start: '2024-01-01', end: '2024-12-31' } }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toContain('img.captureTime >=')
    expect(sql).toContain('img.captureTime <=')
    expect(params).toEqual(['2024-01-01', '2024-12-31'])
  })

  it('builds a camera-in predicate with multiple bound params', () => {
    const f: AnalysisFilter = { cameras: ['Sony A7R V', 'Fujifilm X100V'] }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toContain('cam.value IN (?, ?)')
    expect(params).toEqual(['Sony A7R V', 'Fujifilm X100V'])
  })

  it('builds a focal-length range predicate', () => {
    const f: AnalysisFilter = { focalLengthRange: [24, 70] }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toContain('exif.focalLength BETWEEN ? AND ?')
    expect(params).toEqual([24, 70])
  })

  it('combines multiple predicates with AND', () => {
    const f: AnalysisFilter = {
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
      cameras: ['Sony A7R V'],
      ratings: [4, 5],
    }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toMatch(/ AND .*AND /)   // at least 3 predicates joined by AND
    expect(params).toEqual(['2024-01-01', '2024-12-31', 'Sony A7R V', 4, 5])
  })

  it('rejects empty arrays (no-op)', () => {
    const f: AnalysisFilter = { cameras: [], lenses: [] }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('handles pick=reject', () => {
    const { sql, params } = buildFilterPredicate({ picks: 'reject' })
    expect(sql).toContain('img.pick = ?')
    expect(params).toEqual([-1])
  })

  it('handles pick=pick', () => {
    const { sql, params } = buildFilterPredicate({ picks: 'pick' })
    expect(sql).toContain('img.pick = ?')
    expect(params).toEqual([1])
  })

  it('handles pick=none', () => {
    const { sql, params } = buildFilterPredicate({ picks: 'none' })
    expect(sql).toContain('img.pick = ?')
    expect(params).toEqual([0])
  })

  it('builds an aperture range predicate', () => {
    const f: AnalysisFilter = { apertureRange: [1.4, 2.8] }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toContain('exif.aperture BETWEEN ? AND ?')
    expect(params).toEqual([1.4, 2.8])
  })

  it('builds an ISO range predicate', () => {
    const f: AnalysisFilter = { isoRange: [100, 6400] }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toContain('exif.isoSpeedRating BETWEEN ? AND ?')
    expect(params).toEqual([100, 6400])
  })

  it('builds a lens-in predicate with bound params', () => {
    const f: AnalysisFilter = { lenses: ['24-70mm f/2.8', '50mm f/1.4'] }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toContain('lens.value IN (?, ?)')
    expect(params).toEqual(['24-70mm f/2.8', '50mm f/1.4'])
  })

  it('builds a ratings-in predicate', () => {
    const f: AnalysisFilter = { ratings: [4, 5] }
    const { sql, params } = buildFilterPredicate(f)
    expect(sql).toContain('img.rating IN (?, ?)')
    expect(params).toEqual([4, 5])
  })
})
