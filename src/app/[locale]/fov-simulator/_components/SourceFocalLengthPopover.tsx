'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import styles from './SourceFocalLengthPopover.module.css'

interface SourceFocalLengthPopoverProps {
  value: number | null
  exifDetected: 'fl35' | 'fl' | null
  onChange: (value: number) => void
}

export function SourceFocalLengthPopover({ value, exifDetected, onChange }: SourceFocalLengthPopoverProps) {
  const t = useTranslations('toolUI.fov-simulator')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setDraft(String(value ?? '')) }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const apply = useCallback(() => {
    const n = Math.round(parseFloat(draft))
    if (!isNaN(n) && n >= 8 && n <= 800) {
      onChange(n)
      setOpen(false)
    }
  }, [draft, onChange])

  const note = exifDetected === 'fl35' ? t('detectedFromExif')
    : exifDetected === 'fl' ? t('detectedActualLens', { value: value ?? 0 })
    : t('enterFocalLength')

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={styles.badge} onClick={() => setOpen((v) => !v)}>
        {value
          ? <><span>{t('sourceFocalLength')}:</span> <span className={styles.badgeValue}>{t('focalLengthMm', { value })}</span></>
          : <span>{t('setFocalLength')}</span>}
      </button>
      {open && (
        <div className={styles.popover}>
          <div className={styles.popoverNote}>{note}</div>
          <div className={styles.popoverRow}>
            <input
              type="number"
              className={styles.popoverInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') apply() }}
              min={8}
              max={800}
              autoFocus
            />
            <span className={styles.popoverUnit}>mm</span>
            <button type="button" className={styles.popoverApply} onClick={apply}>
              {t('apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
