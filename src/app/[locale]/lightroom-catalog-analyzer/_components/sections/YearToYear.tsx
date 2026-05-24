'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useAnalyzer } from '../analyzer/AnalyzerContext'
import { YearToYearTable } from './YearToYearTable'
import { YearToYearBiggestShiftCallout } from './YearToYearBiggestShiftCallout'
import { SECTION_HEADER } from './sectionStyles'

export function YearToYear() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.year-to-year')
  const { insightBlob } = useAnalyzer()
  const block = insightBlob?.yearToYear ?? null
  const [yearCount, setYearCount] = useState<2 | 3 | 5>(3)

  if (!block || block.years.length < 2) {
    return (
      <section aria-labelledby="year-to-year-heading">
        <h2 id="year-to-year-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    )
  }

  const startIdx = Math.max(0, block.years.length - yearCount)
  const shownYears = block.years.slice(startIdx)
  const shownRows = block.rows.map((row) => ({
    ...row,
    values: row.values.slice(startIdx),
    deltas: row.deltas.slice(startIdx),
  }))

  return (
    <section aria-labelledby="year-to-year-heading">
      <header style={SECTION_HEADER}>
        <h2 id="year-to-year-heading">{t('title')}</h2>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span>{t('yearCountLabel')}</span>
          <select value={yearCount} onChange={(e) => setYearCount(Number(e.target.value) as 2 | 3 | 5)}>
            <option value={2}>{t('yearCountOptions.2')}</option>
            <option value={3}>{t('yearCountOptions.3')}</option>
            <option value={5}>{t('yearCountOptions.5')}</option>
          </select>
        </label>
      </header>

      <figure>
        <YearToYearBiggestShiftCallout
          shift={block.biggestShift}
          label={block.rows.find((r) => r.statKey === block.biggestShift?.statKey)?.label}
        />
        <YearToYearTable years={shownYears} rows={shownRows} />
        <figcaption className="sr-only">{t('caption', { n: shownYears.length })}</figcaption>
      </figure>
    </section>
  )
}
