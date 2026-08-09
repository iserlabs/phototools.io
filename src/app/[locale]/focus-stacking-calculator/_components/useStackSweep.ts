'use client'

import { useEffect, useState } from 'react'

/** Total wall-clock time the sweep should take, independent of shot count. */
const SWEEP_DURATION_MS = 4000
/** Ceiling on how many highlight steps a sweep will take — bounds the per-step
 * interval so a run with hundreds of shots doesn't blow the duration budget. */
const MAX_STEPS = 100

/**
 * Sweeps the hover highlight through the shot sequence in a fixed ~4s window,
 * regardless of shot count, respecting reduced motion.
 *
 * When `count` exceeds `MAX_STEPS`, the sweep doesn't visit every index —
 * it steps through `MAX_STEPS` evenly-spaced indices across the full range
 * (always including index 0 and the last index) so a 300-shot stack still
 * finishes in ~4s instead of taking 40ms-per-shot (12s).
 */
export function useStackSweep(count: number, setHovered: (i: number | null) => void) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || count === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false)
      return
    }
    const steps = Math.min(count, MAX_STEPS)
    const interval = SWEEP_DURATION_MS / steps
    let k = 0
    const id = setInterval(() => {
      if (k >= steps) {
        setPlaying(false)
        setHovered(null)
        return
      }
      const index = steps === 1 ? 0 : Math.round((k * (count - 1)) / (steps - 1))
      setHovered(index)
      k += 1
    }, interval)
    return () => clearInterval(id)
  }, [playing, count, setHovered])

  return { playing, toggle: () => setPlaying((p) => !p) }
}
