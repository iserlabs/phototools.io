'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { ACCENT_MUTED, CALLOUT, INLINE_FIGURE } from './sectionStyles'

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

      {zooms.map((z) => (
        <figure key={z.lens} style={INLINE_FIGURE}>
          <h3>{z.lens}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={z.histogram} layout="vertical" accessibilityLayer margin={{ top: 4, right: 12, left: 32, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" />
              <YAxis dataKey="mm" type="category" tickFormatter={(v) => `${v}mm`} />
              <Tooltip />
              <Bar dataKey="count">
                {z.histogram.map((d, i) => (
                  <Cell key={i} fill={d.mm === z.topMm ? 'var(--accent)' : ACCENT_MUTED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={CALLOUT}>{t('callout', { lens: z.lens, pct: z.topMmPct.toFixed(0), mm: z.topMm })}</p>
          <figcaption className="sr-only">{t('caption', { n: zooms.length })}</figcaption>
        </figure>
      ))}
    </section>
  )
}
