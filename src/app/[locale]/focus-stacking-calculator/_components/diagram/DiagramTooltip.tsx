'use client'

import { useTranslations } from 'next-intl'
import { formatDistance } from '@/components/shared/DistanceField'
import { formatMm } from '@/lib/utils/stackingExport'
import type { StackingState } from '../useStackingState'
import { VB_W } from '../diagramScale'
import s from '../FocusStacking.module.css'

interface DiagramTooltipProps {
  state: StackingState
  index: number
  x: number
}

/**
 * Mirrors ShotTable's row content — same translation keys (tableShot,
 * tableFocusDistance/tableRailPosition, focusStep) and the same formatters —
 * so the diagram tooltip and the table row a user might glance at next never
 * disagree on a shot's numbers. `x` is an already-scaled SVG coordinate
 * (from `scale.toX`); converted here to a percentage of the viewBox width
 * since the SVG itself scales responsively.
 */
export function DiagramTooltip({ state, index, x }: DiagramTooltipProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const pct = (x / VB_W) * 100
  const style = { left: `${pct}%` }

  if (state.mode === 'distance') {
    const shot = state.stackingResult.shots[index]
    if (!shot) return null
    const prev = state.stackingResult.shots[index - 1]
    const step = prev ? formatDistance(shot.focusDistance - prev.focusDistance) : '—'
    return (
      <div className={s.diagramTooltip} style={style}>
        <div>{t('tableShot')} {shot.number}</div>
        <div>{t('tableFocusDistance')}: {formatDistance(shot.focusDistance)}</div>
        <div>{t('diagramNear')}–{t('diagramFar')}: {formatDistance(shot.nearFocus)}–{formatDistance(shot.farFocus)}</div>
        <div>{t('focusStep')}: {step}</div>
      </div>
    )
  }

  const row = state.macroRows[index]
  if (!row) return null
  const step = index === 0 ? '—' : formatMm(state.macroResult.stepMm)
  return (
    <div className={s.diagramTooltip} style={style}>
      <div>{t('tableShot')} {row.number}</div>
      <div>{t('tableRailPosition')}: {formatMm(row.railPositionMm)}</div>
      <div>{t('focusStep')}: {step}</div>
    </div>
  )
}
