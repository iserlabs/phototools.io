'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { YearInReviewStatTiles } from './YearInReviewStatTiles'
import { YearInReviewSparklines } from './YearInReviewSparklines'
import { YearInReviewCallout } from './YearInReviewCallout'
import { SECTION_HEADER } from './sectionStyles'

export function YearInReview() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-in-review')
  const { insightBlob, worker, setYearInReview } = useAnalyzer()
  const block = insightBlob?.yearInReview ?? null
  const years = useMemo(() => {
    const set = new Set<number>()
    insightBlob?.heatmap.years.forEach((y) => set.add(y))
    if (block?.year) set.add(block.year)
    return [...set].sort((a, b) => b - a)
  }, [insightBlob?.heatmap.years, block?.year])

  const [busy, setBusy] = useState(false)

  const onYearChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const y = Number(e.target.value)
      if (!worker) return
      setBusy(true)
      try {
        const next = await worker.computeYearInReview(y)
        setYearInReview(next)
      } finally {
        setBusy(false)
      }
    },
    [worker, setYearInReview],
  )

  if (!insightBlob || !block) {
    return (
      <section aria-labelledby="year-in-review-heading">
        <h2 id="year-in-review-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="year-in-review-heading" aria-busy={busy}>
      <header style={SECTION_HEADER}>
        <h2 id="year-in-review-heading">{t('title')}</h2>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span>{t('yearLabel')}</span>
          <select value={block.year} onChange={onYearChange} disabled={busy || !worker}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </header>

      <figure>
        <YearInReviewStatTiles block={block} />
        <YearInReviewSparklines block={block} />
        <YearInReviewCallout block={block} />
        <figcaption className="sr-only">
          {t('caption', {
            year: block.year,
            totalPhotos: block.totalPhotos.toLocaleString(),
            daysShot: block.daysShot,
            topBody: block.topBody ?? '—',
            topLens: block.topLens ?? '—',
          })}
        </figcaption>
      </figure>
    </section>
  )
}
