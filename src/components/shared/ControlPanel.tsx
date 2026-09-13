import { type ReactNode } from 'react'
import { DraftNumberInput } from './DraftNumberInput'
import { useTranslations } from 'next-intl'
import styles from './ControlPanel.module.css'

export { styles as controlPanelStyles }
export { FocalLengthField } from './FocalLengthField'
export { ApertureField } from './ApertureField'
export { DistanceField, formatDistance } from './DistanceField'

/* ── Panel container ── */

interface ControlPanelProps {
  children: ReactNode
  title?: string
  subtitle?: string
  color?: string
  active?: boolean
  border?: boolean
  onAction?: () => void
  actionLabel?: string
  onClick?: () => void
  className?: string
}

export function ControlPanel({
  children, title, subtitle, color, active, border, onAction, actionLabel, onClick, className,
}: ControlPanelProps) {
  const panelClass = [
    styles.panel,
    border ? styles.panelBorder : '',
    active ? styles.panelActive : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={panelClass}
      style={color ? { '--panel-color': color } as React.CSSProperties : undefined}
      onClick={onClick}
    >
      {(title || onAction) && (
        <div className={styles.header}>
          {title && <span className={styles.title}>{title}</span>}
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {onAction && (
            <button
              className={styles.headerAction}
              onClick={(e) => { e.stopPropagation(); onAction() }}
              aria-label={actionLabel}
            >
              {actionLabel ?? '✕'}
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

/* ── Generic field row ── */

interface FieldRowProps {
  label: string
  description?: string
  value?: string | number
  children?: ReactNode
}

export function FieldRow({ label, description, value, children }: FieldRowProps) {
  return (
    <div>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{label}</span>
        {value !== undefined && <span className={styles.fieldValue}>{value}</span>}
        {children}
      </div>
      {description && <div className={styles.fieldDesc}>{description}</div>}
    </div>
  )
}

/* ── Number stepper (input with +/- buttons) ── */

interface NumberStepperProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}

export function NumberStepper({ value, min = 0, max = 9999, step = 1, onChange }: NumberStepperProps) {
  const t = useTranslations('common.controls')
  function clamp(v: number) {
    return Math.max(min, Math.min(max, v))
  }

  return (
    <div className={styles.stepper}>
      <button
        className={styles.stepperBtn}
        onClick={(e) => { e.stopPropagation(); onChange(clamp(value - step)) }}
        disabled={value <= min}
        aria-label={t('decrease')}
      >
        −
      </button>
      <DraftNumberInput
        className={styles.stepperInput}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
      <button
        className={styles.stepperBtn}
        onClick={(e) => { e.stopPropagation(); onChange(clamp(value + step)) }}
        disabled={value >= max}
        aria-label={t('increase')}
      >
        +
      </button>
    </div>
  )
}

/* ── Slider field (generic, linear) ── */

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}

export function SliderField({ label, value, min, max, step = 1, unit = '', onChange }: SliderFieldProps) {
  return (
    <div>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>{value}{unit}</span>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label}: ${value}${unit}`}
      />
    </div>
  )
}
