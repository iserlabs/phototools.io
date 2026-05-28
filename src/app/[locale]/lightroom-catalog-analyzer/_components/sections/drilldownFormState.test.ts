import { describe, expect, it } from 'vitest'
import { emptyState, filterToFormState, formStateToFilter, toggleSet } from './drilldownFormState'

describe('emptyState', () => {
  it('returns a fully-empty state', () => {
    const s = emptyState()
    expect(s.dateStart).toBe('')
    expect(s.dateEnd).toBe('')
    expect(s.cameras.size).toBe(0)
    expect(s.lenses.size).toBe(0)
    expect(s.ratings.size).toBe(0)
    expect(s.pick).toBe('')
  })
})

describe('filterToFormState', () => {
  it('returns emptyState for undefined filter', () => {
    expect(filterToFormState(undefined)).toEqual(emptyState())
  })

  it('strips THH:MM:SS suffix from date inputs', () => {
    const s = filterToFormState({ dateRange: { start: '2025-01-01T00:00:00', end: '2025-12-31T23:59:59' } })
    expect(s.dateStart).toBe('2025-01-01')
    expect(s.dateEnd).toBe('2025-12-31')
  })

  it('converts ratings array to a Set', () => {
    const s = filterToFormState({ ratings: [3, 4, 5] })
    expect(s.ratings).toEqual(new Set([3, 4, 5]))
  })

  it('converts cameras and lenses arrays to Sets', () => {
    const s = filterToFormState({ cameras: ['NIKON Z f'], lenses: ['NIKKOR Z 24-120mm f/4 S'] })
    expect(s.cameras.has('NIKON Z f')).toBe(true)
    expect(s.lenses.has('NIKKOR Z 24-120mm f/4 S')).toBe(true)
  })

  it('stringifies numeric ranges for form inputs', () => {
    const s = filterToFormState({ focalLengthRange: [24, 70], apertureRange: [1.4, 2.8], isoRange: [100, 6400] })
    expect(s.focalMin).toBe('24')
    expect(s.focalMax).toBe('70')
    expect(s.apertureMin).toBe('1.4')
    expect(s.apertureMax).toBe('2.8')
    expect(s.isoMin).toBe('100')
    expect(s.isoMax).toBe('6400')
  })

  it('preserves pick state', () => {
    expect(filterToFormState({ picks: 'pick' }).pick).toBe('pick')
    expect(filterToFormState({ picks: 'reject' }).pick).toBe('reject')
    expect(filterToFormState({ picks: 'none' }).pick).toBe('none')
  })
})

describe('formStateToFilter', () => {
  it('returns empty filter for empty state', () => {
    expect(formStateToFilter(emptyState())).toEqual({})
  })

  it('widens date-only inputs to full-day ISO ranges', () => {
    const s = { ...emptyState(), dateStart: '2025-01-01', dateEnd: '2025-12-31' }
    expect(formStateToFilter(s).dateRange).toEqual({
      start: '2025-01-01T00:00:00',
      end: '2025-12-31T23:59:59',
    })
  })

  it('omits date range when either bound is missing', () => {
    expect(formStateToFilter({ ...emptyState(), dateStart: '2025-01-01' }).dateRange).toBeUndefined()
    expect(formStateToFilter({ ...emptyState(), dateEnd: '2025-12-31' }).dateRange).toBeUndefined()
  })

  it('only emits cameras/lenses when set is non-empty', () => {
    const empty = formStateToFilter(emptyState())
    expect(empty.cameras).toBeUndefined()
    expect(empty.lenses).toBeUndefined()
    const populated = formStateToFilter({ ...emptyState(), cameras: new Set(['A']), lenses: new Set(['B']) })
    expect(populated.cameras).toEqual(['A'])
    expect(populated.lenses).toEqual(['B'])
  })

  it('emits sorted ratings array', () => {
    const s = { ...emptyState(), ratings: new Set([5, 2, 4]) }
    expect(formStateToFilter(s).ratings).toEqual([2, 4, 5])
  })

  it('omits ranges when either bound is empty string', () => {
    expect(formStateToFilter({ ...emptyState(), focalMin: '24' }).focalLengthRange).toBeUndefined()
    expect(formStateToFilter({ ...emptyState(), focalMin: '24', focalMax: '70' }).focalLengthRange).toEqual([24, 70])
  })

  it('coerces range strings to numbers', () => {
    const s = { ...emptyState(), apertureMin: '1.4', apertureMax: '2.8' }
    const f = formStateToFilter(s)
    expect(f.apertureRange).toEqual([1.4, 2.8])
    expect(typeof f.apertureRange![0]).toBe('number')
  })

  it('only emits pick when truthy', () => {
    expect(formStateToFilter(emptyState()).picks).toBeUndefined()
    expect(formStateToFilter({ ...emptyState(), pick: 'pick' }).picks).toBe('pick')
  })
})

describe('round-trip filter → form → filter', () => {
  it('preserves all fields', () => {
    const original = {
      dateRange: { start: '2025-01-01T00:00:00', end: '2025-12-31T23:59:59' },
      cameras: ['NIKON Z f'],
      lenses: ['24-120mm'],
      focalLengthRange: [24, 70] as [number, number],
      apertureRange: [1.4, 2.8] as [number, number],
      isoRange: [100, 6400] as [number, number],
      ratings: [4, 5],
      picks: 'pick' as const,
    }
    const roundTrip = formStateToFilter(filterToFormState(original))
    expect(roundTrip).toEqual(original)
  })
})

describe('toggleSet', () => {
  it('adds an element not in the set', () => {
    const result = toggleSet(new Set(['a']), 'b')
    expect(result).toEqual(new Set(['a', 'b']))
  })

  it('removes an element already in the set', () => {
    const result = toggleSet(new Set(['a', 'b']), 'a')
    expect(result).toEqual(new Set(['b']))
  })

  it('returns a new set (does not mutate input)', () => {
    const original = new Set(['a'])
    toggleSet(original, 'b')
    expect(original).toEqual(new Set(['a']))
  })

  it('works with numbers', () => {
    expect(toggleSet(new Set([1, 2]), 3)).toEqual(new Set([1, 2, 3]))
    expect(toggleSet(new Set([1, 2, 3]), 2)).toEqual(new Set([1, 3]))
  })
})
