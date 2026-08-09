'use client'

import { useTranslations } from 'next-intl'
import type { StackingState } from '../useStackingState'
import type { DiagramScale } from '../diagramScale'
import { SceneCamera } from './SceneCamera'
import s from '../FocusStacking.module.css'

interface MacroSceneProps {
  state: StackingState
  scale: DiagramScale
}

const SUBJECT_CY = 34
const SUBJECT_RY = 16
const PLANE_TOP = 14
const PLANE_BOTTOM = 52
const PLANE_WIDTH = 1.2
const PLANE_WIDTH_HOVER = 2.2
const RAIL_Y = 72
const RAIL_THICKNESS = 1.5
const LABEL_Y = 10

/**
 * Macro-mode scene: a subject blob spanning the depth being stacked, a
 * capped set of slice planes cutting through it (dense stacks would
 * otherwise render hundreds of lines), and a rail-travel arrow beneath —
 * all placed with the SAME `scale.toX` the chart below uses.
 *
 * Every animated shape here is a `<rect>` (planes, rail shaft) or `<ellipse>`
 * (subject), never a `<line>` — SVG2 only exposes `x`/`width`/`cx`/`rx` (etc.)
 * as CSS-transitionable properties, and `<line>`'s `x1`/`x2` are NOT on that
 * list in any current browser, so a line can never actually glide via CSS no
 * matter what class it's given. The rail arrow's head is the one exception
 * left as plain `<line>`s with no transition class — an arrowhead is a
 * two-segment cap, not a span, and there is no non-contorted way to express
 * it as a transitionable shape, so it snaps to the new endpoint instead of
 * gliding (acceptable: it's a small terminal glyph, not the whole span).
 */
export function MacroScene({ state, scale }: MacroSceneProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const { macroRows, macroResult, depthMm, hoveredShot } = state
  const railStartX = scale.toX(0)
  const railEndX = scale.toX(macroResult.railTravelMm)
  const subjectX1 = scale.toX(0)
  const subjectX2 = scale.toX(depthMm)
  const subjectCx = (subjectX1 + subjectX2) / 2
  const subjectRx = Math.abs(subjectX2 - subjectX1) / 2

  const capStep = Math.max(1, Math.ceil(macroRows.length / 40))

  return (
    <>
      <ellipse className={s.sceneEllipse} cx={subjectCx} cy={SUBJECT_CY} rx={subjectRx} ry={SUBJECT_RY}
        fill="color-mix(in srgb, var(--accent) 10%, transparent)" stroke="var(--text-secondary)" strokeWidth={1.5} />
      <text x={subjectCx} y={LABEL_Y} fill="var(--text-secondary)" fontSize={9}
        textAnchor="middle" fontWeight={500}>{t('diagramSubject')}</text>

      {macroRows.map((row, i) => {
        const isHovered = hoveredShot === i
        if (i % capStep !== 0 && !isHovered) return null
        const x = scale.toX(row.sliceStartMm)
        const w = isHovered ? PLANE_WIDTH_HOVER : PLANE_WIDTH
        return (
          <rect key={row.number} className={s.bandRect} x={x - w / 2} y={PLANE_TOP}
            width={w} height={PLANE_BOTTOM - PLANE_TOP}
            fill="var(--accent)" opacity={isHovered ? 1 : 0.3} />
        )
      })}

      <rect className={s.bandRect} x={railStartX} y={RAIL_Y - RAIL_THICKNESS / 2}
        width={Math.max(0, railEndX - railStartX)} height={RAIL_THICKNESS} fill="var(--text-secondary)" />
      <line x1={railEndX - 6} y1={RAIL_Y - 4} x2={railEndX} y2={RAIL_Y}
        stroke="var(--text-secondary)" strokeWidth={1.5} />
      <line x1={railEndX - 6} y1={RAIL_Y + 4} x2={railEndX} y2={RAIL_Y}
        stroke="var(--text-secondary)" strokeWidth={1.5} />
      <text x={(railStartX + railEndX) / 2} y={RAIL_Y - 6} fill="var(--text-secondary)"
        fontSize={9} textAnchor="middle" fontWeight={500}>{t('sceneRail')}</text>

      <SceneCamera x={railStartX} groundY={RAIL_Y} label={t('sceneCamera')} />
    </>
  )
}
