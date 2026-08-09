'use client'

import { useTranslations } from 'next-intl'
import { SENSORS } from '@/lib/data/sensors'
import { ApertureField } from '@/components/shared/ApertureField'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { getSkeletonBySlug } from '@/lib/data/education'
import type { StackingState } from './useStackingState'
import s from './FocusStacking.module.css'

const MAG_PRESETS = [
  { value: 0.5, label: '1:2' }, { value: 1, label: '1:1' }, { value: 2, label: '2:1' },
  { value: 3, label: '3:1' }, { value: 5, label: '5:1' },
]

export function MacroSettingsPanel({ state }: { state: StackingState }) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const sensorsT = useTranslations('common.sensors')
  const et = useTranslations('education.focus-stacking-calculator')
  const skel = getSkeletonBySlug('focus-stacking-calculator')
  const tooltips = skel ? Object.fromEntries(skel.tooltipKeys.map((key) => [
    key, { term: et(`tooltips.${key}.term`), definition: et(`tooltips.${key}.definition`) },
  ])) : undefined
  const overlapInt = Math.round(state.overlapPct * 100)

  return (
    <>
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{t('camera')}</h3>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('magnification')}
            {tooltips?.magnification && <InfoTooltip tooltip={tooltips.magnification} />}
          </label>
          <div className={s.sliderRow}>
            <input type="range" className={s.slider} min={0.25} max={5} step={0.05}
              value={state.magnification}
              onChange={(e) => state.onMagnificationChange(Number(e.target.value))}
              aria-label={`${t('magnification')}: ${state.magnification}×`} />
            <span className={s.sliderValue}>{state.magnification.toFixed(2)}×</span>
          </div>
          <div className={s.presetRow}>
            {MAG_PRESETS.map((p) => (
              <button key={p.label} type="button"
                className={`${s.presetBtn} ${state.magnification === p.value ? s.presetBtnActive : ''}`}
                onClick={() => state.onMagnificationChange(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('aperture')}
            {tooltips?.aperture && <InfoTooltip tooltip={tooltips.aperture} />}
          </label>
          <ApertureField value={state.aperture} onChange={state.onApertureChange} />
        </div>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('sensor')}
            {tooltips?.sensor && <InfoTooltip tooltip={tooltips.sensor} />}
          </label>
          <select className={s.select} value={state.sensorId}
            onChange={(e) => state.onSensorChange(e.target.value)}>
            {SENSORS.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensorsT.has(sensor.id) ? sensorsT(sensor.id) : sensor.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{t('depthRange')}</h3>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('subjectDepth')}
            {tooltips?.railStep && <InfoTooltip tooltip={tooltips.railStep} />}
          </label>
          <div className={s.numRow}>
            <input type="range" className={s.slider} min={0.5} max={100} step={0.5}
              value={Math.min(state.depthMm, 100)}
              onChange={(e) => state.onDepthChange(Number(e.target.value))}
              aria-label={t('subjectDepth')} />
            <input type="number" className={s.numInput} min={0.5} max={500} step={0.5}
              value={state.depthMm}
              onChange={(e) => { const v = Number(e.target.value); if (v >= 0.5 && v <= 500) state.onDepthChange(v) }}
              aria-label={`${t('subjectDepth')} (mm)`} />
            <span className={s.sliderValue}>mm</span>
          </div>
        </div>
        <div className={s.field}>
          <label className={s.fieldLabel}>
            {t('overlap')}
            {tooltips?.overlap && <InfoTooltip tooltip={tooltips.overlap} />}
          </label>
          <div className={s.sliderRow}>
            <input type="range" className={s.slider} min={10} max={50} step={1}
              value={overlapInt}
              onChange={(e) => state.onOverlapChange(Number(e.target.value) / 100)}
              aria-label={`${t('overlap')}: ${overlapInt}%`} />
            <span className={s.sliderValue}>{overlapInt}%</span>
          </div>
        </div>
      </div>
    </>
  )
}
