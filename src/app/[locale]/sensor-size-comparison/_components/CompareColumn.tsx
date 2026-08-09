'use client'

import { useTranslations } from 'next-intl'
import { COMMON_MP, POPULAR_MODELS } from '@/lib/data/sensors'
import { pixelPitch } from '@/lib/math/diffraction'
import { formatAspectRatio } from '@/lib/math/resolution'
import type { ResolvedSensor, CustomSensor } from './sensorSizeTypes'
import ss from './SensorSize.module.css'

type CompareColumnProps = {
  sensor: ResolvedSensor
}

/**
 * One sensor's spec column inside `CompareDrawer`: display name, physical
 * dimensions, diagonal, area, aspect, crop factor, a representative
 * resolution figure, and popular camera models. Mirrors the computed-spec
 * portion of `SensorRowDetail` but laid out for side-by-side comparison
 * rather than an accordion.
 */
export function CompareColumn({ sensor: s }: CompareColumnProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const sensorsT = useTranslations('common.sensors')
  const isCustom = !s.group

  const name = sensorsT.has(s.id) ? sensorsT(s.id) : s.name
  const diagonal = Math.hypot(s.w, s.h)
  const area = s.w * s.h
  const cameraModels = isCustom ? [] : (POPULAR_MODELS[s.id] ?? [])

  // Representative resolution = the HIGHEST mp figure in COMMON_MP for this
  // preset (the current flagship). Film-group presets and cine_s16 have no
  // COMMON_MP entry at all (see sensors.ts) — render notApplicable and never
  // call pixelPitch, which would otherwise divide by a zero/NaN pixel count.
  const commonMpEntries = isCustom ? undefined : COMMON_MP[s.id]
  const topMp = isCustom
    ? (s as CustomSensor).mp
    : commonMpEntries && commonMpEntries.length > 0
      ? Math.max(...commonMpEntries.map((entry) => entry.mp))
      : undefined
  const resolution = topMp
    ? `${topMp} MP · ${pixelPitch(s.w, topMp, s.h).toFixed(1)} µm`
    : t('compare.notApplicable')

  return (
    <div className={ss.compareColumn}>
      <h3 className={ss.compareColumnName}>{name}</h3>
      <div className={ss.detailDims}>{s.w}×{s.h} mm</div>
      <dl className={ss.specGrid}>
        <div className={ss.specItem}><dt>{t('detail.diagonal')}</dt><dd>{diagonal.toFixed(1)} mm</dd></div>
        <div className={ss.specItem}><dt>{t('detail.area')}</dt><dd>{area.toFixed(1)} mm²</dd></div>
        <div className={ss.specItem}><dt>{t('detail.aspect')}</dt><dd>{formatAspectRatio(s.w, s.h)}</dd></div>
        <div className={ss.specItem}><dt>{t('tableCropFactor')}</dt><dd>{s.cropFactor.toFixed(2)}x</dd></div>
        <div className={ss.specItem}><dt>{t('compare.representativeResolution')}</dt><dd>{resolution}</dd></div>
      </dl>
      {cameraModels.length > 0 && (
        <div className={ss.pillSection}>
          <span className={ss.sectionLabel}>{t('detail.cameras')}</span>
          <div className={ss.pillRow}>
            {cameraModels.map((m) => <span key={m} className={ss.pill}>{m}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
