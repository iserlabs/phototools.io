'use client'

import { useCallback, useState } from 'react'
import type { InsightBlob } from '@/lib/lrcat/types'
import type { PngGetter } from '../export/pdf/chart-rasterizer-recharts'
import { exportFilename, downloadBlob } from '../export/download-markdown'
import type { PdfStrings } from '../export/pdf/PdfDocument'

export type PdfPhase = 'idle' | 'loading-engine' | 'generating'

/** Recharts getters keyed by chart id; canvas blocks pulled straight from the blob. */
export interface PdfChartGetters {
  recharts: Record<string, PngGetter>
}

/**
 * Orchestrates the two-phase PDF export. Dynamically imports @react-pdf/renderer
 * and the recharts/canvas rasterizers ONLY when invoked, keeping them off the
 * initial bundle. Rasterizes charts sequentially per spec §7.2.
 */
export function usePdfExport(blob: InsightBlob, strings: PdfStrings, getters: PdfChartGetters) {
  const [phase, setPhase] = useState<PdfPhase>('idle')

  const exportPdf = useCallback(async () => {
    setPhase('loading-engine')
    try {
      // Phase 1: dynamic-import the heavy libraries (chunk downloaded on first click only).
      const [{ pdf }, { rasterizeRechartsCharts }, { rasterizeCanvasChart }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../export/pdf/chart-rasterizer-recharts'),
        import('../export/pdf/chart-rasterizer-canvas'),
      ])
      const { PdfDocument } = await import('../export/pdf/PdfDocument')

      setPhase('generating')
      // Phase 2a: sequential Recharts rasterization (one html2canvas pass at a time).
      const recharts = await rasterizeRechartsCharts(getters.recharts)
      // Phase 2b: sequential Canvas rasterization, awaited one at a time.
      const focalLength = await rasterizeCanvasChart('focalLength', blob.focalLength)
      const heatmap = await rasterizeCanvasChart('heatmap', blob.heatmap)
      const gps = await rasterizeCanvasChart('gps', blob.gps, null)

      const charts = {
        yearInReview: recharts.yearInReview ?? undefined,
        gearBodies: recharts.gearBodies ?? undefined,
        gearLenses: recharts.gearLenses ?? undefined,
        focalLengthPerZoom: recharts.focalLengthPerZoom ?? undefined,
        apertures: recharts.apertures ?? undefined,
        timeOfDay: recharts.timeOfDay ?? undefined,
        curation: recharts.curation ?? undefined,
        editIntensity: recharts.editIntensity ?? undefined,
        ratings: recharts.ratings ?? undefined,
        keywords: recharts.keywords ?? undefined,
        bursts: recharts.bursts ?? undefined,
        focalLength, heatmap, gps,
      }

      const instance = pdf(<PdfDocument blob={blob} strings={strings} charts={charts} />)
      const result = await instance.toBlob()
      downloadBlob(result, exportFilename(blob.meta.catalogHash, new Date(), 'pdf'))
    } finally {
      setPhase('idle')
    }
  }, [blob, strings, getters])

  return { exportPdf, phase }
}
