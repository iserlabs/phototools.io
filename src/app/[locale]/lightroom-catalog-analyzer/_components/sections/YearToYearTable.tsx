'use client'

import { useTranslations } from 'next-intl'
import type { YearToYearBlock } from '@/lib/lrcat/types'
import { TABLE } from './sectionStyles'

function fmtDelta(d: number | null): string {
  if (d == null) return '—'
  if (d === 0) return '0'
  return d > 0 ? `+${d.toLocaleString()}` : d.toLocaleString()
}

export function YearToYearTable({
  years,
  rows,
}: {
  years: number[]
  rows: YearToYearBlock['rows']
}) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-to-year')
  return (
    <table style={TABLE}>
      <thead>
        <tr>
          <th scope="col">{t('stat')}</th>
          {years.map((y) => (
            <th key={y} scope="col">
              {y}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.statKey}>
            <th scope="row">{row.label}</th>
            {row.values.map((v, i) => (
              <td key={`${row.statKey}-${i}`} style={{ padding: '6px 8px' }}>
                <span>{typeof v === 'number' ? v.toLocaleString() : v}</span>
                {row.deltas[i] != null && (
                  <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                    ({fmtDelta(row.deltas[i])})
                  </span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
