'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { ACCENT_MUTED, CALLOUT, INLINE_FIGURE, TOOLTIP_PROPS } from './sectionStyles'
import { bucketFocalLengths } from './focalLengthBuckets'

export function FocalLengthPerZoom() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.focal-length-per-zoom')
  const { insightBlob } = useAnalyzer()
  const zooms = insightBlob?.focalLengthPerZoom.zooms ?? []

  if (zooms.length === 0) {
    return (
      <section aria-labelledby="flpz-heading">
        <h2 id="flpz-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="flpz-heading">
      <h2 id="flpz-heading">{t('title')}</h2>

      {zooms.map((z) => {
        // Collapse the dense 1mm histogram into a handful of focal-length ranges
        // so the per-zoom chart is readable instead of a hairline forest.
        const buckets = bucketFocalLengths(z.histogram, 8, z.topMm)
        return (
          <figure key={z.lens} style={INLINE_FIGURE}>
            <h3>{z.lens}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={buckets} layout="vertical" accessibilityLayer margin={{ top: 4, right: 12, left: 48, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" />
                <YAxis dataKey="label" type="category" width={76} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="count">
                  {buckets.map((b) => (
                    <Cell key={b.start} fill={b.highlight ? 'var(--accent)' : ACCENT_MUTED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p style={CALLOUT}>{t('callout', { lens: z.lens, pct: z.topMmPct.toFixed(0), mm: z.topMm })}</p>
            <figcaption className="sr-only">{t('caption', { n: zooms.length })}</figcaption>
          </figure>
        )
      })}
    </section>
  )
}
