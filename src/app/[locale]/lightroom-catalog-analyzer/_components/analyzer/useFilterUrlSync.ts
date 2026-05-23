'use client'

import { useEffect, useRef } from 'react'
import type { AnalysisFilter } from '@/lib/lrcat/types'

const PICKS = new Set(['pick', 'reject', 'none'])

/**
 * Serialize an AnalysisFilter to a `key=value&key=value` query string fragment.
 * Empty / undefined / empty-array dimensions are omitted. Multi-value fields
 * (cameras, lenses, ratings) are joined with "+" so values may safely contain commas.
 * Numeric ranges (focal/aperture/iso) collapse to "min-max".
 */
export function serializeFilter(filter: AnalysisFilter | undefined): string {
  if (!filter) return ''
  const params = new URLSearchParams()
  if (filter.dateRange) {
    params.set('start', filter.dateRange.start)
    params.set('end', filter.dateRange.end)
  }
  if (filter.cameras && filter.cameras.length > 0) {
    params.set('cams', filter.cameras.join('+'))
  }
  if (filter.lenses && filter.lenses.length > 0) {
    params.set('lenses', filter.lenses.join('+'))
  }
  if (filter.focalLengthRange) {
    params.set('focal', `${filter.focalLengthRange[0]}-${filter.focalLengthRange[1]}`)
  }
  if (filter.apertureRange) {
    params.set('ap', `${filter.apertureRange[0]}-${filter.apertureRange[1]}`)
  }
  if (filter.isoRange) {
    params.set('iso', `${filter.isoRange[0]}-${filter.isoRange[1]}`)
  }
  if (filter.ratings && filter.ratings.length > 0) {
    params.set('ratings', filter.ratings.map(String).join('+'))
  }
  if (filter.picks) {
    params.set('picks', filter.picks)
  }
  return params.toString()
}

function parseRange(raw: string): [number, number] | undefined {
  // Allow a leading minus on the second number but not on the first.
  const m = raw.match(/^(-?[0-9.]+)-(-?[0-9.]+)$/)
  if (!m) return undefined
  const a = Number(m[1])
  const b = Number(m[2])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined
  return [a, b]
}

/**
 * Deserialize a `key=value&...` query string back into an AnalysisFilter.
 * Accepts the full URL search string (with or without leading `?`).
 * Unknown keys are ignored. Malformed values for a key drop just that key.
 */
export function deserializeFilter(qs: string): AnalysisFilter {
  const cleaned = qs.startsWith('?') ? qs.slice(1) : qs
  const params = new URLSearchParams(cleaned)
  const f: AnalysisFilter = {}

  const start = params.get('start')
  const end = params.get('end')
  if (start && end) {
    f.dateRange = { start, end }
  }

  const cams = params.get('cams')
  if (cams) {
    const list = cams.split('+').filter(Boolean)
    if (list.length > 0) f.cameras = list
  }

  const lenses = params.get('lenses')
  if (lenses) {
    const list = lenses.split('+').filter(Boolean)
    if (list.length > 0) f.lenses = list
  }

  const focal = params.get('focal')
  if (focal) {
    const range = parseRange(focal)
    if (range) f.focalLengthRange = range
  }

  const ap = params.get('ap')
  if (ap) {
    const range = parseRange(ap)
    if (range) f.apertureRange = range
  }

  const iso = params.get('iso')
  if (iso) {
    const range = parseRange(iso)
    if (range) f.isoRange = range
  }

  const ratings = params.get('ratings')
  if (ratings) {
    const list = ratings.split('+').map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 5)
    if (list.length > 0) f.ratings = list
  }

  const picks = params.get('picks')
  if (picks && PICKS.has(picks)) {
    f.picks = picks as 'pick' | 'reject' | 'none'
  }

  return f
}

/**
 * Bidirectional URL sync for the global AnalysisFilter.
 * - On first run, reads `window.location.search` and calls `onHydrate(filter)`
 *   if any filter was present in the URL. Caller applies that filter.
 * - On every subsequent change to `filter`, serializes and pushes to the URL via
 *   `history.replaceState` (not pushState) — filter changes shouldn't pollute
 *   browser history.
 * - First-render guard prevents a server-rendered no-filter state from wiping a
 *   real URL filter on hydration.
 */
export function useFilterUrlSync(
  filter: AnalysisFilter | undefined,
  onHydrate: (initial: AnalysisFilter) => void,
): void {
  const hydratedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // One-time hydrate from URL.
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    if (typeof window === 'undefined') return
    const initial = deserializeFilter(window.location.search)
    if (Object.keys(initial).length > 0) {
      onHydrate(initial)
    }
  }, [onHydrate])

  // Push filter changes to the URL (replaceState, throttled to 200ms).
  useEffect(() => {
    if (!hydratedRef.current) return
    if (typeof window === 'undefined') return
    if (timerRef.current) return
    timerRef.current = setTimeout(() => {
      const qs = serializeFilter(filter)
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      window.history.replaceState(null, '', url)
      timerRef.current = null
    }, 200)
  }, [filter])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])
}
