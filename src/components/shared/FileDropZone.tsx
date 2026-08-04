'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { trackFileUpload } from '@/lib/analytics'
import styles from './FileDropZone.module.css'

interface FileDropZoneProps {
  onFile: (file: File) => void
  /** Custom prompt text (default: "Drop an image here or click to browse") */
  prompt?: string
  /**
   * Custom accept attribute (default "image/*"). Extension entries (".nef")
   * also whitelist dropped files whose browser MIME type is empty — the case
   * for most RAW formats.
   */
  accept?: string
}

export function FileDropZone({ onFile, prompt: promptText, accept = 'image/*' }: FileDropZoneProps) {
  const t = useTranslations('common.fileUpload')
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name)
      trackFileUpload({ file_type: file.type, file_size_kb: Math.round(file.size / 1024) })
      onFile(file)
    },
    [onFile],
  )

  const acceptsFile = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) return true
      const name = file.name.toLowerCase()
      return accept
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .some((a) => a.startsWith('.') && name.endsWith(a))
    },
    [accept],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && acceptsFile(file)) {
        handleFile(file)
      }
    },
    [handleFile, acceptsFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      className={`${styles.dropZone} ${dragOver ? styles.dropZoneDragOver : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={0}
      aria-label={fileName ? t('selectedFile', { fileName }) : t('dropPrompt')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.hiddenInput}
        onChange={handleInputChange}
      />
      {fileName ? (
        <span className={styles.fileName}>{fileName}</span>
      ) : (
        <>
          <span className={styles.prompt}>{promptText ?? t('dropPrompt')}</span>
          <span className={styles.promptMobile}>{t('tapPrompt')}</span>
        </>
      )}
      <span className={styles.privacy}>{t('privacy')}</span>
    </div>
  )
}
