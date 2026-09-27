'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import styles from './PhotoPicker.module.css'

interface DropZoneProps {
  onFile: (file: File) => void
}

export function DropZone({ onFile }: DropZoneProps) {
  const t = useTranslations('toolUI.color-analyzer')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dropZoneDragOver : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label={t('dropPhotoOrBrowse')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick()
        }}
      >
        <span className={styles.dropIcon}>📷</span>
        <span className={styles.dropPrompt}>{t('dropPhotoOrBrowse')}</span>
        <span className={styles.dropPromptMobile}>{t('tapToChoose')}</span>
        <span className={styles.dropSub}>{t('tapToSample')}</span>
      </div>
    </>
  )
}
