'use client'

import { useTranslations } from 'next-intl'
import type { AnalysisFilter } from '@/lib/lrcat/types'

const DIMENSION_ORDER: Array<keyof AnalysisFilter> = [
  'dateRange', 'cameras', 'lenses', 'focalLengthRange',
  'apertureRange', 'isoRange', 'ratings', 'keywords', 'picks',
]

function isActive(filter: AnalysisFilter, key: keyof AnalysisFilter): boolean {
  const v = filter[key]
  if (v == null) return false
  if (Array.isArray(v)) return v.length > 0
  return true
}

function valueText(filter: AnalysisFilter, key: keyof AnalysisFilter): string {
  const v = filter[key]
  if (key === 'dateRange' && filter.dateRange) return `${filter.dateRange.start} – ${filter.dateRange.end}`
  if (key === 'focalLengthRange' && filter.focalLengthRange) return `${filter.focalLengthRange[0]}–${filter.focalLengthRange[1]}mm`
  if (key === 'apertureRange' && filter.apertureRange) return `f/${filter.apertureRange[0]} – f/${filter.apertureRange[1]}`
  if (key === 'isoRange' && filter.isoRange) return `${filter.isoRange[0]}–${filter.isoRange[1]}`
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

export function FilterContextBanner({ filter }: { filter: AnalysisFilter | undefined }) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.share.filterBanner')
  if (!filter) return null

  const active = DIMENSION_ORDER.filter((k) => isActive(filter, k))
  if (active.length === 0) return null

  const rows = active.map((k) => ({
    label: t(`dimensions.${k}`),
    value: valueText(filter, k),
  }))
  const collapsed = active.length > 3

  const list = (
    <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
      {rows.map((r) => (
        <li key={r.label}><strong>{r.label}:</strong> {r.value}</li>
      ))}
    </ul>
  )

  return (
    <aside
      role="note"
      style={{ background: 'color-mix(in srgb, var(--accent-secondary) 12%, transparent)', border: '1px solid var(--accent-secondary)', borderRadius: 10, padding: '12px 16px', margin: '16px 0' }}
    >
      <strong style={{ color: 'var(--accent-secondary)' }}>{t('title')}</strong>
      {collapsed ? (
        <details>
          <summary style={{ cursor: 'pointer' }}>{t('showAll')}</summary>
          {list}
        </details>
      ) : (
        list
      )}
    </aside>
  )
}
