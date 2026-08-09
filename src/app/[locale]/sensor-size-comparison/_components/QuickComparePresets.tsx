'use client'

import { useTranslations } from 'next-intl'
import { COMPARE_PRESETS } from '@/lib/data/sensors'
import ss from './SensorSize.module.css'

type QuickComparePresetsProps = {
  visible: Set<string>
  onApplyPreset: (sensorIds: string[]) => void
}

/** True when `visible` is exactly the preset's sensor set, order-independent. */
function isActivePreset(visible: Set<string>, sensorIds: string[]): boolean {
  if (visible.size !== sensorIds.length) return false
  const sortedVisible = [...visible].sort().join('|')
  const sortedPreset = [...sensorIds].sort().join('|')
  return sortedVisible === sortedPreset
}

export function QuickComparePresets({ visible, onApplyPreset }: QuickComparePresetsProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')

  return (
    <div>
      <div className={ss.sectionLabel}>{t('quickCompare')}</div>
      <div className={ss.presetRow}>
        {COMPARE_PRESETS.map((p) => {
          const active = isActivePreset(visible, p.sensorIds)
          return (
            <button
              key={p.id}
              type="button"
              className={active ? `${ss.presetBtn} ${ss.presetBtnActive}` : ss.presetBtn}
              aria-pressed={active}
              title={t('presetReplacesNote')}
              onClick={() => onApplyPreset(p.sensorIds)}
            >
              {t(`presets.${p.id}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
