'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import type { InsightBlob } from '@/lib/lrcat/types'
import { useChartPng } from '../export/pdf/chart-rasterizer-recharts'
import { HiddenRechartsStage, type RechartsStageRefs } from './HiddenRechartsStage'
import { usePdfExport, type PdfPhase } from './usePdfExport'
import type { PdfStrings } from '../export/pdf/PdfDocument'
import styles from './ExportBar.module.css'

/**
 * The heavy half of the PDF export. This component (and its transitive
 * `recharts-to-png` / `html2canvas` / `@react-pdf/renderer` dependencies) is
 * `next/dynamic`-imported by ExportBar, so it never enters the empty-state or
 * post-load initial bundle — it loads only on the first PDF-button click.
 *
 * On mount it kicks off one export pass, mounts the hidden Recharts stage that
 * recharts-to-png rasterizes, reports phase back to ExportBar, and toasts the
 * outcome.
 */
export function PdfExportStage({
  blob,
  onPhase,
  onDone,
}: {
  blob: InsightBlob
  onPhase: (phase: PdfPhase) => void
  onDone: () => void
}) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.export')

  // One useChartPng per Recharts chart that needs rasterizing.
  const yearInReview = useChartPng(), gearBodies = useChartPng(), gearLenses = useChartPng()
  const focalLengthPerZoom = useChartPng(), apertures = useChartPng(), timeOfDay = useChartPng()
  const curation = useChartPng(), editIntensity = useChartPng(), ratings = useChartPng()
  const keywords = useChartPng(), bursts = useChartPng()

  const refs: RechartsStageRefs = {
    yearInReview: yearInReview[1].ref, gearBodies: gearBodies[1].ref, gearLenses: gearLenses[1].ref,
    focalLengthPerZoom: focalLengthPerZoom[1].ref, apertures: apertures[1].ref, timeOfDay: timeOfDay[1].ref,
    curation: curation[1].ref, editIntensity: editIntensity[1].ref, ratings: ratings[1].ref,
    keywords: keywords[1].ref, bursts: bursts[1].ref,
  }

  const strings: PdfStrings = {
    title: t('pdf.title'), filteredSuffix: t('pdf.filteredSuffix'), localFooter: t('pdf.localFooter'),
    generatedBy: t('pdf.generatedBy'), totalPhotos: t('pdf.totalPhotos'), dateRange: t('pdf.dateRange'),
    catalogVersion: t('pdf.catalogVersion'), filterTitle: t('pdf.filterTitle'), page: t('pdf.page'),
    sections: t.raw('pdf.sections') as PdfStrings['sections'],
  }

  const { exportPdf, phase } = usePdfExport(blob, strings, {
    recharts: {
      yearInReview: yearInReview[0], gearBodies: gearBodies[0], gearLenses: gearLenses[0],
      focalLengthPerZoom: focalLengthPerZoom[0], apertures: apertures[0], timeOfDay: timeOfDay[0],
      curation: curation[0], editIntensity: editIntensity[0], ratings: ratings[0],
      keywords: keywords[0], bursts: bursts[0],
    },
  })

  useEffect(() => {
    onPhase(phase)
  }, [phase, onPhase])

  // Run exactly one export pass when the stage mounts. The off-screen Recharts
  // charts are in the DOM by the time the effect fires (same commit).
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    void (async () => {
      try {
        await exportPdf()
        if (!cancelled) toast.success(t('pdf.success'))
      } catch {
        if (!cancelled) toast.error(t('pdf.error'))
      } finally {
        if (!cancelled) onDone()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [exportPdf, onDone, t])

  return (
    <div className={styles.hiddenStage} aria-hidden="true">
      <HiddenRechartsStage blob={blob} refs={refs} />
    </div>
  )
}
