'use client'

import { forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { SENSOR_SPECS } from '@/lib/data/sensors'
import { calcCropFactor, COMMON_MP, POPULAR_MODELS } from '@/lib/data/sensors'
import type { SensorPreset } from '@/lib/types'
import styles from './SensorSpecCard.module.css'

interface SensorSpecCardProps {
  sensor: Required<SensorPreset> | null
  visible: boolean
}

export const SensorSpecCard = forwardRef<HTMLDivElement, SensorSpecCardProps>(
  function SensorSpecCard({ sensor, visible }, ref) {
    const t = useTranslations('toolUI.sensor-size-comparison')

    if (!sensor || !visible) {
      return <div ref={ref} className={styles.card} style={{ display: 'none' }} />
    }

    const spec = SENSOR_SPECS[sensor.id]
    const cropFactor = calcCropFactor(sensor.w, sensor.h)
    const area = (sensor.w * sensor.h).toFixed(0)
    const mpEntries = COMMON_MP[sensor.id]
    const models = POPULAR_MODELS[sensor.id]

    return (
      <div
        ref={ref}
        className={styles.card}
        style={{ borderColor: sensor.color, '--sensor-color': sensor.color } as React.CSSProperties}
      >
        <div className={styles.header}>
          <span className={styles.dot} style={{ background: sensor.color }} />
          <span className={styles.name}>{sensor.name}</span>
        </div>

        <div className={styles.grid}>
          <span className={styles.label}>{t('specDimensions')}</span>
          <span className={styles.value}>{sensor.w} × {sensor.h} mm</span>

          <span className={styles.label}>{t('specArea')}</span>
          <span className={styles.value}>{area} mm²</span>

          <span className={styles.label}>{t('tableCropFactor')}</span>
          <span className={styles.value}>{cropFactor.toFixed(2)}×</span>

          {spec && (
            <>
              <span className={styles.label}>{t('specIsoRange')}</span>
              <span className={styles.value}>{spec.isoRange}</span>

              <span className={styles.label}>{t('specDynamicRange')}</span>
              <span className={styles.value}>{spec.dynamicRange} EV</span>

              <span className={styles.label}>{t('specTypicalUse')}</span>
              <span className={styles.value}>{spec.typicalUse}</span>
            </>
          )}
        </div>

        {mpEntries && mpEntries.length > 0 && (
          <div className={styles.mpSection}>
            <span className={styles.mpLabel}>{t('specResolutions')}</span>
            {mpEntries.slice(0, 3).map((entry) => (
              <span key={entry.mp} className={styles.mpEntry}>
                {entry.mp} MP — {entry.models}
              </span>
            ))}
          </div>
        )}

        {models && (
          <div className={styles.modelsSection}>
            <span className={styles.modelsLabel}>{t('specModels')}</span>
            <span className={styles.modelsText}>{models.join(', ')}</span>
          </div>
        )}

        {spec?.notableFeature && (
          <div className={styles.feature}>{spec.notableFeature}</div>
        )}
      </div>
    )
  },
)
