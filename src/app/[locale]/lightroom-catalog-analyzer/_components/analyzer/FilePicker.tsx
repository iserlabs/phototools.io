'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import styles from './LightroomCatalogAnalyzer.module.css'

export interface FilePickerMeta {
  name: string
  size: number
  lastModified: number
}

interface FilePickerProps {
  onFile: (buffer: ArrayBuffer, meta: FilePickerMeta) => void
}

const ONE_GB = 1024 * 1024 * 1024

function isLrcat(file: File): boolean {
  return file.name.toLowerCase().endsWith('.lrcat')
}

async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsArrayBuffer(file)
  })
}

export function FilePicker({ onFile }: FilePickerProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingLarge, setPendingLarge] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const dispatchFile = useCallback(
    async (file: File) => {
      try {
        const buffer = await readAsArrayBuffer(file)
        onFile(buffer, { name: file.name, size: file.size, lastModified: file.lastModified })
      } catch {
        setError(t('filePicker.errorReadFailed'))
      }
    },
    [onFile, t],
  )

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      if (!isLrcat(file)) {
        setError(t('filePicker.errorNotLrcat'))
        setFileName(null)
        return
      }
      setFileName(file.name)
      if (file.size > ONE_GB) {
        setPendingLarge(file)
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

  const confirmLarge = useCallback(() => {
    if (pendingLarge) void dispatchFile(pendingLarge)
    setPendingLarge(null)
  }, [pendingLarge, dispatchFile])

  const cancelLarge = useCallback(() => {
    setPendingLarge(null)
    setFileName(null)
  }, [])

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
      <button type="button" className={styles.browseButton} onClick={onClick}>
        {t('filePicker.browseButton')}
      </button>
      {error && <div className={styles.fileError} role="alert">{error}</div>}

      {pendingLarge && (
        <LargeFileWarning
          fileName={pendingLarge.name}
          sizeGb={(pendingLarge.size / ONE_GB).toFixed(1)}
          onConfirm={confirmLarge}
          onCancel={cancelLarge}
        />
      )}
    </div>
  )
}

interface LargeFileWarningProps {
  fileName: string
  sizeGb: string
  onConfirm: () => void
  onCancel: () => void
}

function LargeFileWarning({ fileName, sizeGb, onConfirm, onCancel }: LargeFileWarningProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  return (
    <div className={styles.warningBackdrop} role="dialog" aria-modal="true">
      <div className={styles.warningModal}>
        <h2 className={styles.warningTitle}>{t('largeFileWarning.title')}</h2>
        <p className={styles.warningBody}>{t('largeFileWarning.body', { fileName, sizeGb })}</p>
        <div className={styles.warningActions}>
          <button type="button" onClick={onCancel} className={styles.warningCancel}>
            {t('largeFileWarning.cancel')}
          </button>
          <button type="button" onClick={onConfirm} className={styles.warningContinue}>
            {t('largeFileWarning.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
