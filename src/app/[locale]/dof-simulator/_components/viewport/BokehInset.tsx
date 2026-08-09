'use client'

import type { ReactNode } from 'react'
import { ngonVertices, type BokehShapeId } from '@/lib/math/bokehKernel'
import styles from './overlays.module.css'

export interface BokehInsetProps {
  bokeh: BokehShapeId
  blurPx: number
}

const VIEWBOX = 72
const CENTER = VIEWBOX / 2
const MIN_RADIUS_PX = 4
const MAX_RADIUS_PX = 30
const HIDE_THRESHOLD_PX = 1
// sqrt(0.45) — matches bokehKernel's CATA_INNER_R2, so the preview's hole
// matches the real kernel's annulus.
const CATA_INNER_RATIO = Math.sqrt(0.45)

/** SVG path for a full circle, drawn as two 180° arcs. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
}

function polygonPoints(sides: number, radius: number): string {
  return ngonVertices(sides)
    .map((v) => `${CENTER + v.x * radius},${CENTER - v.y * radius}`)
    .join(' ')
}

function BokehShape({ bokeh, radius }: { bokeh: BokehShapeId; radius: number }): ReactNode {
  if (bokeh === 'disc') {
    return <circle cx={CENTER} cy={CENTER} r={radius} className={styles.bokehShape} />
  }
  if (bokeh === 'cata') {
    // Outer circle minus inner circle, combined into one evenodd path so the
    // annulus renders as a single hole-punched shape.
    const d = `${circlePath(CENTER, CENTER, radius)} ${circlePath(CENTER, CENTER, radius * CATA_INNER_RATIO)}`
    return <path d={d} fillRule="evenodd" className={styles.bokehShape} />
  }
  const sides = Number(bokeh.slice(5))
  return <polygon points={polygonPoints(sides, radius)} className={styles.bokehShape} />
}

/**
 * Corner SVG preview of the current aperture opening: the active bokeh
 * kernel's shape (n-gon blade count, disc, or catadioptric annulus), sized
 * by the current background blur radius, with a rounded pixel readout
 * below it. Hidden once blur is small enough (<1px) that the shape wouldn't
 * be visible in the render anyway.
 *
 * Renders outside any next-intl provider in isolation (see overlays.test.tsx),
 * so the readout's "px" unit is a literal, technical suffix rather than a
 * translated string — matching the existing precedent in FramePanel.tsx.
 */
export function BokehInset({ bokeh, blurPx }: BokehInsetProps) {
  if (blurPx < HIDE_THRESHOLD_PX) return null
  const radius = Math.min(MAX_RADIUS_PX, Math.max(MIN_RADIUS_PX, blurPx))

  return (
    <div className={styles.bokehInset}>
      <svg width={VIEWBOX} height={VIEWBOX} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} aria-hidden>
        <BokehShape bokeh={bokeh} radius={radius} />
      </svg>
      <span className={styles.bokehLabel}>~{Math.round(blurPx).toLocaleString()} px</span>
    </div>
  )
}
