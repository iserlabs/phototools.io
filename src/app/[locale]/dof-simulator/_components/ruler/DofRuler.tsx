'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { RULER_MIN, RULER_MAX, distToX, xToDist } from './rulerScale'
import { PAD_L, TRACK_W, VB_W, VB_H, GROUND_Y, NUDGE_M, DEFAULT_RULER_LABELS, clampRange, formatMeters, type RulerLabels } from './rulerLayout'
import { RulerBackdrop } from './RulerBackdrop'
import { SubjectFigure } from './RulerFigures'
import styles from './ruler.module.css'

export type { RulerLabels }

interface DofRulerProps {
  distanceM: number
  nearFocus: number
  farFocus: number
  hyperfocal: number
  onDistanceChange(v: number): void
  labels?: RulerLabels
}

/**
 * Log-scale distance strip below the viewport: photographer + subject
 * silhouettes standing on a ground plane, with the in-focus band and
 * hyperfocal marker drawn behind them (RulerBackdrop). The subject figure
 * is the only interactive element — drag it (pointer capture keeps the
 * drag tracking even off-figure) or focus + arrow-key nudge it in 0.1m
 * steps. See rulerScale.ts for the pure log-axis math this all sits on.
 */
export function DofRuler({
  distanceM, nearFocus, farFocus, hyperfocal, onDistanceChange, labels = DEFAULT_RULER_LABELS,
}: DofRulerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  const clientXToDist = useCallback(
    (clientX: number): number => {
      const svg = svgRef.current
      if (!svg) return distanceM
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0) return distanceM
      const xInTrack = ((clientX - rect.left) / rect.width) * VB_W - PAD_L
      return xToDist(xInTrack, TRACK_W)
    },
    [distanceM],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      draggingRef.current = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      onDistanceChange(clientXToDist(e.clientX))
    },
    [clientXToDist, onDistanceChange],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (!draggingRef.current) return
      onDistanceChange(clientXToDist(e.clientX))
    },
    [clientXToDist, onDistanceChange],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGGElement>) => {
    draggingRef.current = false
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onDistanceChange(clampRange(distanceM - NUDGE_M))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onDistanceChange(clampRange(distanceM + NUDGE_M))
      }
    },
    [distanceM, onDistanceChange],
  )

  const subjectX = useMemo(() => PAD_L + distToX(distanceM, TRACK_W), [distanceM])
  // The ruler's [RULER_MIN, RULER_MAX] track is a narrower DISPLAY scale than
  // the canonical state domain (rulerScale.ts) -- a distance outside it (e.g.
  // a framing preset solving to ~85m) still pins the subject figure at the
  // nearest edge, same as any other value beyond the visual range. Without a
  // cue, that pin is indistinguishable from the figure genuinely standing at
  // 0.3m/50m. Label it with the real value so the pin reads as "off-scale",
  // not as a silently wrong position (dof-simulator-rebuild final fix wave, B4).
  const offScale = distanceM > RULER_MAX || distanceM < RULER_MIN

  return (
    <div className={styles.ruler}>
      <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className={styles.svg}>
        <RulerBackdrop nearFocus={nearFocus} farFocus={farFocus} hyperfocal={hyperfocal} labels={labels} />

        <g
          className={`${styles.subjectHandle} ${dragging ? styles.subjectActive : ''}`}
          transform={`translate(${subjectX}, ${GROUND_Y})`}
          role="slider"
          tabIndex={0}
          aria-label={labels.subject}
          aria-valuemin={RULER_MIN}
          aria-valuemax={RULER_MAX}
          aria-valuenow={Math.round(clampRange(distanceM) * 100) / 100}
          aria-valuetext={formatMeters(distanceM, labels.distanceUnit)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          <rect x={-20} y={-70} width={40} height={80} fill="transparent" />
          <SubjectFigure size={46} />
          {offScale && (
            <text x={0} y={-78} textAnchor="middle" aria-hidden className={styles.offScaleLabel}>
              {formatMeters(distanceM, labels.distanceUnit)}
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
