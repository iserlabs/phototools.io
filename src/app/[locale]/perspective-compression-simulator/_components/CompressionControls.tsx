'use client'

import { useTranslations } from 'next-intl'
import { FOCAL_LENGTHS, FOCAL_MIN, FOCAL_MAX } from '@/lib/data/focalLengths'
import { SENSORS, getSensor } from '@/lib/data/sensors'
import { calcEquivFocalLength } from '@/lib/math/fov'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { getSkeletonBySlug } from '@/lib/data/education'
import {
  type State, type Action,
  focalToSlider, sliderToFocal, distToSlider, sliderToDist,
  SLIDER_STEPS, SNAP_THRESHOLD, DIST_MIN, DIST_MAX, DIST_SLIDER_STEPS, DIST_PRESETS,
} from './compressionState'
import styles from './PerspectiveCompressionSimulator.module.css'

interface ControlsProps {
  state: State
  dispatch: React.Dispatch<Action>
}

export function CompressionControls({ state, dispatch }: ControlsProps) {
  const t = useTranslations('toolUI.perspective-compression-simulator')
  const sensorsT = useTranslations('common.sensors')
  const et = useTranslations('education.perspective-compression-simulator')
  const ctrlT = useTranslations('common.controls')
  const skel = getSkeletonBySlug('perspective-compression-simulator')
  const tooltips = skel
    ? Object.fromEntries(
        skel.tooltipKeys.map((key) => [key, { term: et(`tooltips.${key}.term`), definition: et(`tooltips.${key}.definition`) }])
      )
    : undefined

  const sensor = getSensor(state.sensorId)
  const isCrop = sensor.cropFactor > 1
  const minFocal = isCrop ? FOCAL_MIN : 14
  const equiv = calcEquivFocalLength(state.focalLength, sensor.cropFactor)

  const sliderMin = focalToSlider(Math.max(minFocal, 14))
  const sliderVal = focalToSlider(Math.max(state.focalLength, minFocal))

  const handleFocalSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = Number(e.target.value)
    let focal = sliderToFocal(pos)

    for (const fl of FOCAL_LENGTHS) {
      if (fl.value < minFocal) continue
      const presetPos = focalToSlider(fl.value)
      if (Math.abs(pos - presetPos) <= SNAP_THRESHOLD) {
        focal = fl.value
        break
      }
    }

    focal = Math.max(minFocal, Math.min(FOCAL_MAX, focal))
    dispatch({ type: 'SET_FOCAL_LENGTH', payload: focal })
  }

  const handleDistSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = Number(e.target.value)
    let dist = sliderToDist(pos)
    dist = Math.max(DIST_MIN, Math.min(DIST_MAX, dist))
    dispatch({ type: 'SET_DISTANCE', payload: dist })
  }

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.title}>{t('cameraSettings')}</div>

        <div className={styles.row}>
          <span className={styles.sublabel}>
            {t('focalLength')}
            {tooltips?.focalLength && <InfoTooltip tooltip={tooltips.focalLength} />}
          </span>
          <span className={styles.value}>{state.focalLength}mm</span>
        </div>

        {sensor.cropFactor !== 1 && (
          <div className={styles.row}>
            <span className={styles.sublabel}>{t('equivalent35mm')}</span>
            <span className={styles.value}>{equiv}mm</span>
          </div>
        )}

        <div className={styles.sliderWrap}>
          <input
            type="range"
            className={styles.slider}
            min={sliderMin}
            max={SLIDER_STEPS}
            step={1}
            value={sliderVal}
            onChange={handleFocalSlider}
            aria-label={ctrlT('focalLengthValue', { value: `${state.focalLength}mm` })}
          />
        </div>

        <div className={styles.presets}>
          {[24, 35, 50, 85, 135, 200, 400].filter(fl => fl >= minFocal).map((fl) => (
            <button
              key={fl}
              className={`${styles.preset} ${state.focalLength === fl ? styles.presetActive : ''}`}
              onClick={() => dispatch({ type: 'SET_FOCAL_LENGTH', payload: fl })}
            >
              {fl}mm
            </button>
          ))}
        </div>

        <div className={styles.row} style={{ marginTop: '16px' }}>
          <select
            className={styles.select}
            value={state.sensorId}
            aria-label={ctrlT('sensor')}
            onChange={(e) => {
              const newSensor = getSensor(e.target.value)
              const newMin = newSensor.cropFactor > 1 ? FOCAL_MIN : 14
              dispatch({ type: 'SET_SENSOR', payload: e.target.value })
              if (state.focalLength < newMin) {
                dispatch({ type: 'SET_FOCAL_LENGTH', payload: newMin })
              }
            }}
          >
            {SENSORS.map((s) => (
              <option key={s.id} value={s.id}>
                {sensorsT.has(s.id) ? sensorsT(s.id) : s.name} ({s.cropFactor}x)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.title}>{t('perspectiveDistance')}</div>

        <div className={styles.row}>
          <span className={styles.sublabel}>
            {t('subjectDistance')}
            {tooltips?.distance && <InfoTooltip tooltip={tooltips.distance} />}
          </span>
          <span className={styles.value}>{state.distance.toFixed(1)} ft</span>
        </div>

        <div className={styles.sliderWrap}>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={DIST_SLIDER_STEPS}
            step={1}
            value={distToSlider(state.distance)}
            onChange={handleDistSlider}
            aria-label={ctrlT('subjectDistanceValue', { value: `${state.distance.toFixed(1)} ft` })}
          />
        </div>

        <div className={styles.presets}>
          {DIST_PRESETS.map((d) => (
            <button
              key={d}
              className={`${styles.preset} ${Math.abs(state.distance - d) < 0.1 ? styles.presetActive : ''}`}
              onClick={() => dispatch({ type: 'SET_DISTANCE', payload: d })}
            >
              {d} ft
            </button>
          ))}
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            {t('maintainSubjectSize')}
            {tooltips?.maintainSize && <InfoTooltip tooltip={tooltips.maintainSize} />}
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={state.maintainSubjectSize}
              onChange={(e) => dispatch({ type: 'SET_MAINTAIN_SIZE', payload: e.target.checked })}
            />
            <span className={styles.slider_round}></span>
          </label>
        </div>
      </div>

      <button className={styles.resetBtn} onClick={() => dispatch({ type: 'RESET' })}>
        {t('resetAll')}
      </button>
    </>
  )
}
