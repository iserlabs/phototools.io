'use client'

import { useTranslations } from 'next-intl'
import type { DiagramScale } from '../diagramScale'
import { VB_W, DIAGRAM_PAD } from '../diagramScale'

interface DiagramAxisProps {
  scale: DiagramScale
  mode: 'distance' | 'macro'
  svgH: number
}

/** Compact tick labels — distinct from the precise formatDistance/formatMm
 *  used in cards and the tooltip, matching the compact-axis convention
 *  already used by DofDiagramBar's AXIS_TICKS ('1m', '5cm', etc). */
function fmtTick(mode: 'distance' | 'macro', d: number): string {
  if (mode === 'distance') return d >= 1 ? `${d}m` : `${Math.round(d * 100)}cm`
  if (d === 0) return '0mm'
  return d < 1 ? `${Math.round(d * 1000)}µm` : `${parseFloat(d.toFixed(2))}mm`
}

/**
 * Bottom axis: tick marks + labels driven entirely by `scale.ticks` /
 * `scale.toX`, so the same component renders both the log-distance and
 * linear-mm axes. When `scale.infinite` (a distance-mode stack with an
 * infinite far limit), the true upper bound has no finite x — so instead of
 * ever computing one, this draws an axis-break glyph and an ∞ label fixed
 * at the right edge.
 */
export function DiagramAxis({ scale, mode, svgH }: DiagramAxisProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const axisY = svgH - DIAGRAM_PAD.bottom
  const edge = VB_W - DIAGRAM_PAD.right

  return (
    <>
      {scale.ticks.map((d) => {
        const x = scale.toX(d)
        if (x < DIAGRAM_PAD.left || x > edge) return null
        return (
          <g key={d}>
            <line x1={x} y1={axisY} x2={x} y2={axisY + 6}
              stroke="var(--text-secondary)" strokeWidth={1} opacity={0.5} />
            <text x={x} y={axisY + 18} fill="var(--text-secondary)"
              fontSize={10} textAnchor="middle">{fmtTick(mode, d)}</text>
          </g>
        )
      })}
      <line x1={DIAGRAM_PAD.left} y1={axisY} x2={edge} y2={axisY}
        stroke="var(--border)" strokeWidth={1} />
      {scale.infinite && (
        <g>
          <line x1={edge - 14} y1={axisY - 5} x2={edge - 8} y2={axisY + 5}
            stroke="var(--text-secondary)" strokeWidth={1.5} />
          <line x1={edge - 7} y1={axisY - 5} x2={edge - 1} y2={axisY + 5}
            stroke="var(--text-secondary)" strokeWidth={1.5} />
          <text x={edge} y={axisY + 18} fill="var(--text-secondary)"
            fontSize={12} textAnchor="middle" fontWeight={600}>{t('infinity')}</text>
        </g>
      )}
    </>
  )
}
