'use client'

import { useTranslations } from 'next-intl'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { TILE, TILE_GRID, TILE_LABEL, TILE_VALUE } from './sectionStyles'

function fmt(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString()
}

export function Overview() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.overview')
  const { insightBlob } = useAnalyzer()
  if (!insightBlob) return null
  const o = insightBlob.overview

  const tiles = [
    { label: t('tiles.totalPhotos'), value: fmt(o.totalPhotos) },
    { label: t('tiles.dateRange'), value: `${o.dateRange.first} – ${o.dateRange.last}` },
    { label: t('tiles.daysShot'), value: fmt(o.daysShot) },
    { label: t('tiles.photosPerDay'), value: o.photosPerDay.toFixed(1) },
    { label: t('tiles.bodyCount'), value: fmt(o.bodyCount) },
    { label: t('tiles.lensCount'), value: fmt(o.lensCount) },
    { label: t('tiles.topBody'), value: o.topBody ?? '—' },
    { label: t('tiles.topLens'), value: o.topLens ?? '—' },
    { label: t('tiles.topFocalLength'), value: o.topFocalLengthMm != null ? `${o.topFocalLengthMm}mm` : '—' },
  ]

  return (
    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading">{t('title')}</h2>
      <figure>
        <dl style={{ ...TILE_GRID, margin: 0 }}>
          {tiles.map((tile) => (
            <div key={tile.label} style={TILE}>
              <dt style={TILE_LABEL}>{tile.label}</dt>
              <dd style={TILE_VALUE}>{tile.value}</dd>
            </div>
          ))}
        </dl>
        <figcaption className="sr-only">
          {t('caption', {
            totalPhotos: o.totalPhotos.toLocaleString(),
            daysShot: o.daysShot,
            bodyCount: o.bodyCount,
            lensCount: o.lensCount,
          })}
        </figcaption>
      </figure>
    </section>
  )
}
