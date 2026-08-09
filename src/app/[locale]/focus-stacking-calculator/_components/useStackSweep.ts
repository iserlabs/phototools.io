'use client'

import { useEffect, useState } from 'react'

/** Duration ceiling — the sweep completes in AT MOST this long. */
const SWEEP_DURATION_MS = 4000
/** Ceiling on how many highlight steps a sweep will take — bounds the per-step
 * interval so a run with hundreds of shots doesn't blow the duration budget. */
const MAX_STEPS = 100
/** Per-step interval bounds: a floor keeps large sweeps perceptible (never
 * faster than one highlight per 40ms), a ceiling keeps small sweeps snappy
 * instead of dragging a 1-shot stack out to the full duration budget. */
const MIN_INTERVAL_MS = 40
const MAX_INTERVAL_MS = 250

/**
 * Sweeps the hover highlight through the shot sequence, completing in AT
 * MOST ~4s — shorter stacks finish sooner rather than being artificially
 * stretched to fill the window. Respects reduced motion.
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
    // +1 accounts for the terminating tick (which clears the highlight after
    // the last shot), so the full run — including termination — is what's
    // bounded by the duration budget, not just the shot-visiting portion.
    const rawInterval = SWEEP_DURATION_MS / (steps + 1)
    const interval = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, rawInterval))
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
