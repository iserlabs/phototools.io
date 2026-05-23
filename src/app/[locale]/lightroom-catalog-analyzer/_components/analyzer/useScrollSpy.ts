'use client'

import { useEffect, useState } from 'react'
import { ALL_SECTION_IDS, anchorIdFor, type SectionId } from '../nav/sections'

/**
 * Observe each section anchor and return the ID of the topmost intersecting
 * section. Uses IntersectionObserver with a tall, top-biased rootMargin so
 * the "active" section follows the user's reading position rather than
 * whichever section happens to be most visible by area.
 */
export function useScrollSpy(): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const targets = ALL_SECTION_IDS.map((id) => ({ id, el: document.getElementById(anchorIdFor(id)) }))
      .filter((t): t is { id: SectionId; el: HTMLElement } => t.el !== null)

    if (targets.length === 0) return

    const visibility = new Map<SectionId, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id.replace(/^section-/, '') as SectionId
          visibility.set(id, entry.intersectionRatio)
        }
        // Pick the section closest to the top of the viewport that is at
        // least partially visible.
        let best: SectionId | null = null
        let bestTop = Number.POSITIVE_INFINITY
        for (const { id, el } of targets) {
          if ((visibility.get(id) ?? 0) > 0) {
            const top = el.getBoundingClientRect().top
            if (top < bestTop) {
              bestTop = top
              best = id
            }
          }
        }
        setActive(best)
      },
      {
        // Bias toward the top of the viewport.
        rootMargin: '-15% 0px -70% 0px',
        threshold: [0, 0.01, 0.5, 1],
      },
    )

    for (const { el } of targets) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return active
}
