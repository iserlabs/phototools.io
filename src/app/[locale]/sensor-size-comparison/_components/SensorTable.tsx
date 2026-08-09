'use client'

import { useTranslations } from 'next-intl'
import { calcCropFactor, calcAspectCropFactor } from '@/lib/data/sensors'
import type { ResolvedSensor } from './sensorSizeTypes'
import { formatAspectRatio } from '@/lib/math/resolution'
import ss from './SensorSize.module.css'

type SensorTableProps = {
  sensors: ResolvedSensor[]
  // Set by SensorSize.tsx when a canvas rect is clicked (overlay mode).
  // Anchors `scrollIntoView` and highlights the matching row; the row's
  // deep-dive content is added in a later task.
  expandedId?: string | null
  // SensorSize.tsx renders this component twice — a desktop copy and a
  // mobile copy — both present in the DOM at once (CSS hides whichever one
  // doesn't match the viewport). `variant` namespaces each row's `id` so the
  // two copies never collide (`sensor-row-desktop-<id>` /
  // `sensor-row-mobile-<id>`); `useSensorCanvas`'s click-to-scroll always
  // targets the desktop id, gated to the same >=1024px breakpoint where the
  // desktop copy is actually visible. Keep using this per-instance scheme
  // for any future `id`/`aria-controls` pairing (e.g. an accordion toggle)
  // added to these rows.
  variant: 'desktop' | 'mobile'
}

export function SensorTable({ sensors, expandedId, variant }: SensorTableProps) {
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
          return (
            <tr key={s.id} id={`sensor-row-${variant}-${s.id}`} className={s.id === expandedId ? ss.tableRowExpanded : undefined}>
              <td style={{ textAlign: 'left' }}>
                <div className={ss.sensorCell}>
                  <span className={ss.tableDot} style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              </td>
              <td>{s.w}</td>
              <td>{s.h}</td>
              <td>{ratio}</td>
              <td>{area.toFixed(1)}</td>
              <td>{crop.toFixed(2)}x</td>
              <td>{aspectCrop.toFixed(2)}x</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
