'use client'

import { useTranslations } from 'next-intl'
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { YearInReviewBlock } from '@/lib/lrcat/types'
import { MUTED_LABEL, TOOLTIP_PROPS } from './sectionStyles'
import { PILL } from './sectionFormatters'

const TOD_COLORS = ['#f5a623', '#5b9bff', '#7ed957', '#666']

export function YearInReviewSparklines({ block }: { block: YearInReviewBlock }) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-in-review.sparklines')
  const todData = block.timeOfDayShare.map((slot, i) => ({
    name: slot.bucket,
    value: slot.pct,
    fill: TOD_COLORS[i % TOD_COLORS.length],
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '12px 0' }}>
      <div>
        <div style={MUTED_LABEL}>{t('monthlyVolume')}</div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={block.monthlyVolume} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} accessibilityLayer>
            <XAxis dataKey="month" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 10 }} interval={0} />
            <Tooltip {...TOOLTIP_PROPS} />
            <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={MUTED_LABEL}>{t('topGearShare')}</div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {block.topGearShare.slice(0, 5).map((g) => (
            <li key={g.gear} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={PILL}>{g.gear}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{g.pct.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div style={MUTED_LABEL}>{t('timeOfDayShare')}</div>
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie data={todData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} innerRadius={20} label={({ name, value }) => `${name} ${value.toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
              {todData.map((entry, i) => (
                <Cell key={entry.name} fill={TOD_COLORS[i % TOD_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_PROPS} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
