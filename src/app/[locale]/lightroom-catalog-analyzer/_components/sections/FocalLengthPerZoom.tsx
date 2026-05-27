'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { CALLOUT, INLINE_FIGURE, SECTION_HEADER, TOOLTIP_PROPS } from './sectionStyles'
import { bucketFocalLengths } from './focalLengthBuckets'

export function FocalLengthPerZoom() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.focal-length-per-zoom')
  const { insightBlob } = useAnalyzer()
  const zooms = insightBlob?.focalLengthPerZoom.zooms ?? []
  const [selectedIdx, setSelectedIdx] = useState(0)

  if (zooms.length === 0) {
    return (
      <section aria-labelledby="flpz-heading">
        <h2 id="flpz-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    )
  }

  const z = zooms[selectedIdx] ?? zooms[0]!
  const buckets = bucketFocalLengths(z.histogram, 10, z.topMm)
  const totalShots = z.histogram.reduce((s, h) => s + h.count, 0)

  return (
    <section aria-labelledby="flpz-heading">
      <header style={SECTION_HEADER}>
        <h2 id="flpz-heading">{t('title')}</h2>
        {zooms.length > 1 && (
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            aria-label="Select zoom lens"
          >
            {zooms.map((zoom, i) => (
              <option key={zoom.lens} value={i}>{zoom.lens}</option>
            ))}
          </select>
        )}
      </header>

      <figure style={INLINE_FIGURE}>
        <h3>{z.lens} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>({totalShots.toLocaleString()} shots)</span></h3>
        <ResponsiveContainer width="100%" height={Math.max(200, buckets.length * 32)}>
          <BarChart data={buckets} layout="vertical" accessibilityLayer margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" />
            <YAxis dataKey="label" type="category" width={100} tick={{ fontSize: 12 }} interval={0} />
            <Tooltip {...TOOLTIP_PROPS} />
            <Bar dataKey="count" fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
        <p style={CALLOUT}>{t('callout', { lens: z.lens, pct: z.topMmPct.toFixed(0), mm: z.topMm })}</p>
        <figcaption className="sr-only">{t('caption', { n: zooms.length })}</figcaption>
      </figure>
    </section>
  )
}
