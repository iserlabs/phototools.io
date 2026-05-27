'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { COMPACT_LIST, DISCLAIMER, SECTION_HEADER, TOOLTIP_PROPS } from './sectionStyles'
import { PILL } from './sectionFormatters'

export function TimeOfDay() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.time-of-day')
  const { insightBlob } = useAnalyzer()
  const [mode, setMode] = useState<'clock' | 'sun'>('clock')
  if (!insightBlob) return null
  const block = insightBlob.timeOfDay

  const sunData = [
    { name: t('buckets.goldenHour'), value: block.bySunAngle.goldenHour, fill: '#f5a623' },
    { name: t('buckets.blueHour'), value: block.bySunAngle.blueHour, fill: '#5b9bff' },
    { name: t('buckets.midday'), value: block.bySunAngle.midday, fill: '#7ed957' },
    { name: t('buckets.night'), value: block.bySunAngle.night, fill: '#666' },
  ]

  return (
    <section aria-labelledby="tod-heading">
      <header style={SECTION_HEADER}>
        <h2 id="tod-heading">{t('title')}</h2>
        <fieldset aria-label={t('title')} style={{ border: 'none', padding: 0, display: 'inline-flex', gap: 12 }}>
          <label>
            <input type="radio" name="tod-mode" checked={mode === 'clock'} onChange={() => setMode('clock')} /> {t('modes.clock')}
          </label>
          <label>
            <input type="radio" name="tod-mode" checked={mode === 'sun'} onChange={() => setMode('sun')} /> {t('modes.sun')}
          </label>
        </fieldset>
      </header>

      {mode === 'clock' ? (
        <figure>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="20%"
              outerRadius="90%"
              data={block.byClockHour.map((d) => ({ ...d, fill: 'var(--accent)' }))}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar background dataKey="count" />
              <Tooltip {...TOOLTIP_PROPS} />
            </RadialBarChart>
          </ResponsiveContainer>
          <figcaption className="sr-only">{t('caption')}</figcaption>

          {block.perGearByClockHour.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h3>{t('perGear')}</h3>
              <ul style={COMPACT_LIST}>
                {block.perGearByClockHour.map((row) => {
                  const peak = row.histogram.reduce((m, h) => (h.count > m.count ? h : m), row.histogram[0]!)
                  return <li key={row.gear} style={{ marginBottom: 4 }}><span style={PILL}>{row.gear}</span> {t('perGearPeak', { gear: '', hour: peak.hour })}</li>
                })}
              </ul>
            </div>
          )}
        </figure>
      ) : (
        <figure>
          <p style={DISCLAIMER}>
            {t('gpsNote', { pct: insightBlob.gps.pctWithGps.toFixed(0) })}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sunData} accessibilityLayer margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
          <ul className="sr-only">
            {sunData.map((slot) => (
              <li key={slot.name}>
                {slot.name} — {slot.value.toLocaleString()}
              </li>
            ))}
          </ul>
          <figcaption className="sr-only">{t('caption')}</figcaption>
        </figure>
      )}
    </section>
  )
}
