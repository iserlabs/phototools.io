'use client'

import { useTranslations } from 'next-intl'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { YearInReviewBlock } from '@/lib/lrcat/types'

export function YearInReviewSparklines({ block }: { block: YearInReviewBlock }) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-in-review.sparklines')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '12px 0' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('monthlyVolume')}</div>
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={block.monthlyVolume} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} accessibilityLayer>
            <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('topGearShare')}</div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {block.topGearShare.slice(0, 5).map((g) => (
            <li key={g.gear}>
              {g.gear} — {g.pct.toFixed(0)}%
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('timeOfDayShare')}</div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {block.timeOfDayShare.map((slot) => (
            <li key={slot.bucket}>
              {slot.bucket} — {slot.pct.toFixed(0)}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
