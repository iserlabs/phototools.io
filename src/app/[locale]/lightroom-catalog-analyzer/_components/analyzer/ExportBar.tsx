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

const PdfExportStage = dynamic(
  () => import('./PdfExportStage').then((m) => m.PdfExportStage),
  { ssr: false },
)

const IconPdf = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 1h6l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
    <polyline points="10 1 10 5 14 5" />
  </svg>
)

const IconMarkdown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="14" height="10" rx="1.5" />
    <polyline points="4 9 4 7 6 9 8 7 8 9" />
    <polyline points="11 7 11 9" />
    <polyline points="10 8.5 11 9.5 12 8.5" />
  </svg>
)

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
      <button type="button" className={styles.button} onClick={onPdf} disabled={phase !== 'idle'}>
        <IconPdf /> {pdfLabel}
      </button>
      <button type="button" className={styles.button} onClick={onMarkdown}>
        <IconMarkdown /> {t('markdown.button')}
      </button>
      <ShareButton blob={insightBlob} className={styles.button} />

      {pdfActive && <PdfExportStage blob={insightBlob} onPhase={setPhase} onDone={onPdfDone} />}
    </div>
  )
}
