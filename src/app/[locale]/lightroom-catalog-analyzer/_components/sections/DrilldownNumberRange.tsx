'use client'

import styles from './DrilldownForm.module.css'

interface NumberRangeFieldProps {
  label: string
  minAriaLabel: string
  maxAriaLabel: string
  min: number
  max: number
  step?: number
  minValue: string
  maxValue: string
  onMin: (value: string) => void
  onMax: (value: string) => void
}

/** A labelled min/max numeric range row (focal length, aperture, ISO). */
export function NumberRangeField({
  label, minAriaLabel, maxAriaLabel, min, max, step, minValue, maxValue, onMin, onMax,
}: NumberRangeFieldProps) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.rangeRow}>
        <input
          aria-label={minAriaLabel}
          className={styles.input}
          type="number"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={(e) => onMin(e.target.value)}
        />
        <input
          aria-label={maxAriaLabel}
          className={styles.input}
          type="number"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={(e) => onMax(e.target.value)}
        />
      </div>
    </div>
  )
}
