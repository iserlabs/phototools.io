'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { CALLOUT, TILE, TILE_GRID, TILE_LABEL, TILE_VALUE } from './sectionStyles'

export function Bursts() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.bursts')
  const { insightBlob } = useAnalyzer()
  if (!insightBlob) return null
  const b = insightBlob.bursts

  const tiles = [
    { label: t('tiles.totalBursts'), value: b.totalBursts.toLocaleString() },
    { label: t('tiles.photosInBursts'), value: b.totalPhotosInBursts.toLocaleString() },
    { label: t('tiles.pctInBursts'), value: `${b.pctInBursts.toFixed(0)}%` },
    { label: t('tiles.longestBurst'), value: b.longestBurst.toString() },
  ]

  const delta = Math.abs(b.keeperRatePct - b.singleShotKeeperRatePct)
  const direction = b.keeperRatePct >= b.singleShotKeeperRatePct ? t('moreOften') : t('lessOften')

  return (
    <section aria-labelledby="bursts-heading">
      <h2 id="bursts-heading">{t('title')}</h2>

      <dl style={TILE_GRID}>
        {tiles.map((tile) => (
          <div key={tile.label} style={TILE}>
            <dt style={TILE_LABEL}>{tile.label}</dt>
            <dd style={TILE_VALUE}>{tile.value}</dd>
          </div>
        ))}
      </dl>

      <figure>
        <h3>{t('lengthHistogram')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={b.lengthHistogram} accessibilityLayer margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="length" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
        <figcaption className="sr-only">
          {t('caption', {
            burstRate: b.keeperRatePct.toFixed(0),
            singleRate: b.singleShotKeeperRatePct.toFixed(0),
          })}
        </figcaption>
      </figure>

      <p style={CALLOUT}>
        {t('keeperRate', {
          burstRate: b.keeperRatePct.toFixed(0),
          singleRate: b.singleShotKeeperRatePct.toFixed(0),
          delta: delta.toFixed(0),
          direction,
        })}
      </p>
    </section>
  )
}
