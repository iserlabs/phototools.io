'use client'

import type { DiagramScale } from '../diagramScale'
import type { DiagramRow } from './types'
import s from '../FocusStacking.module.css'

interface BandsLayerProps {
  rows: DiagramRow[]
  scale: DiagramScale
  bandsY: number
  bandH: number
  bandGap: number
  hoveredShot: number | null
}

const EVEN_FILL = 'color-mix(in srgb, var(--accent) 26%, transparent)'
const ODD_FILL = 'color-mix(in srgb, var(--accent) 14%, transparent)'

/**
 * Per-shot bands (only rendered up to MAX_BAND_SHOTS by the parent).
 * A band whose far edge is Infinity (hyperfocal-final shot) fades to
 * transparent over its last 15% via a per-row <linearGradient> instead of a
 * flat fill, since it visually extends past the plot with no hard edge.
 */
export function BandsLayer({ rows, scale, bandsY, bandH, bandGap, hoveredShot }: BandsLayerProps) {
  return (
    <>
      <defs>
        {rows.map((row, i) => {
          if (row.bandEnd !== Infinity) return null
          const isHovered = hoveredShot === i
          const baseOpacity = isHovered ? 0.85 : i % 2 === 0 ? 0.26 : 0.14
          return (
            <linearGradient key={row.number} id={`bandFade-${row.number}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={baseOpacity} />
              <stop offset="85%" stopColor="var(--accent)" stopOpacity={baseOpacity} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          )
        })}
      </defs>
      {rows.map((row, i) => {
        const isHovered = hoveredShot === i
        const isInfinite = row.bandEnd === Infinity
        const x1 = scale.toX(row.bandStart)
        const x2 = scale.toX(row.bandEnd)
        const bw = Math.max(2, x2 - x1)
        const by = bandsY + i * (bandH + bandGap)
        const fill = isInfinite
          ? `url(#bandFade-${row.number})`
          : isHovered ? 'var(--accent)' : i % 2 === 0 ? EVEN_FILL : ODD_FILL
        return (
          <g key={row.number}>
            <rect className={s.bandRect} x={x1} y={by} width={bw} height={bandH}
              fill={fill} opacity={isInfinite ? 1 : isHovered ? 0.85 : 1} rx={3} />
            <rect className={s.bandRect} x={x1} y={by} width={bw} height={bandH}
              fill="none" stroke="var(--accent)" strokeWidth={1.5}
              opacity={isHovered ? 1 : 0.55} rx={3} />
            <text x={x1 - 6} y={by + bandH / 2 + 4} fill="var(--text-secondary)"
              fontSize={10} textAnchor="end" fontWeight={500}>{row.number}</text>
          </g>
        )
      })}
    </>
  )
}
