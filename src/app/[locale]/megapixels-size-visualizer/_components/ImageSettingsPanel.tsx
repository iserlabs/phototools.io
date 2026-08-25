'use client'

import { useTranslations } from 'next-intl'
import { ASPECT_RATIOS } from '@/lib/data/aspectRatios'
import { NATIVE_ASPECT_OPTION_ID } from '@/lib/data/megapixelVisualizer'
import type { UnitSystem } from '@/lib/types'
import ss from './MegapixelVisualizer.module.css'

interface Props {
  aspectId: string
  units: UnitSystem
  onAspectChange: (id: string) => void
  onUnitsChange: (u: UnitSystem) => void
}

const UNIT_OPTIONS: { value: UnitSystem; labelKey: string }[] = [
  { value: 'metric',   labelKey: 'unitsMetric' },
  { value: 'imperial', labelKey: 'unitsImperial' },
]

export function ImageSettingsPanel({
  aspectId,
  units,
  onAspectChange,
  onUnitsChange,
}: Props) {
  const t = useTranslations('toolUI.megapixels-size-visualizer')

  return (
    <>
      <fieldset className={ss.controlGroup}>
        <legend className={ss.legend}>{t('aspectRatio')}</legend>
        <div className={ss.aspectGrid}>
          <button
            type="button"
            onClick={() => onAspectChange(NATIVE_ASPECT_OPTION_ID)}
            className={`${ss.aspectBtn} ${aspectId === NATIVE_ASPECT_OPTION_ID ? ss.aspectBtnActive : ''}`}
            aria-pressed={aspectId === NATIVE_ASPECT_OPTION_ID}
          >
            {t('aspectNative')}
          </button>
          {ASPECT_RATIOS.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAspectChange(a.id)}
              className={`${ss.aspectBtn} ${aspectId === a.id ? ss.aspectBtnActive : ''}`}
              aria-pressed={aspectId === a.id}
            >
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={ss.controlGroup}>
        <legend className={ss.legend}>{t('units')}</legend>
        <div className={ss.segmentedGroup}>
          {UNIT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUnitsChange(opt.value)}
              className={`${ss.segmentedBtn} ${units === opt.value ? ss.segmentedBtnActive : ''}`}
              aria-pressed={units === opt.value}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  )
}
