'use client'

import { useTranslations } from 'next-intl'
import type { YearInReviewBlock } from '@/lib/lrcat/types'
import { TILE, TILE_GRID, TILE_LABEL, TILE_VALUE } from './sectionStyles'

function fmt(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString()
}

export function YearInReviewStatTiles({ block }: { block: YearInReviewBlock }) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-in-review.tiles')
  const tiles = [
    { label: t('totalPhotos'), value: fmt(block.totalPhotos) },
    { label: t('daysShot'), value: fmt(block.daysShot) },
    { label: t('topBody'), value: block.topBody ?? '—' },
    { label: t('topLens'), value: block.topLens ?? '—' },
    { label: t('topFocalLength'), value: block.topFocalLengthMm != null ? `${block.topFocalLengthMm}mm` : '—' },
    { label: t('topAperture'), value: block.topApertureFNumber != null ? `f/${block.topApertureFNumber}` : '—' },
    { label: t('mostProlificMonth'), value: block.mostProlificMonth?.month ?? '—' },
    { label: t('avgShotsPerDay'), value: block.avgShotsPerDay.toFixed(1) },
  ]
  return (
    <dl style={TILE_GRID}>
      {tiles.map((tile) => (
        <div key={tile.label} style={TILE}>
          <dt style={TILE_LABEL}>{tile.label}</dt>
          <dd style={TILE_VALUE}>{tile.value}</dd>
        </div>
      ))}
    </dl>
  )
}
