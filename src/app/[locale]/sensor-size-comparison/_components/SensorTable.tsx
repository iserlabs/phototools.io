'use client'

import { Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { calcCropFactor, calcAspectCropFactor } from '@/lib/data/sensors'
import type { ResolvedSensor } from './sensorSizeTypes'
import { formatAspectRatio } from '@/lib/math/resolution'
import { SensorRowDetail } from './SensorRowDetail'
import ss from './SensorSize.module.css'

type SensorTableProps = {
  sensors: ResolvedSensor[]
  // Set by SensorSize.tsx when a canvas rect is clicked (overlay mode) or a
  // row's own toggle button is clicked. Anchors `scrollIntoView`, highlights
  // the matching row, and drives the accordion panel rendered below it.
  expandedId: string | null
  onToggleExpand: (id: string) => void
  // SensorSize.tsx renders this component twice — a desktop copy and a
  // mobile copy — both present in the DOM at once (CSS hides whichever one
  // doesn't match the viewport). `variant` namespaces each row's `id` so the
  // two copies never collide (`sensor-row-desktop-<id>` /
  // `sensor-row-mobile-<id>`); `useSensorCanvas`'s click-to-scroll always
  // targets the desktop id, gated to the same >=1024px breakpoint where the
  // desktop copy is actually visible. The accordion toggle's `id`/
  // `aria-controls` pairing (`sensor-detail-<variant>-<id>`) follows the
  // same per-instance scheme so it never collides either.
  variant: 'desktop' | 'mobile'
}

export function SensorTable({ sensors, expandedId, onToggleExpand, variant }: SensorTableProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const sorted = [...sensors].sort((a, b) => (b.w * b.h) - (a.w * a.h))
  return (
    <table className={ss.table}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>{t('tableSensor')}</th>
          <th>{t('tableWidth')}</th>
          <th>{t('tableHeight')}</th>
          <th>{t('tableAspectRatio')}</th>
          <th>{t('tableArea')}</th>
          <th>{t('tableCropFactor')}</th>
          <th>{t('tableAspectCrop')}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((s) => {
          const area = s.w * s.h
          const crop = calcCropFactor(s.w, s.h)
          const aspectCrop = calcAspectCropFactor(s.w, s.h)
          const ratio = formatAspectRatio(s.w, s.h)
          const isExpanded = s.id === expandedId
          const detailId = `sensor-detail-${variant}-${s.id}`
          return (
            <Fragment key={s.id}>
              <tr id={`sensor-row-${variant}-${s.id}`} className={isExpanded ? ss.tableRowExpanded : undefined}>
                <td style={{ textAlign: 'left' }}>
                  <button
                    type="button"
                    className={ss.rowToggle}
                    aria-expanded={isExpanded}
                    aria-controls={detailId}
                    onClick={() => onToggleExpand(s.id)}
                  >
                    <span className={ss.groupChevron} data-open={isExpanded} aria-hidden="true">▸</span>
                    <span className={ss.sensorCell}>
                      <span className={ss.tableDot} style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </button>
                </td>
                <td>{s.w}</td>
                <td>{s.h}</td>
                <td>{ratio}</td>
                <td>{area.toFixed(1)}</td>
                <td>{crop.toFixed(2)}x</td>
                <td>{aspectCrop.toFixed(2)}x</td>
              </tr>
              {isExpanded && (
                <tr id={detailId}>
                  <td colSpan={7}>
                    <SensorRowDetail sensor={s} />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
