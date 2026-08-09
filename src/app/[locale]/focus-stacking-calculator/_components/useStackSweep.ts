'use client'

import { useEffect, useState } from 'react'

/** Sweeps the hover highlight through all shots in ~4s, respecting reduced motion. */
export function useStackSweep(count: number, setHovered: (i: number | null) => void) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || count === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false)
      return
    }
    let i = 0
    const interval = Math.min(250, Math.max(40, 4000 / count))
    const id = setInterval(() => {
      if (i >= count) {
        setPlaying(false)
        setHovered(null)
        return
      }
      setHovered(i)
      i += 1
    }, interval)
    return () => clearInterval(id)
  }, [playing, count, setHovered])

  return { playing, toggle: () => setPlaying((p) => !p) }
}
