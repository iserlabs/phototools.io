'use client'

import { useTranslations } from 'next-intl'
import { SENSORS } from '@/lib/data/sensors'
import { FocalLengthField } from '@/components/shared/FocalLengthField'
import { ApertureField } from '@/components/shared/ApertureField'
import { DistanceField } from '@/components/shared/DistanceField'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { getSkeletonBySlug } from '@/lib/data/education'
import type { StackingState } from './useStackingState'
import s from './FocusStacking.module.css'

interface StackingSettingsPanelProps {
  state: StackingState
}

export function StackingSettingsPanel({ state }: StackingSettingsPanelProps) {
  const {
    focalLength, aperture, sensorId,
    nearLimit, farLimit, overlapPct,
    onFocalLengthChange, onApertureChange, onSensorChange,
    onNearLimitChange, onFarLimitChange, onOverlapChange,
  } = state
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const sensorsT = useTranslations('common.sensors')
  const et = useTranslations('education.focus-stacking-calculator')
  const skel = getSkeletonBySlug('focus-stacking-calculator')
  const tooltips = skel
    ? Object.fromEntries(
        skel.tooltipKeys.map((key) => [
          key,
          { term: et(`tooltips.${key}.term`), definition: et(`tooltips.${key}.definition`) },
        ]),
      )
    : undefined

  const overlapInt = Math.round(overlapPct * 100)

  return (
    <>
      {/* Camera & Lens panel */}
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{t('camera')}</h3>

        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('focalLength')}
            {tooltips?.focalLength && <InfoTooltip tooltip={tooltips.focalLength} />}
          </label>
          <FocalLengthField value={focalLength} onChange={onFocalLengthChange} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('aperture')}
            {tooltips?.aperture && <InfoTooltip tooltip={tooltips.aperture} />}
          </label>
          <ApertureField value={aperture} onChange={onApertureChange} />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('sensor')}
            {tooltips?.sensor && <InfoTooltip tooltip={tooltips.sensor} />}
          </label>
          <select
            className={s.select}
            value={sensorId}
            onChange={(e) => onSensorChange(e.target.value)}
          >
            {SENSORS.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensorsT.has(sensor.id) ? sensorsT(sensor.id) : sensor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Depth Range panel */}
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{t('depthRange')}</h3>

        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('nearLimit')}
            {tooltips?.nearLimit && <InfoTooltip tooltip={tooltips.nearLimit} />}
          </label>
          <DistanceField
            value={nearLimit}
            onChange={onNearLimitChange}
            min={0.1}
            max={100}
            label={t('nearLimit')}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('farLimit')}
            {tooltips?.farLimit && <InfoTooltip tooltip={tooltips.farLimit} />}
          </label>
          <DistanceField
            value={farLimit}
            onChange={onFarLimitChange}
            min={0.1}
            max={100}
            label={t('farLimit')}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('overlap')}
            {tooltips?.overlap && <InfoTooltip tooltip={tooltips.overlap} />}
          </label>
          <div className={s.sliderRow}>
            <input
              type="range"
              className={s.slider}
              min={10}
              max={50}
              step={1}
              value={overlapInt}
              onChange={(e) => onOverlapChange(Number(e.target.value) / 100)}
              aria-label={`${t('overlap')}: ${overlapInt}%`}
            />
            <span className={s.sliderValue}>{overlapInt}%</span>
          </div>
        </div>
      </div>
    </>
  )
}
