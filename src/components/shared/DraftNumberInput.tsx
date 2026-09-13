'use client'

import { useState } from 'react'

interface DraftNumberInputProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  className?: string
  'aria-label'?: string
}

/**
 * Controlled `<input type="number">` that tolerates out-of-range keystrokes.
 *
 * A plain controlled number input that ignores invalid values snaps the DOM
 * back to the last valid prop after every keystroke, so typing "0.26" from
 * "1" dies at the leading "0" (React restores "1" before the "." arrives).
 * Holding the raw text as a local draft while the field is focused lets the
 * user type through invalid intermediates; each valid in-range value is
 * committed live, and the draft is dropped on blur so the field resyncs to
 * whatever the slider or a preset set in the meantime.
 */
export function DraftNumberInput({ value, min, max, step, onChange, className, 'aria-label': ariaLabel }: DraftNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      type="number"
      className={className}
      min={min}
      max={max}
      step={step}
      value={draft ?? value}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        const v = Number(raw)
        if (raw !== '' && v >= min && v <= max) onChange(v)
      }}
      onBlur={() => setDraft(null)}
      aria-label={ariaLabel}
    />
  )
}
