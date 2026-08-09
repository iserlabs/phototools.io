'use client'

import { useTranslations } from 'next-intl'
import { calcCropFactor, COMMON_MP, POPULAR_MODELS } from '@/lib/data/sensors'
import { areaRatio, evDiff, formatEv, equivalentFocal, equivalentAperture } from '@/lib/math/sensorEquivalence'
import { pixelPitch } from '@/lib/math/diffraction'
import { formatAspectRatio } from '@/lib/math/resolution'
import type { ResolvedSensor, CustomSensor } from './sensorSizeTypes'
import ss from './SensorSize.module.css'

type SensorRowDetailProps = {
  sensor: ResolvedSensor
}

/**
 * Accordion content rendered under an expanded `SensorTable` row: computed
 * specs, a lens-equivalence sentence, resolution pills, camera pills, and
 * (once Task 9 lands the prose) a profile block. Curated presets always
 * carry `group`; user-created custom sensors never do (see
 * `sensorSizeTypes.ts`), which is how this component tells them apart
 * without a separate `isCustom` flag threaded through props.
 */
export function SensorRowDetail({ sensor: s }: SensorRowDetailProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const isCustom = !s.group

  const diagonal = Math.hypot(s.w, s.h)
  const area = s.w * s.h
  const crop = calcCropFactor(s.w, s.h)
  const vsFullFrame = s.id === 'ff'
    ? t('detail.referenceSensor')
    : `${areaRatio(s.w, s.h).toFixed(2)}× · ${formatEv(evDiff(s.w, s.h))}`

  const eqFocal = equivalentFocal(50, s.cropFactor, 1)
  const eqAp = equivalentAperture(2.8, s.cropFactor, 1).toFixed(1)

  const customMp = (s as CustomSensor).mp
  const mpEntries = isCustom
    ? (customMp ? [{ mp: customMp, models: undefined as string | undefined }] : [])
    : (COMMON_MP[s.id] ?? [])
  const cameraModels = isCustom ? [] : (POPULAR_MODELS[s.id] ?? [])

  // `t.has` resolves the key silently (no onError/console.error) — the repo's
  // default next-intl config has no custom onError or getMessageFallback, so
  // calling `t()` directly on a key that doesn't exist yet (sensorProfiles.*
  // ships in Task 9) would console.error on every render AND paint the raw
  // "toolUI.sensor-size-comparison.sensorProfiles.<id>.character" path as
  // fallback text. Gating on `.has()` avoids both until the prose lands.
  const hasProfile = !isCustom
    && t.has(`sensorProfiles.${s.id}.character`)
    && t.has(`sensorProfiles.${s.id}.context`)

  return (
    <div className={ss.detail}>
      <div className={ss.detailDims}>{s.w}×{s.h} mm</div>
      <dl className={ss.specGrid}>
        <div className={ss.specItem}><dt>{t('detail.diagonal')}</dt><dd>{diagonal.toFixed(1)} mm</dd></div>
        <div className={ss.specItem}><dt>{t('detail.area')}</dt><dd>{area.toFixed(1)} mm²</dd></div>
        <div className={ss.specItem}><dt>{t('detail.aspect')}</dt><dd>{formatAspectRatio(s.w, s.h)}</dd></div>
        <div className={ss.specItem}><dt>{t('tableCropFactor')}</dt><dd>{crop.toFixed(2)}x</dd></div>
        <div className={ss.specItem}><dt>{t('detail.vsFullFrame')}</dt><dd>{vsFullFrame}</dd></div>
      </dl>
      <p className={ss.detailEquivalence}>{t('detail.equivalence', { focal: 50, ap: '2.8', eqFocal, eqAp })}</p>
      {mpEntries.length > 0 && (
        <div className={ss.pillSection}>
          <span className={ss.sectionLabel}>{t('detail.resolutions')}</span>
          <div className={ss.pillRow}>
            {mpEntries.map((entry) => (
              <span key={entry.mp} className={ss.pill} title={entry.models}>
                {entry.mp} MP · {pixelPitch(s.w, entry.mp, s.h).toFixed(1)} µm
              </span>
            ))}
          </div>
        </div>
      )}
      {cameraModels.length > 0 && (
        <div className={ss.pillSection}>
          <span className={ss.sectionLabel}>{t('detail.cameras')}</span>
          <div className={ss.pillRow}>
            {cameraModels.map((m) => <span key={m} className={ss.pill}>{m}</span>)}
          </div>
        </div>
      )}
      {isCustom ? (
        <p className={ss.detailProfile}>{t('detail.customNoProfile')}</p>
      ) : hasProfile ? (
        <div className={ss.detailProfile}>
          <p><strong>{t('detail.character')}:</strong> {t(`sensorProfiles.${s.id}.character`)}</p>
          <p><strong>{t('detail.context')}:</strong> {t(`sensorProfiles.${s.id}.context`)}</p>
        </div>
      ) : null}
    </div>
  )
}
