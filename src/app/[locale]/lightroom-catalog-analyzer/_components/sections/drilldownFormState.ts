import type { AnalysisFilter } from '@/lib/lrcat/types'

export interface FormState {
  dateStart: string
  dateEnd: string
  cameras: Set<string>
  lenses: Set<string>
  focalMin: string
  focalMax: string
  apertureMin: string
  apertureMax: string
  isoMin: string
  isoMax: string
  ratings: Set<number>
  pick: '' | 'pick' | 'reject' | 'none'
}

export const RATING_KEYS = ['rating0', 'rating1', 'rating2', 'rating3', 'rating4', 'rating5'] as const

export function emptyState(): FormState {
  return {
    dateStart: '', dateEnd: '',
    cameras: new Set(), lenses: new Set(),
    focalMin: '', focalMax: '',
    apertureMin: '', apertureMax: '',
    isoMin: '', isoMax: '',
    ratings: new Set(),
    pick: '',
  }
}

/** Strip any `THH:MM:SS` suffix so a date-only `<input type="date">` rehydrates. */
function dateOnly(value: string): string {
  return value.slice(0, 10)
}

export function filterToFormState(f: AnalysisFilter | undefined): FormState {
  if (!f) return emptyState()
  return {
    dateStart: f.dateRange ? dateOnly(f.dateRange.start) : '',
    dateEnd: f.dateRange ? dateOnly(f.dateRange.end) : '',
    cameras: new Set(f.cameras ?? []),
    lenses: new Set(f.lenses ?? []),
    focalMin: f.focalLengthRange ? String(f.focalLengthRange[0]) : '',
    focalMax: f.focalLengthRange ? String(f.focalLengthRange[1]) : '',
    apertureMin: f.apertureRange ? String(f.apertureRange[0]) : '',
    apertureMax: f.apertureRange ? String(f.apertureRange[1]) : '',
    isoMin: f.isoRange ? String(f.isoRange[0]) : '',
    isoMax: f.isoRange ? String(f.isoRange[1]) : '',
    ratings: new Set(f.ratings ?? []),
    pick: f.picks ?? '',
  }
}

export function formStateToFilter(s: FormState): AnalysisFilter {
  const f: AnalysisFilter = {}
  // `filter.ts` compares captureTime as a raw string, so the date-only `end`
  // must be widened to end-of-day or the final day's intra-day captures are
  // excluded. Start is pinned to midnight for symmetry.
  if (s.dateStart && s.dateEnd) {
    f.dateRange = { start: `${s.dateStart}T00:00:00`, end: `${s.dateEnd}T23:59:59` }
  }
  if (s.cameras.size > 0) f.cameras = [...s.cameras]
  if (s.lenses.size > 0) f.lenses = [...s.lenses]
  if (s.focalMin && s.focalMax) f.focalLengthRange = [Number(s.focalMin), Number(s.focalMax)]
  if (s.apertureMin && s.apertureMax) f.apertureRange = [Number(s.apertureMin), Number(s.apertureMax)]
  if (s.isoMin && s.isoMax) f.isoRange = [Number(s.isoMin), Number(s.isoMax)]
  if (s.ratings.size > 0) f.ratings = [...s.ratings].sort((a, b) => a - b)
  if (s.pick) f.picks = s.pick
  return f
}

export function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}
