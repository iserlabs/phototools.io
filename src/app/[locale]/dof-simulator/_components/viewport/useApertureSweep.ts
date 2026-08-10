'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** f-stops the sweep cycles through, one full stop apart. */
export const SWEEP_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16]

const STEP_MS = 700
const REDUCED_MOTION_APERTURE = 16

export interface ApertureSweepApi {
  playing: boolean
  toggle(): void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Cycles the aperture through SWEEP_STOPS on a 700ms interval so the effect
 * of stopping down is visible end-to-end. `toggle()` starts the sweep (or
 * cancels one already in progress); the sweep also stops itself once it
 * reaches the last stop. Honors prefers-reduced-motion by jumping straight
 * to the smallest opening (f/16) instead of animating through every stop.
 */
export function useApertureSweep(setAperture: (v: number) => void): ApertureSweepApi {
  const [playing, setPlaying] = useState(false)
  const indexRef = useRef(-1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (intervalRef.current !== null) {
      stop()
      return
    }
    if (prefersReducedMotion()) {
      setAperture(REDUCED_MOTION_APERTURE)
      return
    }
    indexRef.current = -1
    setPlaying(true)
    intervalRef.current = setInterval(() => {
      indexRef.current += 1
      setAperture(SWEEP_STOPS[indexRef.current])
      if (indexRef.current >= SWEEP_STOPS.length - 1) stop()
    }, STEP_MS)
  }, [setAperture, stop])

  // Unmount safety net so a sweep left running doesn't keep firing into an
  // unmounted component's setAperture closure.
  useEffect(() => () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
  }, [])

  return useMemo(() => ({ playing, toggle }), [playing, toggle])
}
