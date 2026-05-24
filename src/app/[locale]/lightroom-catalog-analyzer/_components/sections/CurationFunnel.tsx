'use client'

import { useTranslations } from 'next-intl'
import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from 'recharts'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { TABLE } from './sectionStyles'

export function CurationFunnel() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.curation-funnel')
  const { insightBlob } = useAnalyzer()
  if (!insightBlob) return null
  const c = insightBlob.curation
  const data = [
    { name: t('steps.total'), value: c.funnel.total, fill: '#5b9bff' },
    { name: t('steps.notRejected'), value: c.funnel.notRejected, fill: '#7ed957' },
    { name: t('steps.rated1Plus'), value: c.funnel.rated1Plus, fill: '#f5a623' },
    { name: t('steps.rated4Plus'), value: c.funnel.rated4Plus, fill: '#e64a3b' },
  ]
  const overallPick = c.funnel.total > 0 ? ((c.funnel.rated4Plus / c.funnel.total) * 100).toFixed(1) : '0.0'

  return (
    <section aria-labelledby="curation-heading">
      <h2 id="curation-heading">{t('title')}</h2>
      <figure>
        <ResponsiveContainer width="100%" height={260}>
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="value" data={data} isAnimationActive={false}>
              <LabelList position="right" dataKey="name" />
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
        <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 16, listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
          {data.map((step) => (
            <li key={step.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: step.fill, display: 'inline-block' }} aria-hidden="true" />
              <span>{step.name}</span> — {step.value.toLocaleString()}
            </li>
          ))}
        </ol>
        <figcaption className="sr-only">
          {t('caption', { total: c.funnel.total, rated4Plus: c.funnel.rated4Plus, pickRate: overallPick })}
        </figcaption>
      </figure>

      <h3>{t('perGear')}</h3>
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
          {c.pickRateByBody.map((row) => (
            <tr key={`b-${row.body}`}>
              <td>{row.body}</td>
              <td>{row.total.toLocaleString()}</td>
              <td>{row.rated4Plus.toLocaleString()}</td>
              <td>{row.pickRatePct.toFixed(1)}%</td>
            </tr>
          ))}
          {c.pickRateByLens.map((row) => (
            <tr key={`l-${row.lens}`}>
              <td>{row.lens}</td>
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
