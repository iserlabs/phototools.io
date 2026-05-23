'use client'

import { useTranslations } from 'next-intl'
import type { InsightBlob } from '@/lib/lrcat/types'
import { TABLE } from './sectionStyles'

interface Row {
  key: string
  label: string
  a: string
  b: string
  delta: string
}

function fmtNum(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString()
}

function deltaText(a: number | null | undefined, b: number | null | undefined): string {
  if (a == null || b == null) return '—'
  const d = b - a
  if (d === 0) return '0'
  return d > 0 ? `+${d.toLocaleString()}` : d.toLocaleString()
}

export function PeriodComparisonScorecard({
  blobA,
  blobB,
}: {
  blobA: InsightBlob
  blobB: InsightBlob
}) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.period-comparison')
  const rows: Row[] = [
    {
      key: 'totalPhotos',
      label: t('stats.totalPhotos'),
      a: fmtNum(blobA.overview.totalPhotos),
      b: fmtNum(blobB.overview.totalPhotos),
      delta: deltaText(blobA.overview.totalPhotos, blobB.overview.totalPhotos),
    },
    {
      key: 'daysShot',
      label: t('stats.daysShot'),
      a: fmtNum(blobA.overview.daysShot),
      b: fmtNum(blobB.overview.daysShot),
      delta: deltaText(blobA.overview.daysShot, blobB.overview.daysShot),
    },
    {
      key: 'topBody',
      label: t('stats.topBody'),
      a: blobA.overview.topBody ?? '—',
      b: blobB.overview.topBody ?? '—',
      delta: '—',
    },
    {
      key: 'topLens',
      label: t('stats.topLens'),
      a: blobA.overview.topLens ?? '—',
      b: blobB.overview.topLens ?? '—',
      delta: '—',
    },
    {
      key: 'topFocalLength',
      label: t('stats.topFocalLength'),
      a: blobA.overview.topFocalLengthMm != null ? `${blobA.overview.topFocalLengthMm}mm` : '—',
      b: blobB.overview.topFocalLengthMm != null ? `${blobB.overview.topFocalLengthMm}mm` : '—',
      delta: deltaText(blobA.overview.topFocalLengthMm, blobB.overview.topFocalLengthMm),
    },
  ]

  return (
    <table style={{ ...TABLE, marginTop: 12 }}>
      <thead>
        <tr>
          <th scope="col">{t('headers.stat')}</th>
          <th scope="col">{t('periodA')}</th>
          <th scope="col">{t('periodB')}</th>
          <th scope="col">{t('headers.delta')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td>{row.a}</td>
            <td>{row.b}</td>
            <td>{row.delta}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
