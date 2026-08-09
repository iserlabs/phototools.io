'use client'

import { useEffect, useState, type RefObject } from 'react'

export interface ViewportSize {
  w: number
  h: number
}

const ZERO: ViewportSize = { w: 0, h: 0 }

/**
 * Tracks an element's live content-box size via ResizeObserver. The
 * composition root uses this on a full-bleed overlay div stacked inside
 * Viewport's canvas container (see CenterStage.tsx) so ModelLayer,
 * BokehInset, and useImageExport all get the *actual* rendered viewport
 * pixel size — Viewport itself sizes its container via CSS `aspect-ratio`,
 * which React has no other way to read back.
 */
export function useViewportSize(ref: RefObject<HTMLElement | null>): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(ZERO)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}
