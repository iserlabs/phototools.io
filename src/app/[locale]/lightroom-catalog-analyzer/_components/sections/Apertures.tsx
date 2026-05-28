'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { CALLOUT, INLINE_FIGURE, SECTION_HEADER, TOOLTIP_PROPS } from './sectionStyles'
import { snapAperture, fmtFStop } from './sectionFormatters'

function mergeBySnappedAperture(histogram: Array<{ aperture: number; count: number }>) {
  const merged = new Map<number, number>()
  for (const { aperture, count } of histogram) {
    const snapped = snapAperture(aperture)
    merged.set(snapped, (merged.get(snapped) ?? 0) + count)
  }
  return [...merged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([fStop, count]) => ({ fStop, count }))
}

export function Apertures() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.apertures')
  const { insightBlob } = useAnalyzer()
  const perLens = insightBlob?.apertures.perLens ?? []
  const [selectedIdx, setSelectedIdx] = useState(0)

  const processedLenses = useMemo(() =>
    perLens.map((lensRow) => {
      const histogram = mergeBySnappedAperture(lensRow.histogram)
      const peak = histogram.length > 0
        ? histogram.reduce((best, h) => h.count > best.count ? h : best, histogram[0]!)
        : null
      const totalShots = histogram.reduce((s, h) => s + h.count, 0)
      return { ...lensRow, histogram, peak, totalShots }
    }),
    [perLens],
  )

  if (processedLenses.length === 0) {
    return (
      <section aria-labelledby="apertures-heading">
        <h2 id="apertures-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    )
  }

  const lens = processedLenses[selectedIdx] ?? processedLenses[0]!
  const peakPct = lens.peak && lens.totalShots > 0
    ? Math.round((lens.peak.count / lens.totalShots) * 100)
    : 0

  return (
    <section aria-labelledby="apertures-heading">
      <header style={SECTION_HEADER}>
        <h2 id="apertures-heading">{t('title')}</h2>
        {processedLenses.length > 1 && (
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            aria-label={t('selectLens')}
          >
            {processedLenses.map((l, i) => (
              <option key={l.lens} value={i}>{l.lens}</option>
            ))}
          </select>
        )}
      </header>

      <figure style={INLINE_FIGURE}>
        <h3>{lens.lens} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>({t('shotCount', { count: lens.totalShots.toLocaleString() })})</span></h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={lens.histogram} accessibilityLayer margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="fStop" tickFormatter={(v) => fmtFStop(v)} />
            <YAxis tickFormatter={(v) => Math.round(v).toLocaleString()} />
            <Tooltip {...TOOLTIP_PROPS} labelFormatter={(v) => fmtFStop(Number(v))} />
            <Bar dataKey="count" fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
        {lens.peak && (
          <p style={CALLOUT}>
            {t('mostUsedCallout', { lens: lens.lens, aperture: fmtFStop(lens.peak.fStop), pct: String(peakPct) })}
          </p>
        )}
      </figure>
    </section>
  )
}
