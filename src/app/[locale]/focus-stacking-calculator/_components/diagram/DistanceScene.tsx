'use client'

import { useTranslations } from 'next-intl'
import type { StackingState } from '../useStackingState'
import type { DiagramScale } from '../diagramScale'
import { VB_W, DIAGRAM_PAD } from '../diagramScale'
import { SceneCamera } from './SceneCamera'
import s from '../FocusStacking.module.css'

interface DistanceSceneProps {
  state: StackingState
  scale: DiagramScale
}

const WEDGE_TOP = 20
const GROUND_Y = 64
const CAMERA_X = DIAGRAM_PAD.left - 36
const LABEL_Y = 10

/**
 * Distance-mode scene: a camera glyph off to the left, a ground line, and a
 * translucent depth-of-field wedge between the near/far posts — all placed
 * with the SAME `scale.toX` the chart below uses, so the posts sit exactly
 * over the chart's near/far limit lines.
 *
 * The wedge is a `<rect>` (not a literal polygon) so it can reuse the
 * `.bandRect` transition class — that class animates a rect's `x`/`width`,
 * which is what actually lets the wedge glide when near/far change, the
 * same way BandsLayer's bands do below.
 */
export function DistanceScene({ state, scale }: DistanceSceneProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const { nearLimit, farLimit, hoveredShot, stackingResult } = state
  const edge = VB_W - DIAGRAM_PAD.right
  const x1 = scale.toX(nearLimit)
  const x2 = scale.toX(farLimit)
  const hoveredShotData = hoveredShot !== null ? stackingResult.shots[hoveredShot] : undefined

  return (
    <>
      {scale.infinite && (
        <defs>
          <linearGradient id="sceneWedgeFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="85%" stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
      )}

      <rect className={s.bandRect} x={x1} y={WEDGE_TOP} width={Math.max(0, x2 - x1)}
        height={GROUND_Y - WEDGE_TOP}
        fill={scale.infinite ? 'url(#sceneWedgeFade)' : 'color-mix(in srgb, var(--accent) 18%, transparent)'} />

      <line x1={4} y1={GROUND_Y} x2={edge} y2={GROUND_Y} stroke="var(--border)" strokeWidth={1} />

      <SceneCamera x={CAMERA_X} groundY={GROUND_Y} label={t('sceneCamera')} />

      <line x1={x1} y1={WEDGE_TOP - 6} x2={x1} y2={GROUND_Y + 4}
        stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      <text x={x1} y={LABEL_Y} fill="var(--accent)" fontSize={10}
        textAnchor="middle" fontWeight={600}>{t('diagramNear')}</text>

      {scale.infinite ? (
        <text x={edge} y={LABEL_Y} fill="var(--accent)" fontSize={11}
          textAnchor="middle" fontWeight={600}>{t('infinity')}</text>
      ) : (
        <>
          <line x1={x2} y1={WEDGE_TOP - 6} x2={x2} y2={GROUND_Y + 4}
            stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
          <text x={x2} y={LABEL_Y} fill="var(--accent)" fontSize={10}
            textAnchor="middle" fontWeight={600}>{t('diagramFar')}</text>
        </>
      )}

      {hoveredShotData && isFinite(hoveredShotData.focusDistance) && (
        <line x1={scale.toX(hoveredShotData.focusDistance)} y1={WEDGE_TOP - 4}
          x2={scale.toX(hoveredShotData.focusDistance)} y2={GROUND_Y + 4}
          stroke="var(--accent)" strokeWidth={2} opacity={0.9} />
      )}
    </>
  )
}
