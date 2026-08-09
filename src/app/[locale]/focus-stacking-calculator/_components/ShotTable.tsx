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
  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  // Keep the active row visible during the play sweep, scoped to this table's
  // own scroll container only. scrollIntoView() would scroll every scrollable
  // ancestor (including .canvasArea), pushing the diagram it's animating out
  // of view — see the focus-stacking e2e spec's scroll-containment assertion.
  useEffect(() => {
    if (!playing || hoveredShot === null) return
    const container = scrollRef.current
    const row = bodyRef.current?.children[hoveredShot] as HTMLElement | undefined
    if (!container || !row) return
    const rowTop = row.offsetTop
    const rowBottom = rowTop + row.offsetHeight
    const viewTop = container.scrollTop
    const viewBottom = viewTop + container.clientHeight
    if (rowTop < viewTop) {
      container.scrollTop = rowTop
    } else if (rowBottom > viewBottom) {
      container.scrollTop = rowBottom - container.clientHeight
    }
  }, [playing, hoveredShot])

  const isDistance = mode === 'distance'
  const rows = isDistance ? state.stackingResult.shots : state.macroRows

  return (
    <details className={s.tableWrap} open>
      <summary className={s.tableSummary}>{t('shotTable')} ({rows.length})</summary>
      <div ref={scrollRef} className={s.tableScroll} onMouseLeave={() => { if (!playing) setHoveredShot(null) }}>
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
