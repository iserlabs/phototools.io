'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ToolInteractionEvent } from '@/lib/analytics/types'
import type { ResolvedSensor } from './sensorSizeTypes'

// Matches `useSensorCanvas`'s `DESKTOP_BREAKPOINT` — the same width where
// `SensorSize.module.css`'s `.desktopOnly`/`.mobileOnly` swap visibility.
const DESKTOP_QUERY = '(min-width: 1024px)'

type UseCompareEntryArgs = {
  allSensors: ResolvedSensor[]
  comparePair: [string, string] | null
  setComparePair: (pair: [string, string] | null) => void
  trackParam: (event: ToolInteractionEvent) => void
}

/**
 * Owns the wiring shared by both compare entry points (the row select and
 * the "Compare these two" button): resolves `comparePair` (Task 2's `?vs=`
 * state) into actual sensor objects, and tracks+sets a new pair.
 *
 * `isDesktop` tells `SensorSize.tsx` which single one of the two DOM
 * locations (`ss.main` above the desktop table, `ss.mobileControls` above
 * the mobile table) should mount the one live `CompareDrawer` instance —
 * unlike `SensorTable`, which is fine to mount twice (CSS just hides one),
 * the drawer must never be mounted twice at once. Defaults to `true` so the
 * server-rendered/pre-hydration markup is deterministic; corrected from the
 * real viewport in an effect right after mount, then kept in sync with a
 * `change` listener so it also flips if the window crosses the breakpoint.
 */
export function useCompareEntry({ allSensors, comparePair, setComparePair, trackParam }: UseCompareEntryArgs) {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    setIsDesktop(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const handleCompare = useCallback((aId: string, bId: string) => {
    trackParam({ param_name: 'compare', param_value: `${aId},${bId}`, input_type: 'select' })
    setComparePair([aId, bId])
  }, [trackParam, setComparePair])

  // An id can go stale (e.g. its custom sensor was deleted) after landing in
  // `comparePair` state — Task 2's writer already drops `?vs=` when that
  // happens, but the state itself isn't cleared. Resolving with `.find` and
  // rendering only when both sides resolve tolerates that without a crash.
  const [compareA, compareB] = comparePair
    ? [allSensors.find((s) => s.id === comparePair[0]), allSensors.find((s) => s.id === comparePair[1])]
    : [undefined, undefined]

  return { isDesktop, handleCompare, compareA, compareB }
}
