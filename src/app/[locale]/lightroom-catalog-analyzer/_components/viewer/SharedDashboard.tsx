'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import type { InsightBlob } from '@/lib/lrcat/types'
import { AnalyzerContext, type AnalyzerContextValue } from '../analyzer/AnalyzerContext'
import { FilterContextBanner } from './FilterContextBanner'
import { YearInReview } from '../sections/YearInReview'
import { YearToYear } from '../sections/YearToYear'
import { Overview } from '../sections/Overview'
import { Gear } from '../sections/Gear'
import { FocalLength } from '../sections/FocalLength'
import { FocalLengthPerZoom } from '../sections/FocalLengthPerZoom'
import { Apertures } from '../sections/Apertures'
import { TimeOfDay } from '../sections/TimeOfDay'
import { Heatmap } from '../sections/Heatmap'
import { GpsMap } from '../sections/GpsMap'
import { CurationFunnel } from '../sections/CurationFunnel'
import { EditIntensity } from '../sections/EditIntensity'
import { Ratings } from '../sections/Ratings'
import { Keywords } from '../sections/Keywords'
import { Bursts } from '../sections/Bursts'
import { PeriodComparison } from '../sections/PeriodComparison'
import { CatalogHealth } from '../sections/CatalogHealth'

export function SharedDashboard({ blob }: { blob: InsightBlob }) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.share.recipient')

  // Read-only analyzer context: no worker, so worker-driven affordances
  // (YearInReview year picker, PeriodComparison apply) disable gracefully —
  // both sections already guard `if (!worker) return` and `disabled={!worker}`.
  const value = useMemo<AnalyzerContextValue>(() => ({
    status: 'loaded',
    insightBlob: blob,
    worker: null,
    filter: blob.filterContext,
    error: null,
    loadedFromCache: false,
    lastProgress: null,
    open: async () => {},
    applyFilter: async () => {},
    setFilter: () => {},
    reset: () => {},
    setYearInReview: () => {},
    close: () => {},
  }), [blob])

  return (
    <AnalyzerContext.Provider value={value}>
      <aside role="note" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', margin: '16px 0' }}>
        {t('banner')}
      </aside>

      <FilterContextBanner filter={blob.filterContext} />

      <YearInReview />
      <YearToYear />
      <Overview />
      <Gear />
      <FocalLength />
      <FocalLengthPerZoom />
      <Apertures />
      <TimeOfDay />
      <Heatmap />
      <GpsMap />
      <CurationFunnel />
      <EditIntensity />
      <Ratings />
      <Keywords />
      <Bursts />
      <PeriodComparison />
      <CatalogHealth />

      <p style={{ marginTop: 32 }}>
        <Link href="/lightroom-catalog-analyzer" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {t('cta')}
        </Link>
      </p>
    </AnalyzerContext.Provider>
  )
}
