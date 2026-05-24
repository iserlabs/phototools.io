'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { CALLOUT, INLINE_FIGURE, TOOLTIP_PROPS } from './sectionStyles'

export function Apertures() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.apertures')
  const { insightBlob } = useAnalyzer()
  const perLens = insightBlob?.apertures.perLens ?? []

  if (perLens.length === 0) {
    return (
      <section aria-labelledby="apertures-heading">
        <h2 id="apertures-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="apertures-heading">
      <h2 id="apertures-heading">{t('title')}</h2>

      {perLens.map((lensRow) => (
        <figure key={lensRow.lens} style={INLINE_FIGURE}>
          <h3>{lensRow.lens}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={lensRow.histogram} accessibilityLayer margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="aperture" tickFormatter={(v) => `f/${v}`} />
              <YAxis />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="count" fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
          <p style={CALLOUT}>{t('callout', { lens: lensRow.lens, pct: lensRow.wideOpenPct.toFixed(0) })}</p>
          <figcaption className="sr-only">{t('caption', { n: perLens.length })}</figcaption>
        </figure>
      ))}
    </section>
  )
}
