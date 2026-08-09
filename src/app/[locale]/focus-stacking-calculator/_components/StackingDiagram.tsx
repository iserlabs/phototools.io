'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { StackingState } from './useStackingState'
import type { DiagramScale } from './diagramScale'
import { VB_W, DIAGRAM_PAD } from './diagramScale'
import { buildRows } from './diagram/types'
import { useDiagramHover } from './diagram/useDiagramHover'
import { LimitLine } from './diagram/LimitLine'
import { CoverageHeatmap } from './diagram/CoverageHeatmap'
import { FocusDots } from './diagram/FocusDots'
import { BandsLayer } from './diagram/BandsLayer'
import { DiagramAxis } from './diagram/DiagramAxis'
import { DiagramTooltip } from './diagram/DiagramTooltip'
import s from './FocusStacking.module.css'

interface StackingDiagramProps {
  state: StackingState
  scale: DiagramScale
  playing: boolean
}

const DRAW_W = VB_W - DIAGRAM_PAD.left - DIAGRAM_PAD.right
const BAND_H = 18
const BAND_GAP = 3
const MAX_BAND_SHOTS = 20
const COV_H = 32
const FOCUS_H = 28

/**
 * Composes the theme-aware diagram from the diagram/ layer components
 * (coverage heatmap, sampled focus dots, per-shot bands, bottom axis) around
 * a `scale` built once by the caller (FocusStacking.tsx) and shared with
 * Task 11's SceneStrip. A single transparent overlay rect drives hover for
 * the whole plot so `state.hoveredShot` stays the one source of truth the
 * ShotTable also reads and writes — the diagram and the table never fight
 * over which shot is "active".
 */
export function StackingDiagram({ state, scale, playing }: StackingDiagramProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const { hoveredShot, setHoveredShot, mode } = state
  const rows = useMemo(() => buildRows(state), [state])
  const showBands = rows.length <= MAX_BAND_SHOTS
  const { svgRef, onMouseMove, onMouseLeave } = useDiagramHover(rows, scale, setHoveredShot, playing)

  let y = DIAGRAM_PAD.top
  const covY = y; y += COV_H + 10
  const focusY = y; y += FOCUS_H
  let bandsY = 0
  if (showBands) { y += 10; bandsY = y; y += rows.length * (BAND_H + BAND_GAP) }
  const svgH = y + DIAGRAM_PAD.bottom
  const plotBottom = svgH - DIAGRAM_PAD.bottom

  const tooltipRow = hoveredShot !== null ? rows[hoveredShot] : undefined

  return (
    <div className={s.diagramWrap}>
      <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${svgH}`} width="100%"
        style={{ maxWidth: 900, height: 'auto' }} role="img" aria-label={t('diagram')}>
        <rect x={0} y={0} width={VB_W} height={svgH} fill="var(--bg-surface)" rx={8} />

        {mode === 'distance' ? (
          <>
            <LimitLine x={scale.toX(state.nearLimit)} label={t('diagramNear')}
              top={DIAGRAM_PAD.top} bottom={plotBottom} />
            <LimitLine x={scale.toX(state.farLimit)} label={t('diagramFar')}
              top={DIAGRAM_PAD.top} bottom={plotBottom} />
          </>
        ) : (
          <LimitLine x={scale.toX(state.depthMm)} label={t('diagramSubject')}
            top={DIAGRAM_PAD.top} bottom={plotBottom} />
        )}

        <CoverageHeatmap rows={rows} scale={scale} y={covY} height={COV_H} drawW={DRAW_W} />

        <text x={DIAGRAM_PAD.left - 8} y={focusY + 14} fill="var(--text-secondary)"
          fontSize={9} textAnchor="end" fontWeight={500}>{t('diagramFocusPoints')}</text>
        <line x1={DIAGRAM_PAD.left} y1={focusY + 14} x2={VB_W - DIAGRAM_PAD.right} y2={focusY + 14}
          stroke="var(--border)" strokeWidth={1} />
        <FocusDots rows={rows} scale={scale} y={focusY + 14} hoveredShot={hoveredShot} />
        <text x={VB_W - DIAGRAM_PAD.right + 4} y={focusY + 17}
          fill="var(--text-secondary)" fontSize={9}>{rows.length}</text>

        {showBands && (
          <BandsLayer rows={rows} scale={scale} bandsY={bandsY} bandH={BAND_H}
            bandGap={BAND_GAP} hoveredShot={hoveredShot} />
        )}

        <DiagramAxis scale={scale} mode={mode} svgH={svgH} />

        <rect x={DIAGRAM_PAD.left} y={DIAGRAM_PAD.top} width={DRAW_W}
          height={plotBottom - DIAGRAM_PAD.top} fill="transparent"
          style={{ pointerEvents: 'all' }}
          onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
      </svg>
      {tooltipRow && hoveredShot !== null && (
        <DiagramTooltip state={state} index={hoveredShot} x={scale.toX(tooltipRow.center)} />
      )}
    </div>
  )
}
