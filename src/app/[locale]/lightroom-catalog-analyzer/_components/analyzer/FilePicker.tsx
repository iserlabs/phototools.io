'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import styles from './LightroomCatalogAnalyzer.module.css'
import { classifyReadError, describeError } from './readError'

interface FilePickerProps {
  /** Hands the picked File to the analyzer, which streams it to the worker.
   *  We never read the whole (possibly multi-GB) file in the main thread. */
  onFile: (file: File) => void
}

const PROBE_BYTES = 64 * 1024

function isLrcat(file: File): boolean {
  return file.name.toLowerCase().endsWith('.lrcat')
}

export function FilePicker({ onFile }: FilePickerProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const dispatchFile = useCallback(
    async (file: File) => {
      try {
        // Cheap readability probe (64 KB) — catches an OS read refusal (cloud
        // placeholder, permission, lock) early with actionable guidance, without
        // reading the whole (possibly multi-GB) file. The worker streams the rest.
        await file.slice(0, PROBE_BYTES).arrayBuffer()
        onFile(file)
      } catch (err) {
        // The OS refused the read. Surface its own error name to the user (no
        // DevTools needed) and capture diagnostics — anonymized: error name +
        // size only, never the filename.
        const key = classifyReadError(err)
        const { name: errorName, message } = describeError(err)
        console.warn(`[lrcat] catalog read failed: ${errorName} — ${message} (size=${file.size})`)
        Sentry.captureException(err, {
          tags: { feature: 'lrcat-analyzer', stage: 'file-read', errorName },
          extra: { size: file.size, errorName },
        })
        setError(t(`filePicker.${key}`))
        setErrorDetail(`${errorName}${message ? `: ${message}` : ''}`)
      }
    },
    [onFile, t],
  )

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      setErrorDetail(null)
      if (!isLrcat(file)) {
        setError(t('filePicker.errorNotLrcat'))
        setFileName(null)
        return
      }
      setFileName(file.name)
      if (file.size === 0) {
        setError(t('filePicker.errorEmpty'))
        return
      }
      void dispatchFile(file)
    },
    [dispatchFile, t],
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile],
  )

  const onClick = useCallback(() => inputRef.current?.click(), [])

  return (
    <div className={styles.filePickerWrap}>
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dropZoneDragOver : ''}`}
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        role="button"
        tabIndex={0}
        aria-label={t('filePicker.ariaLabel')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".lrcat,application/x-sqlite3"
          className={styles.hiddenInput}
          onChange={onInputChange}
        />
        {fileName ? (
          <span className={styles.fileName}>{t('filePicker.selectedFile', { fileName })}</span>
        ) : (
          <>
            <span className={styles.dropPrompt}>{t('filePicker.dropPrompt')}</span>
            <span className={styles.dropPromptMobile}>{t('filePicker.tapPrompt')}</span>
          </>
        )}
      </div>
      {error && (
        <div className={styles.fileError} role="alert">
          {error}
          {errorDetail && <span className={styles.fileErrorDetail}>{errorDetail}</span>}
        </div>
      )}
    </div>
  )
}
