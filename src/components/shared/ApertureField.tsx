'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { APERTURES_THIRD_STOP, APERTURES_FULL_STOP } from '@/lib/data/camera'
import controlStyles from './ControlPanel.module.css'
import styles from './ApertureField.module.css'

const SLIDER_STEPS = 1000
const SNAP_THRESHOLD = 0.02 // fraction of slider range

const AP_MIN = APERTURES_THIRD_STOP[0]
const AP_MAX = APERTURES_THIRD_STOP[APERTURES_THIRD_STOP.length - 1]
const LOG_MIN = Math.log(AP_MIN)
const LOG_MAX = Math.log(AP_MAX)

function apertureToSlider(f: number): number {
  const clamped = Math.max(AP_MIN, Math.min(AP_MAX, f))
  return Math.round(((Math.log(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * SLIDER_STEPS)
}

function sliderToAperture(pos: number): number {
  return Math.exp(LOG_MIN + (pos / SLIDER_STEPS) * (LOG_MAX - LOG_MIN))
}

function snapToThirdStop(raw: number): number {
  let best = APERTURES_THIRD_STOP[0]
  let bestDist = Infinity
  for (const ap of APERTURES_THIRD_STOP) {
    const dist = Math.abs(Math.log(ap) - Math.log(raw))
    if (dist < bestDist) {
      bestDist = dist
      best = ap
    }
  }
  return best
}

interface ApertureFieldProps {
  value: number
  onChange: (aperture: number) => void
  sweetSpot?: number | null
  min?: number
  max?: number
}

export function ApertureField({
  value,
  onChange,
  sweetSpot,
  min = AP_MIN,
  max = AP_MAX,
}: ApertureFieldProps) {
  const t = useTranslations('common.controls')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const logMin = Math.log(min)
  const logMax = Math.log(max)

  const sliderMin = apertureToSlider(min)
  const sliderMax = apertureToSlider(max)
  const sliderVal = apertureToSlider(Math.max(value, min))

  const thirdStops = useMemo(
    () => APERTURES_THIRD_STOP.filter((ap) => ap >= min && ap <= max),
    [min, max],
  )

  const fullStopTicks = useMemo(
    () => APERTURES_FULL_STOP
      .filter((ap) => ap >= min && ap <= max)
      .map((ap) => ({
        value: ap,
        pct: ((Math.log(ap) - logMin) / (logMax - logMin)) * 100,
      })),
    [min, max, logMin, logMax],
  )

  const sweetSpotPct = useMemo(() => {
    if (sweetSpot == null || sweetSpot < min || sweetSpot > max) return null
    return ((Math.log(sweetSpot) - logMin) / (logMax - logMin)) * 100
  }, [sweetSpot, min, max, logMin, logMax])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commitEdit() {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(snapToThirdStop(parsed))
    }
    setEditing(false)
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const pos = Number(e.target.value)
    const raw = sliderToAperture(pos)

    // Snap to nearest 1/3-stop if within threshold
    const fraction = pos / SLIDER_STEPS
    for (const ap of thirdStops) {
      const apFraction = apertureToSlider(ap) / SLIDER_STEPS
      if (Math.abs(fraction - apFraction) <= SNAP_THRESHOLD) {
        onChange(ap)
        return
      }
    }

    onChange(snapToThirdStop(raw))
  }

  function formatAperture(f: number): string {
    return f % 1 === 0 ? `f/${f}` : `f/${f.toFixed(1)}`
  }

  return (
    <div>
      <div className={controlStyles.fieldRow}>
        <span className={controlStyles.fieldLabel}>{t('aperture')}</span>
        {editing ? (
          <input
            ref={inputRef}
            className={controlStyles.editableInput}
            type="number"
            value={draft}
            min={min}
            max={max}
            step={0.1}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <button
            className={controlStyles.editableValue}
            onClick={(e) => {
              e.stopPropagation()
              setDraft(String(value))
              setEditing(true)
            }}
            title={t('clickToEnterValue')}
          >
            {formatAperture(value)}
          </button>
        )}
      </div>
      <div className={styles.sliderWrap}>
        <input
          type="range"
          className={styles.slider}
          min={sliderMin}
          max={sliderMax}
          step={1}
          value={sliderVal}
          onChange={handleSlider}
          aria-label={t('apertureValue', { value: formatAperture(value) })}
        />
        {sweetSpotPct != null && (
          <div
            className={styles.sweetSpot}
            style={{ left: `${sweetSpotPct}%` }}
            title={t('sweetSpotValue', { value: formatAperture(sweetSpot!) })}
          />
        )}
      </div>
      <div className={styles.tickLabels}>
        {fullStopTicks.map((tick) => (
          <button
            key={tick.value}
            className={`${styles.tickLabel} ${value === tick.value ? styles.tickLabelActive : ''}`}
            style={{ left: `${tick.pct}%` }}
            onClick={(e) => {
              e.stopPropagation()
              onChange(tick.value)
            }}
          >
            {tick.value}
          </button>
        ))}
      </div>
    </div>
  )
}
