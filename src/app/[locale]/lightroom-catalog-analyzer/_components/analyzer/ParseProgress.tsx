'use client'

import { useTranslations } from 'next-intl'
import styles from './LightroomCatalogAnalyzer.module.css'

interface ParseProgressProps {
  /** Stage key — known lifecycle stages get a localized label; per-aggregator
   *  stages map to the "aggregating" umbrella label (m-2); anything else renders
   *  the raw key. */
  stage: string
  /** 0..100 (values outside the range are clamped). */
  pct: number
}

// Lifecycle stages with dedicated localized labels.
const KNOWN_STAGES = new Set([
  'reading', 'opening', 'schema', 'hashing', 'aggregating', 'finalizing',
])

// Per-aggregator stage keys emitted by the worker during the aggregating phase.
// They all roll up to the single "Computing statistics…" umbrella label so the
// user never sees raw keys like "focal-length-per-zoom" (Audit m-2).
const AGGREGATOR_STAGES = new Set([
  'overview', 'gear', 'focal-length', 'focal-length-per-zoom',
  'apertures', 'time-of-day', 'heatmap', 'gps',
  'curation', 'edit-intensity', 'ratings', 'keywords',
  'bursts', 'catalog-health', 'year-to-year', 'year-in-review',
])

export function ParseProgress({ stage, pct }: ParseProgressProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  const labelStage = AGGREGATOR_STAGES.has(stage) ? 'aggregating' : stage
  const label = KNOWN_STAGES.has(labelStage) ? t(`parseProgress.stage.${labelStage}` as const) : stage

  return (
    <section className={styles.parseProgressWrap} aria-live="polite">
      <h2 className={styles.parseProgressTitle}>{t('parseProgress.title')}</h2>
      <p className={styles.parseProgressSubtitle}>{t('parseProgress.subtitle')}</p>
      <div className={styles.parseProgressRow}>
        <span className={styles.parseProgressStage}>{label}</span>
        <span className={styles.parseProgressPct}>{t('parseProgress.pctLabel', { pct: clamped })}</span>
      </div>
      <div className={styles.parseProgressTrack} aria-hidden="false">
        <div
          className={styles.parseProgressBar}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </section>
  )
}
