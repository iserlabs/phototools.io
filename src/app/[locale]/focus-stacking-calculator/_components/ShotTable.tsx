'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { formatDistance } from '@/components/shared/DistanceField'
import { formatMm } from '@/lib/utils/stackingExport'
import type { StackingState } from './useStackingState'
import s from './FocusStacking.module.css'

interface ShotTableProps {
  state: StackingState
  playing: boolean
}

export function ShotTable({ state, playing }: ShotTableProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const { mode, hoveredShot, setHoveredShot } = state
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  // Keep the active row visible during the play sweep
  useEffect(() => {
    if (!playing || hoveredShot === null) return
    bodyRef.current?.children[hoveredShot]?.scrollIntoView({ block: 'nearest' })
  }, [playing, hoveredShot])

  const isDistance = mode === 'distance'
  const rows = isDistance ? state.stackingResult.shots : state.macroRows

  return (
    <details className={s.tableWrap} open>
      <summary className={s.tableSummary}>{t('shotTable')} ({rows.length})</summary>
      <div className={s.tableScroll} onMouseLeave={() => { if (!playing) setHoveredShot(null) }}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>{t('tableShot')}</th>
              <th>{isDistance ? t('tableFocusDistance') : t('tableRailPosition')}</th>
              {isDistance && <th>{t('tableNear')}</th>}
              {isDistance && <th>{t('tableFar')}</th>}
              <th>{t('focusStep')}</th>
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {isDistance
              ? state.stackingResult.shots.map((shot, i) => (
                <tr key={shot.number}
                  className={hoveredShot === i ? s.rowActive : undefined}
                  onMouseEnter={() => { if (!playing) setHoveredShot(i) }}>
                  <td>{shot.number}</td>
                  <td>{formatDistance(shot.focusDistance)}</td>
                  <td>{formatDistance(shot.nearFocus)}</td>
                  <td>{formatDistance(shot.farFocus)}</td>
                  <td>{i === 0 ? '—' : formatDistance(shot.focusDistance - state.stackingResult.shots[i - 1].focusDistance)}</td>
                </tr>
              ))
              : state.macroRows.map((row, i) => (
                <tr key={row.number}
                  className={hoveredShot === i ? s.rowActive : undefined}
                  onMouseEnter={() => { if (!playing) setHoveredShot(i) }}>
                  <td>{row.number}</td>
                  <td>{formatMm(row.railPositionMm)}</td>
                  <td>{i === 0 ? '—' : formatMm(state.macroResult.stepMm)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
