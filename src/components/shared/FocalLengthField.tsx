'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { FOCAL_LENGTHS, FOCAL_MIN, FOCAL_MAX } from '@/lib/data/focalLengths'
import styles from './ControlPanel.module.css'

const LOG_MIN = Math.log(FOCAL_MIN)
const LOG_MAX = Math.log(FOCAL_MAX)
const SLIDER_STEPS = 1000
const SNAP_THRESHOLD = 15

function focalToSlider(focal: number): number {
  return Math.round(((Math.log(focal) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * SLIDER_STEPS)
}

function sliderToFocal(pos: number): number {
  return Math.round(Math.exp(LOG_MIN + (pos / SLIDER_STEPS) * (LOG_MAX - LOG_MIN)))
}

interface FocalLengthFieldProps {
  value: number
  onChange: (focal: number) => void
  color?: string
  minFocal?: number
}

export function FocalLengthField({ value, onChange, color, minFocal = FOCAL_MIN }: FocalLengthFieldProps) {
  const t = useTranslations('common.controls')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const sliderMin = focalToSlider(minFocal)
  const sliderVal = focalToSlider(Math.max(value, minFocal))

  const filteredPresets = useMemo(
    () => FOCAL_LENGTHS.filter((fl) => fl.value >= minFocal),
    [minFocal],
  )

  const tickPositions = useMemo(
    () => filteredPresets.map((fl) => ({
      value: fl.value,
      pct: ((focalToSlider(fl.value) - sliderMin) / (SLIDER_STEPS - sliderMin)) * 100,
    })),
    [filteredPresets, sliderMin],
  )

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commitEdit() {
    const parsed = parseInt(draft, 10)
    if (!isNaN(parsed) && parsed >= minFocal && parsed <= FOCAL_MAX) {
      onChange(parsed)
    }
    setEditing(false)
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const pos = Number(e.target.value)
    let focal = sliderToFocal(pos)

    for (const fl of filteredPresets) {
      if (Math.abs(pos - focalToSlider(fl.value)) <= SNAP_THRESHOLD) {
        focal = fl.value
        break
      }
    }

    onChange(Math.max(minFocal, Math.min(FOCAL_MAX, focal)))
  }

  return (
    <div>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{t('focalLength')}</span>
        {editing ? (
          <input
            ref={inputRef}
            className={styles.editableInput}
            type="number"
            value={draft}
            min={minFocal}
            max={FOCAL_MAX}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <button
            className={styles.editableValue}
            onClick={(e) => { e.stopPropagation(); setDraft(String(value)); setEditing(true) }}
            title={t('clickToEnterValue')}
          >
            {value}mm
          </button>
        )}
      </div>
      <div className={styles.sliderWrap}>
        <input
          type="range"
          className={styles.slider}
          min={sliderMin}
          max={SLIDER_STEPS}
          step={1}
          value={sliderVal}
          onChange={handleSlider}
          style={color ? { accentColor: color } : undefined}
          aria-label={t('focalLengthValue', { value: `${value}mm` })}
        />
        <div className={styles.ticks}>
          {tickPositions.map((p) => (
            <div key={p.value} className={styles.tick} style={{ left: `${p.pct}%` }} />
          ))}
        </div>
      </div>
      <div className={styles.presets}>
        {filteredPresets.map((fl) => (
          <button
            key={fl.value}
            className={`${styles.preset} ${value === fl.value ? styles.presetActive : ''}`}
            style={value === fl.value && color ? { background: color, color: '#fff' } : undefined}
            onClick={(e) => { e.stopPropagation(); onChange(fl.value) }}
          >
            {fl.value}mm
          </button>
        ))}
      </div>
    </div>
  )
}
