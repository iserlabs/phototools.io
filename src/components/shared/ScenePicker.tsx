'use client'

import { useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { trackToolInteraction } from '@/lib/analytics'
import styles from './ScenePicker.module.css'

export interface ScenePickerScene {
  id: string
  name: string
  src: string
}

interface ScenePickerProps {
  scenes: ScenePickerScene[]
  selectedIndex: number
  onSelect: (index: number) => void
  /** Blob URL for custom uploaded image, or null */
  customSrc?: string | null
  /** Called when user uploads a file via the + button */
  onCustomFile?: (file: File) => void
  /** Called when user removes the custom image */
  onCustomRemove?: () => void
  label?: string
}

export function ScenePicker({
  scenes,
  selectedIndex,
  onSelect,
  customSrc = null,
  onCustomFile,
  onCustomRemove,
  label,
}: ScenePickerProps) {
  const t = useTranslations('common.scene')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCustomFile?.(file)
      onSelect(-1)
    }
    // Reset so the same file can be re-uploaded
    e.target.value = ''
  }, [onCustomFile, onSelect])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCustomRemove?.()
    if (selectedIndex === -1) onSelect(0)
  }, [onCustomRemove, onSelect, selectedIndex])

  return (
    <div className={styles.strip}>
      <span className={styles.label}>{label ?? t('label')}</span>
      {scenes.map((scene, i) => (
        <button
          key={scene.id}
          type="button"
          className={`${styles.thumb} ${i === selectedIndex ? styles.thumbActive : ''}`}
          onClick={() => {
            trackToolInteraction({ param_name: 'scene', param_value: `scene-${i}`, input_type: 'scene-picker' })
            onSelect(i)
          }}
          title={scene.name}
          aria-pressed={i === selectedIndex}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={scene.src} alt={scene.name} loading="lazy" decoding="async" />
        </button>
      ))}
      {onCustomFile && (
        <>
          {customSrc && (
            <div className={`${styles.thumb} ${styles.customThumb} ${selectedIndex === -1 ? styles.thumbActive : ''}`}>
              <button
                type="button"
                className={styles.thumbInner}
                onClick={() => onSelect(-1)}
                title={t('yourPhoto')}
                aria-pressed={selectedIndex === -1}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={customSrc} alt={t('yourPhoto')} decoding="async" />
              </button>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={handleRemove}
                title={t('removePhoto')}
                aria-label={t('removePhoto')}
              >
                ×
              </button>
            </div>
          )}
          <button
            type="button"
            className={`${styles.thumb} ${styles.uploadThumb}`}
            onClick={() => fileRef.current?.click()}
            title={t('uploadPhoto')}
            aria-label={t('uploadPhoto')}
          >
            <span className={styles.uploadIcon} aria-hidden="true">+</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className={styles.hiddenInput}
          />
        </>
      )}
    </div>
  )
}
