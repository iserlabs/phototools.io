'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { DiagramScale } from '../diagramScale'
import { VB_W, DIAGRAM_PAD } from '../diagramScale'
import type { DiagramRow } from './types'

interface CoverageHeatmapProps {
  rows: DiagramRow[]
  scale: DiagramScale
  y: number
  height: number
  drawW: number
}

const COV_COLS = 200

/**
 * Density map of how many shots cover each point along the axis. Works
 * purely in pixel space (comparing each column's x against `scale.toX` of
 * each row's band) so it never needs to invert the scale — this also makes
 * it correctly treat an `Infinity` far edge as reaching the plot's right
 * edge, since `scale.toX` already clamps there.
 */
export function CoverageHeatmap({ rows, scale, y, height, drawW }: CoverageHeatmapProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const colW = drawW / COV_COLS

  const { cov, maxCov } = useMemo(() => {
    const ranges = rows.map((r) => [scale.toX(r.bandStart), scale.toX(r.bandEnd)] as const)
    const cov = new Array(COV_COLS).fill(0) as number[]
    let maxCov = 0
    for (let c = 0; c < COV_COLS; c++) {
      const x = DIAGRAM_PAD.left + (c + 0.5) * colW
      for (const [x1, x2] of ranges) if (x >= x1 && x <= x2) cov[c]++
      if (cov[c] > maxCov) maxCov = cov[c]
    }
    return { cov, maxCov }
  }, [rows, scale, colW])

  const legendVals = [1, Math.ceil(maxCov / 2), maxCov].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <>
      <text x={DIAGRAM_PAD.left - 8} y={y + height / 2 + 3} fill="var(--text-secondary)"
        fontSize={9} textAnchor="end" fontWeight={500}>{t('diagramCoverage')}</text>
      {cov.map((count, i) => count > 0 ? (
        <rect key={i} x={DIAGRAM_PAD.left + i * colW} y={y} width={colW + 0.5} height={height}
          fill="var(--accent)" opacity={0.15 + Math.min(1, count / Math.max(2, maxCov * 0.6)) * 0.55} />
      ) : null)}
      <rect x={DIAGRAM_PAD.left} y={y} width={drawW} height={height}
        fill="none" stroke="var(--border)" strokeWidth={1} rx={4} />
      {maxCov > 1 && legendVals.map((count, i) => {
        const lx = VB_W - DIAGRAM_PAD.right - (legendVals.length - 1 - i) * 44 - 10
        const op = 0.15 + Math.min(1, count / Math.max(2, maxCov * 0.6)) * 0.55
        return (
          <g key={count}>
            <rect x={lx} y={y - 14} width={12} height={8} fill="var(--accent)" opacity={op} rx={2} />
            <text x={lx + 16} y={y - 7} fill="var(--text-secondary)" fontSize={8}>{count}x</text>
          </g>
        )
      })}
    </>
  )
}
