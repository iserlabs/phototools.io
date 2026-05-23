'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { PeriodComparisonForm, type DateRange } from './PeriodComparisonForm'
import { PeriodComparisonScorecard } from './PeriodComparisonScorecard'
import type { InsightBlob } from '@/lib/lrcat/types'

export function PeriodComparison() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.period-comparison')
  const { worker } = useAnalyzer()
  const [periodA, setPeriodA] = useState<DateRange>({ start: '', end: '' })
  const [periodB, setPeriodB] = useState<DateRange>({ start: '', end: '' })
  const [blobA, setBlobA] = useState<InsightBlob | null>(null)
  const [blobB, setBlobB] = useState<InsightBlob | null>(null)
  const [busy, setBusy] = useState(false)

  const apply = useCallback(
    async (which: 'A' | 'B') => {
      if (!worker) return
      const range = which === 'A' ? periodA : periodB
      if (!range.start || !range.end) return
      setBusy(true)
      try {
        const next = await worker.applyFilter({ dateRange: { start: range.start, end: range.end } })
        if (which === 'A') setBlobA(next)
        else setBlobB(next)
      } finally {
        setBusy(false)
      }
    },
    [worker, periodA, periodB],
  )

  return (
    <section aria-labelledby="period-comparison-heading" aria-busy={busy}>
      <h2 id="period-comparison-heading">{t('title')}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <PeriodComparisonForm
          label={t('periodA')}
          range={periodA}
          onChange={setPeriodA}
          onApply={() => apply('A')}
          disabled={!worker || busy}
        />
        <PeriodComparisonForm
          label={t('periodB')}
          range={periodB}
          onChange={setPeriodB}
          onApply={() => apply('B')}
          disabled={!worker || busy}
        />
      </div>

      <figure>
        {blobA && blobB ? <PeriodComparisonScorecard blobA={blobA} blobB={blobB} /> : <p>{t('empty')}</p>}
        <figcaption className="sr-only">{t('caption')}</figcaption>
      </figure>
    </section>
  )
}
