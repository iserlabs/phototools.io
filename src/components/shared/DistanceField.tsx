'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import controlStyles from './ControlPanel.module.css'
import styles from './DistanceField.module.css'

const SLIDER_STEPS = 1000
const DEFAULT_MIN = 0.1 // meters
const DEFAULT_MAX = 100 // meters

/** Format a distance in meters for display */
export function formatDistance(meters: number): string {
  if (!isFinite(meters)) return '\u221E' // infinity symbol
  if (meters >= 1) return `${meters.toFixed(2)} m`
  return `${Math.round(meters * 100)} cm`
}

function distanceToSlider(d: number, logMin: number, logMax: number): number {
  const clamped = Math.max(Math.exp(logMin), Math.min(Math.exp(logMax), d))
  return Math.round(((Math.log(clamped) - logMin) / (logMax - logMin)) * SLIDER_STEPS)
}

function sliderToDistance(pos: number, logMin: number, logMax: number): number {
  return Math.exp(logMin + (pos / SLIDER_STEPS) * (logMax - logMin))
}

interface DistanceFieldProps {
  value: number // meters
  onChange: (meters: number) => void
  min?: number // meters
  max?: number // meters
  label?: string
}

export function DistanceField({
  value,
  onChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  label,
}: DistanceFieldProps) {
  const t = useTranslations('common.controls')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const logMin = Math.log(min)
  const logMax = Math.log(max)

  const sliderVal = distanceToSlider(Math.max(value, min), logMin, logMax)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commitEdit() {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed)
    }
    setEditing(false)
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const pos = Number(e.target.value)
    const raw = sliderToDistance(pos, logMin, logMax)
    // Round to reasonable precision based on magnitude
    const rounded = raw >= 10
      ? Math.round(raw * 10) / 10
      : raw >= 1
        ? Math.round(raw * 100) / 100
        : Math.round(raw * 1000) / 1000
    onChange(Math.max(min, Math.min(max, rounded)))
  }

  const displayLabel = label ?? t('distance')

  return (
    <div>
      <div className={controlStyles.fieldRow}>
        <span className={controlStyles.fieldLabel}>{displayLabel}</span>
        {editing ? (
          <input
            ref={inputRef}
            className={controlStyles.editableInput}
            type="number"
            inputMode="decimal"
            enterKeyHint="done"
            value={draft}
            min={min}
            max={max}
            step={0.01}
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
            {formatDistance(value)}
          </button>
        )}
      </div>
      <div className={styles.sliderWrap}>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={sliderVal}
          onChange={handleSlider}
          aria-label={`${displayLabel}: ${formatDistance(value)}`}
        />
      </div>
    </div>
  )
}
