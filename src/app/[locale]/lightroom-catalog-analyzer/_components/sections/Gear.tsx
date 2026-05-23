'use client'

import { useTranslations } from 'next-intl'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { CALLOUT, TABLE } from './sectionStyles'

export function Gear() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.gear')
  const { insightBlob } = useAnalyzer()

  // bodiesOverTime arrives as [{ month, body, count }]. Pivot for stacked area.
  const { stackedData, bodies } = useMemo(() => {
    const bodySet = new Set<string>()
    const byMonth = new Map<string, Record<string, number | string>>()
    for (const row of insightBlob?.gear.bodiesOverTime ?? []) {
      bodySet.add(row.body)
      const m = byMonth.get(row.month) ?? { month: row.month }
      m[row.body] = ((m[row.body] as number | undefined) ?? 0) + row.count
      byMonth.set(row.month, m)
    }
    const stackedData = [...byMonth.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)))
    return { stackedData, bodies: [...bodySet] }
  }, [insightBlob?.gear.bodiesOverTime])

  if (!insightBlob) return null
  const g = insightBlob.gear
  const topLens = g.topLenses[0]

  return (
    <section aria-labelledby="gear-heading">
      <h2 id="gear-heading">{t('title')}</h2>

      <figure>
        <h3>{t('bodiesOverTime')}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={stackedData} accessibilityLayer margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            {bodies.map((body, i) => (
              <Area
                key={body}
                type="monotone"
                dataKey={body}
                stackId="bodies"
                stroke={`hsl(${(i * 67) % 360} 60% 55%)`}
                fill={`hsl(${(i * 67) % 360} 60% 55%)`}
                fillOpacity={0.4}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <figcaption className="sr-only">
          {t('caption', {
            topLens: topLens?.lens ?? '—',
            topLensCount: topLens?.count ?? 0,
            comboCount: g.topCombos.length,
          })}
        </figcaption>
      </figure>

      <figure>
        <h3>{t('topLenses')}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={g.topLenses} layout="vertical" accessibilityLayer margin={{ top: 4, right: 12, left: 80, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" />
            <YAxis dataKey="lens" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
        <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
          {g.topLenses.map((l) => (
            <li key={l.lens}>
              <span>{l.lens}</span> — {l.count.toLocaleString()}
            </li>
          ))}
        </ul>
        <figcaption className="sr-only">{t('topLenses')}</figcaption>
      </figure>

      <h3>{t('topCombos')}</h3>
      <table style={TABLE}>
        <thead>
          <tr>
            <th>{t('tableHeaders.body')}</th>
            <th>{t('tableHeaders.lens')}</th>
            <th>{t('tableHeaders.count')}</th>
            <th>{t('tableHeaders.firstUsed')}</th>
            <th>{t('tableHeaders.lastUsed')}</th>
          </tr>
        </thead>
        <tbody>
          {g.topCombos.map((c) => (
            <tr key={`${c.body}::${c.lens}`}>
              <td>{c.body}</td>
              <td>{c.lens}</td>
              <td>{c.count.toLocaleString()}</td>
              <td>{c.firstUsed}</td>
              <td>{c.lastUsed}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {g.retired.length > 0 && (
        <p style={CALLOUT}>
          <strong>{t('retired')}: </strong>
          {g.retired.map((r) => `${r.name} (${r.lastUsed.slice(0, 7)})`).join(' · ')}
        </p>
      )}
    </section>
  )
}
