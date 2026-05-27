'use client'

import { useTranslations } from 'next-intl'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { CALLOUT, COMPACT_LIST, DISCLAIMER, TILE, TILE_GRID, TILE_LABEL, TILE_VALUE, TOOLTIP_PROPS } from './sectionStyles'
import { PILL } from './sectionFormatters'

export function EditIntensity() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.edit-intensity')
  const { insightBlob } = useAnalyzer()
  if (!insightBlob) return null
  const e = insightBlob.editIntensity

  const tiles = [
    { label: t('tiles.avgExposure'), value: `${e.avgExposureShiftStops.toFixed(2)} EV` },
    { label: t('tiles.avgCrop'), value: `${e.avgCropPct.toFixed(1)}%` },
    { label: t('tiles.pctLocal'), value: `${e.pctWithLocalAdjustments.toFixed(0)}%` },
    { label: t('tiles.pctPresets'), value: `${e.pctWithPresets.toFixed(0)}%` },
  ]

  return (
    <section aria-labelledby="edit-intensity-heading">
      <h2 id="edit-intensity-heading">{t('title')}</h2>
      {e.sampled && <p style={{ ...CALLOUT, ...DISCLAIMER }}>{t('sampled', { n: e.sampleSize.toLocaleString() })}</p>}

      <dl style={TILE_GRID}>
        {tiles.map((tile) => (
          <div key={tile.label} style={TILE}>
            <dt style={TILE_LABEL}>{tile.label}</dt>
            <dd style={TILE_VALUE}>{tile.value}</dd>
          </div>
        ))}
      </dl>

      <figure>
        <h3>{t('scoreOverTime')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={e.scoreByMonth} accessibilityLayer margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip {...TOOLTIP_PROPS} />
            <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <figcaption className="sr-only">{t('caption')}</figcaption>
      </figure>

      <h3>{t('topPresets')}</h3>
      <ul style={COMPACT_LIST}>
        {e.topPresets.map((p) => (
          <li key={p.name}>
            <span>{p.name}</span> — {p.count.toLocaleString()}
          </li>
        ))}
      </ul>

      <h3>{t('perGear')}</h3>
      <ul style={COMPACT_LIST}>
        {e.perGearScores.map((g) => (
          <li key={g.gear} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={PILL}>{g.gear}</span> <span>{g.score.toFixed(0)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
