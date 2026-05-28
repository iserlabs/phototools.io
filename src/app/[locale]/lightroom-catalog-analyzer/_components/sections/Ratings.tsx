'use client'

import { useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { TABLE, TOOLTIP_PROPS } from './sectionStyles'
import { PILL } from './sectionFormatters'

const KNOWN_LABEL_COLORS: Record<string, string> = {
  Red: '#e64a3b',
  Yellow: '#f5d423',
  Green: '#7ed957',
  Blue: '#5b9bff',
  Purple: '#a06bff',
}

const RATING_COLORS = ['#666', '#888', '#aaa', '#b8c97e', '#7ed957', '#5b9bff', '#a06bff']

export function Ratings() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.ratings')
  const { insightBlob } = useAnalyzer()
  if (!insightBlob) return null
  const r = insightBlob.ratings
  const data = [
    { rating: 'rej', count: r.distribution.rejected },
    { rating: '0', count: r.distribution.r0 },
    { rating: '1', count: r.distribution.r1 },
    { rating: '2', count: r.distribution.r2 },
    { rating: '3', count: r.distribution.r3 },
    { rating: '4', count: r.distribution.r4 },
    { rating: '5', count: r.distribution.r5 },
  ]

  return (
    <section aria-labelledby="ratings-heading">
      <h2 id="ratings-heading">{t('title')}</h2>

      <figure>
        <h3>{t('distribution')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} accessibilityLayer margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="rating" />
            <YAxis />
            <Tooltip {...TOOLTIP_PROPS} />
            <Bar dataKey="count">
              {data.map((_, i) => (
                <Cell key={i} fill={RATING_COLORS[i] ?? '#888'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <figcaption className="sr-only">{t('caption', { colorLabelCount: r.colorLabels.length })}</figcaption>
      </figure>

      <h3>{t('colorLabels')}</h3>
      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, listStyle: 'none', padding: 0 }}>
        {r.colorLabels.map((cl) => (
          <li key={cl.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: KNOWN_LABEL_COLORS[cl.label] ?? '#888',
                display: 'inline-block',
              }}
              aria-hidden="true"
            />
            <span>
              <span>{cl.label}</span> — {cl.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      <h3>{t('perGear')}</h3>
      <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '12px 0 4px' }}>{t('cameras')}</h4>
      <table style={TABLE}>
        <thead>
          <tr>
            <th scope="col">{t('tableHeaders.name')}</th>
            <th scope="col">{t('tableHeaders.total')}</th>
            <th scope="col">{t('tableHeaders.rated4Plus')}</th>
            <th scope="col">{t('tableHeaders.pickRate')}</th>
          </tr>
        </thead>
        <tbody>
          {r.pickRateByBody.map((row) => (
            <tr key={`b-${row.body}`}>
              <td><span style={PILL}>{row.body}</span></td>
              <td>{row.total.toLocaleString()}</td>
              <td>{row.rated4Plus.toLocaleString()}</td>
              <td>{row.pickRatePct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '16px 0 4px' }}>{t('lenses')}</h4>
      <table style={TABLE}>
        <thead>
          <tr>
            <th scope="col">{t('tableHeaders.name')}</th>
            <th scope="col">{t('tableHeaders.total')}</th>
            <th scope="col">{t('tableHeaders.rated4Plus')}</th>
            <th scope="col">{t('tableHeaders.pickRate')}</th>
          </tr>
        </thead>
        <tbody>
          {r.pickRateByLens.map((row) => (
            <tr key={`l-${row.lens}`}>
              <td><span style={PILL}>{row.lens}</span></td>
              <td>{row.total.toLocaleString()}</td>
              <td>{row.rated4Plus.toLocaleString()}</td>
              <td>{row.pickRatePct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
