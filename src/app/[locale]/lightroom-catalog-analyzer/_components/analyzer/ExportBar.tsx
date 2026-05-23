'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAnalyzer } from './AnalyzerContext'
import { markdownReport } from '../export/markdown'
import { downloadMarkdown, exportFilename } from '../export/download-markdown'
import { ShareButton } from './ShareButton'
import type { PdfPhase } from './usePdfExport'
import styles from './ExportBar.module.css'

// PdfExportStage (and its transitive @react-pdf/renderer + recharts-to-png +
// html2canvas deps) loads ONLY on the first PDF-button click. ssr:false keeps it
// out of the server render and the page's initial client chunk — the empty-state
// bundle never references these libraries (spec §13 / Task 15.1 gate).
const PdfExportStage = dynamic(() => import('./PdfExportStage').then((m) => m.PdfExportStage), {
  ssr: false,
})

export function ExportBar() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.export')
  const { insightBlob } = useAnalyzer()
  const [phase, setPhase] = useState<PdfPhase>('idle')
  const [pdfActive, setPdfActive] = useState(false)

  const onMarkdown = useCallback(async () => {
    if (!insightBlob) return
    const md = markdownReport(insightBlob)
    try {
      await navigator.clipboard.writeText(md)
      toast.success(t('markdown.copied', { kb: Math.round(new Blob([md]).size / 1024) }))
    } catch {
      downloadMarkdown(md, exportFilename(insightBlob.meta.catalogHash, new Date(), 'md'))
      toast.message(t('markdown.downloaded'))
    }
  }, [insightBlob, t])

  // Mount the heavy PDF stage; it auto-runs one export pass and reports phase.
  const onPdf = useCallback(() => {
    if (phase !== 'idle') return
    setPhase('loading-engine')
    setPdfActive(true)
  }, [phase])

  const onPdfDone = useCallback(() => {
    setPdfActive(false)
    setPhase('idle')
  }, [])

  const pdfLabel =
    phase === 'loading-engine' ? t('pdf.loadingEngine')
      : phase === 'generating' ? t('pdf.generating')
        : t('pdf.button')

  if (!insightBlob) return null

  return (
    <div className={styles.bar} role="group" aria-label={t('barLabel')}>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onPdf} disabled={phase !== 'idle'}>
        {pdfLabel}
      </button>
      <button type="button" className={styles.button} onClick={onMarkdown}>
        {t('markdown.button')}
      </button>
      <ShareButton blob={insightBlob} className={styles.button} />

      {pdfActive && <PdfExportStage blob={insightBlob} onPhase={setPhase} onDone={onPdfDone} />}
    </div>
  )
}
