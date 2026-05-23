'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { TILE, TILE_GRID, TILE_LABEL, TILE_VALUE } from './sectionStyles'

export function Keywords() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.keywords')
  const { insightBlob } = useAnalyzer()
  if (!insightBlob) return null
  const k = insightBlob.keywords

  const tiles = [
    { label: t('tiles.tagged'), value: k.totalTaggedPhotos.toLocaleString() },
    { label: t('tiles.untagged'), value: k.totalUntaggedPhotos.toLocaleString() },
    { label: t('tiles.uniqueKeywords'), value: k.uniqueKeywordCount.toLocaleString() },
    { label: t('tiles.avgPerPhoto'), value: k.avgKeywordsPerTaggedPhoto.toFixed(1) },
    { label: t('tiles.orphans'), value: k.orphanKeywordCount.toLocaleString() },
  ]

  return (
    <section aria-labelledby="keywords-heading">
      <h2 id="keywords-heading">{t('title')}</h2>

      <dl style={TILE_GRID}>
        {tiles.map((tile) => (
          <div key={tile.label} style={TILE}>
            <dt style={TILE_LABEL}>{tile.label}</dt>
            <dd style={TILE_VALUE}>{tile.value}</dd>
          </div>
        ))}
      </dl>

      <figure>
        <h3>{t('topKeywords')}</h3>
        <ResponsiveContainer width="100%" height={Math.min(360, 28 * k.topKeywords.length + 40)}>
          <BarChart data={k.topKeywords} layout="vertical" accessibilityLayer margin={{ top: 4, right: 12, left: 80, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" />
            <YAxis dataKey="keyword" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
        <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
          {k.topKeywords.map((kw) => (
            <li key={kw.keyword}>
              <span>{kw.keyword}</span> — {kw.count.toLocaleString()}
            </li>
          ))}
        </ul>
        <figcaption className="sr-only">{t('caption', { n: k.topKeywords.length })}</figcaption>
      </figure>

      <h3>{t('blindSpots')}</h3>
      {k.blindSpots.length === 0 ? (
        <p>{t('blindSpotsEmpty')}</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {k.blindSpots.map((b) => (
            <li key={b.yearMonth}>{t('blindSpotItem', { yearMonth: b.yearMonth, pct: b.coveragePct.toFixed(0) })}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
