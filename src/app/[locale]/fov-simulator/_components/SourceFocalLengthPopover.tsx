'use client'

import { useState, useRef, useEffect, useCallback, useId } from 'react'
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
  const badgeRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => { setDraft(String(value ?? '')) }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Only pull focus back to the badge if it was inside the popover —
      // never steal it from wherever the user has moved on to.
      if (wrapRef.current?.contains(document.activeElement)) badgeRef.current?.focus()
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
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
      <button
        ref={badgeRef}
        type="button"
        className={styles.badge}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        {value
          ? <><span>{t('sourceFocalLength')}:</span> <span className={styles.badgeValue}>{t('focalLengthMm', { value })}</span></>
          : <span>{t('setFocalLength')}</span>}
      </button>
      {open && (
        <div id={panelId} className={styles.popover}>
          <div className={styles.popoverNote}>{note}</div>
          <div className={styles.popoverRow}>
            <input
              type="number"
              inputMode="numeric"
              enterKeyHint="done"
              className={styles.popoverInput}
              aria-label={t('sourceFocalLength')}
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
