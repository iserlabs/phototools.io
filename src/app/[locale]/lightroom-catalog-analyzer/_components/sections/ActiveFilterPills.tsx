'use client'

import { useTranslations } from 'next-intl'
import { useAnalyzer } from '../analyzer/useAnalyzer'
import type { AnalysisFilter } from '@/lib/lrcat/types'
import styles from './ActiveFilterPills.module.css'

type FilterKey = keyof AnalysisFilter

interface Pill {
  key: FilterKey
  label: string
}

/** Date bounds are stored with a `THH:MM:SS` suffix; show the date only. */
function dateOnly(value: string): string {
  return value.slice(0, 10)
}

function dropKey(filter: AnalysisFilter, key: FilterKey): AnalysisFilter {
  const next: AnalysisFilter = { ...filter }
  delete next[key]
  return next
}

export function ActiveFilterPills() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.drilldown')
  const { filter, applyFilter } = useAnalyzer()
  if (!filter) return null

  const pills: Pill[] = []
  if (filter.dateRange) {
    pills.push({
      key: 'dateRange',
      label: t('filterDateRange', {
        start: dateOnly(filter.dateRange.start),
        end: dateOnly(filter.dateRange.end),
      }),
    })
  }
  if (filter.cameras?.length) {
    pills.push({ key: 'cameras', label: t('filterCameras', { names: filter.cameras.join(', ') }) })
  }
  if (filter.lenses?.length) {
    pills.push({ key: 'lenses', label: t('filterLenses', { names: filter.lenses.join(', ') }) })
  }
  if (filter.focalLengthRange) {
    pills.push({
      key: 'focalLengthRange',
      label: t('filterFocalLength', { min: filter.focalLengthRange[0], max: filter.focalLengthRange[1] }),
    })
  }
  if (filter.apertureRange) {
    pills.push({
      key: 'apertureRange',
      label: t('filterAperture', { min: filter.apertureRange[0], max: filter.apertureRange[1] }),
    })
  }
  if (filter.isoRange) {
    pills.push({
      key: 'isoRange',
      label: t('filterIso', { min: filter.isoRange[0], max: filter.isoRange[1] }),
    })
  }
  if (filter.ratings?.length) {
    pills.push({ key: 'ratings', label: t('filterRatings', { ratings: filter.ratings.join(', ') }) })
  }
  if (filter.picks) {
    pills.push({ key: 'picks', label: t('filterPicks', { state: filter.picks }) })
  }

  if (pills.length === 0) return null

  function handleRemove(key: FilterKey) {
    void applyFilter(dropKey(filter!, key))
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{t('activeFilters')}</span>
      <ul className={styles.list}>
        {pills.map((p) => (
          <li key={p.key} className={styles.pill}>
            <span>{p.label}</span>
            <button
              type="button"
              className={styles.removeButton}
              aria-label={t('removeFilter', { label: p.label })}
              onClick={() => handleRemove(p.key)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
