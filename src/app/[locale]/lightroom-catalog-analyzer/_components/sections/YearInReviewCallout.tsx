'use client'

import { useTranslations } from 'next-intl'
import type { YearInReviewBlock } from '@/lib/lrcat/types'
import { CALLOUT } from './sectionStyles'

export function YearInReviewCallout({ block }: { block: YearInReviewBlock }) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-in-review')
  if (!block.mostProlificMonth) return null
  return (
    <p style={CALLOUT}>
      {t('callout', {
        month: block.mostProlificMonth.month,
        count: block.mostProlificMonth.count.toLocaleString(),
        lens: block.topLensInMonth ?? block.topLens ?? '—',
      })}
    </p>
  )
}
