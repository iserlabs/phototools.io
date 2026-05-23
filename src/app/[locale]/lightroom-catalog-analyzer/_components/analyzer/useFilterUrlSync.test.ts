import { describe, expect, it } from 'vitest'
import { serializeFilter, deserializeFilter } from './useFilterUrlSync'
import type { AnalysisFilter } from '@/lib/lrcat/types'

describe('serializeFilter / deserializeFilter', () => {
  it('returns empty string for an undefined filter', () => {
    expect(serializeFilter(undefined)).toBe('')
  })

  it('returns empty string for an empty filter object', () => {
    expect(serializeFilter({})).toBe('')
  })

  it('round-trips a date range', () => {
    const f: AnalysisFilter = { dateRange: { start: '2024-01-01', end: '2024-12-31' } }
    const qs = serializeFilter(f)
    expect(qs).toBe('start=2024-01-01&end=2024-12-31')
    expect(deserializeFilter(qs)).toEqual(f)
  })

  it('round-trips cameras and lenses', () => {
    const f: AnalysisFilter = { cameras: ['Sony A7R V', 'Fuji X100V'], lenses: ['24-70mm'] }
    const qs = serializeFilter(f)
    const back = deserializeFilter(qs)
    expect(back.cameras).toEqual(['Sony A7R V', 'Fuji X100V'])
    expect(back.lenses).toEqual(['24-70mm'])
  })

  it('round-trips numeric ranges', () => {
    const f: AnalysisFilter = {
      focalLengthRange: [24, 70],
      apertureRange: [1.4, 8],
      isoRange: [100, 6400],
    }
    const back = deserializeFilter(serializeFilter(f))
    expect(back.focalLengthRange).toEqual([24, 70])
    expect(back.apertureRange).toEqual([1.4, 8])
    expect(back.isoRange).toEqual([100, 6400])
  })

  it('round-trips ratings array', () => {
    const f: AnalysisFilter = { ratings: [4, 5] }
    expect(deserializeFilter(serializeFilter(f)).ratings).toEqual([4, 5])
  })

  it('round-trips pick state', () => {
    expect(deserializeFilter(serializeFilter({ picks: 'pick' })).picks).toBe('pick')
    expect(deserializeFilter(serializeFilter({ picks: 'reject' })).picks).toBe('reject')
    expect(deserializeFilter(serializeFilter({ picks: 'none' })).picks).toBe('none')
  })

  it('round-trips a fully-populated filter', () => {
    const f: AnalysisFilter = {
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
      cameras: ['Sony A7R V'],
      lenses: ['24-70mm f/2.8'],
      focalLengthRange: [24, 70],
      apertureRange: [2.8, 8],
      isoRange: [100, 6400],
      ratings: [3, 4, 5],
      picks: 'pick',
    }
    const back = deserializeFilter(serializeFilter(f))
    expect(back).toEqual(f)
  })

  it('round-trips date bounds with a time suffix (DrilldownForm end-of-day)', () => {
    const f: AnalysisFilter = {
      dateRange: { start: '2024-01-01T00:00:00', end: '2024-12-31T23:59:59' },
    }
    expect(deserializeFilter(serializeFilter(f))).toEqual(f)
  })

  it('ignores unknown keys when deserializing', () => {
    expect(deserializeFilter('foo=bar&start=2024-01-01&end=2024-01-31')).toEqual({
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
    })
  })

  it('drops malformed numeric ranges', () => {
    expect(deserializeFilter('focal=24-abc')).toEqual({})
    expect(deserializeFilter('focal=24')).toEqual({})
  })

  it('drops a date range with only one bound', () => {
    expect(deserializeFilter('start=2024-01-01')).toEqual({})
  })

  it('drops an empty cameras list', () => {
    expect(deserializeFilter('cams=')).toEqual({})
  })

  it('handles commas in camera names by using "+" as separator', () => {
    const f: AnalysisFilter = { cameras: ['Sony, A7R V', 'Fuji X100V'] }
    const back = deserializeFilter(serializeFilter(f))
    expect(back.cameras).toEqual(['Sony, A7R V', 'Fuji X100V'])
  })
})
