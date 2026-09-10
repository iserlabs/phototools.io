'use client'

import { useEffect, useRef } from 'react'

/**
 * Rate-capped `history.replaceState` for tool URL sync.
 *
 * Chrome and Safari throw a SecurityError once a page calls pushState /
 * replaceState more than 100 times in 30 seconds (Sentry PHOTOTOOLS-10: a
 * sustained slider drag on the DOF simulator did exactly that). Every caller
 * on a page shares this one sliding-window budget, so the sum of all writers
 * can never reach the browser's cap. When the budget is spent, the latest URL
 * is parked and flushed as soon as the oldest write ages out of the window —
 * the URL always ends up reflecting the final state, just a little later.
 */

export const HISTORY_WINDOW_MS = 30_000
/** Headroom under the browsers' 100-per-window cap for writes we don't make (Next router, scroll restoration). */
export const HISTORY_BUDGET = 80

const writeLog: number[] = []
let pendingUrl: string | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null

function flushPending(): void {
  flushTimer = null
  const url = pendingUrl
  pendingUrl = null
  if (url !== null) replaceUrl(url)
}

/** Replace the current URL (relative or absolute) without a navigation, never exceeding the browser's rate cap. */
export function replaceUrl(url: string): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  while (writeLog.length > 0 && now - writeLog[0] >= HISTORY_WINDOW_MS) writeLog.shift()

  if (writeLog.length >= HISTORY_BUDGET) {
    pendingUrl = url
    if (!flushTimer) flushTimer = setTimeout(flushPending, HISTORY_WINDOW_MS - (now - writeLog[0]) + 1)
    return
  }

  if (new URL(url, window.location.href).href === window.location.href) return
  try {
    window.history.replaceState(null, '', url)
    writeLog.push(now)
  } catch {
    // URL sync is best-effort — a browser rate limit must never surface as an app error.
  }
}

/**
 * Debounced URL query sync: writes `?qs` (or the bare pathname when empty)
 * once the value has been stable for `delayMs`. Skips the first render so
 * hydration never overwrites the URL the user arrived with.
 */
export function useUrlQuerySync(qs: string, delayMs = 250): void {
  const isFirst = useRef(true)
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    const timer = setTimeout(() => {
      replaceUrl(qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [qs, delayMs])
}
