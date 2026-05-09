'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { trackFileUpload } from '@/lib/analytics'
import styles from './FileDropZone.module.css'

interface FileDropZoneProps {
  onFile: (file: File) => void
  /** Custom prompt text (default: "Drop an image here or click to browse") */
  prompt?: string
}

export function FileDropZone({ onFile, prompt: promptText }: FileDropZoneProps) {
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handleFile(file)
      }
    },
    [handleFile],
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
        accept="image/*"
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
