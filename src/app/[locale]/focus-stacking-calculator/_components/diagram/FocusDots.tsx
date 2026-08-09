'use client'

import type { DiagramScale } from '../diagramScale'
import type { DiagramRow } from './types'
import s from '../FocusStacking.module.css'

interface FocusDotsProps {
  rows: DiagramRow[]
  scale: DiagramScale
  y: number
  hoveredShot: number | null
}

function dotRadius(n: number): number {
  return n <= 10 ? 4 : n <= 30 ? 3 : n <= 60 ? 2.5 : 2
}

function sampleStep(n: number): number {
  return n <= 40 ? 1 : n <= 80 ? 2 : Math.ceil(n / 40)
}

/**
 * Dense stacks sample dots at `step` intervals so the row doesn't turn into
 * a solid smear — but the hovered shot must always be visible, or hovering
 * a skipped shot would point at nothing. It's added to the sampled set and
 * (re)drawn last so it always paints on top of its neighbors.
 */
export function FocusDots({ rows, scale, y, hoveredShot }: FocusDotsProps) {
  const step = sampleStep(rows.length)
  const r = dotRadius(rows.length)

  const sampled = new Set<number>()
  rows.forEach((_, i) => {
    if (i === 0 || i === rows.length - 1 || i % step === 0) sampled.add(i)
  })
  if (hoveredShot !== null) sampled.add(hoveredShot)

  return (
    <>
      {[...sampled].sort((a, b) => a - b).map((i) => {
        if (i === hoveredShot) return null
        const row = rows[i]
        return (
          <circle key={row.number} className={s.dotCircle} cx={scale.toX(row.center)} cy={y}
            r={r} fill="var(--accent)" opacity={0.55} />
        )
      })}
      {hoveredShot !== null && rows[hoveredShot] && (
        <circle className={s.dotCircle} cx={scale.toX(rows[hoveredShot].center)} cy={y}
          r={r + 1.5} fill="var(--accent)" opacity={1} />
      )}
    </>
  )
}
