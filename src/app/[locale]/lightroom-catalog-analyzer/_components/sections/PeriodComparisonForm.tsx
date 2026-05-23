'use client'

import { useTranslations } from 'next-intl'

export interface DateRange {
  start: string
  end: string
}

export function PeriodComparisonForm({
  label,
  range,
  onChange,
  onApply,
  disabled,
}: {
  label: string
  range: DateRange
  onChange: (r: DateRange) => void
  onApply: () => void
  disabled: boolean
}) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.period-comparison')
  return (
    <fieldset style={{ border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
      <legend>{label}</legend>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <span>{t('start')}</span>
        <input type="date" value={range.start} onChange={(e) => onChange({ ...range, start: e.target.value })} />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <span>{t('end')}</span>
        <input type="date" value={range.end} onChange={(e) => onChange({ ...range, end: e.target.value })} />
      </label>
      <button type="button" onClick={onApply} disabled={disabled}>
        {t('apply')}
      </button>
    </fieldset>
  )
}
