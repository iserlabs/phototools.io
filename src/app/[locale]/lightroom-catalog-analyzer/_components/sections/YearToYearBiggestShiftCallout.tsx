'use client'

import { useTranslations } from 'next-intl'
import type { YearToYearBlock } from '@/lib/lrcat/types'
import { CALLOUT } from './sectionStyles'

export function YearToYearBiggestShiftCallout({
  shift,
  label,
}: {
  shift: YearToYearBlock['biggestShift']
  /** Human-readable stat label (from the matching row); falls back to the key. */
  label?: string
}) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-to-year')
  if (!shift) return null
  return (
    <p style={{ ...CALLOUT, margin: '0 0 12px' }}>
      {t('biggestShift', { label: label ?? shift.statKey, year: shift.year, delta: shift.deltaText })}
    </p>
  )
}
