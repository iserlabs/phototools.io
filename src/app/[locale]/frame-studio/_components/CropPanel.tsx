'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { AspectRatioPreset, AspectRatioType } from './types'
import { ASPECT_RATIOS } from '@/lib/data/frameStudio'
import styles from './CropPanel.module.css'

interface CropPanelProps {
  selectedRatio: AspectRatioType
  onRatioChange: (ratio: AspectRatioType) => void
  onApply: () => void
}

export function CropPanel({ selectedRatio, onRatioChange, onApply }: CropPanelProps) {
  const t = useTranslations('toolUI.frame-studio')
  const [flipped, setFlipped] = useState(false)
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')

  const handlePreset = useCallback((preset: AspectRatioPreset) => {
    if (preset.value === null || preset.value === 'original') {
      onRatioChange(preset.value)
      return
    }
    const ratio = flipped ? preset.h / preset.w : preset.w / preset.h
    onRatioChange(ratio)
  }, [onRatioChange, flipped])

  const handleFlip = useCallback(() => {
    setFlipped((f) => {
      const next = !f
      if (selectedRatio !== null && selectedRatio !== 'original' && selectedRatio !== 1) {
        onRatioChange(1 / selectedRatio)
      }
      return next
    })
  }, [selectedRatio, onRatioChange])

  const handleCustomApply = useCallback(() => {
    const w = parseFloat(customW)
    const h = parseFloat(customH)
    if (w > 0 && h > 0) {
      onRatioChange(w / h)
    }
  }, [customW, customH, onRatioChange])

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <span className={styles.label}>{t('aspectRatio')}</span>
        <div className={styles.ratios}>
          {ASPECT_RATIOS.map((r) => {
            const ratio = r.value === null || r.value === 'original'
              ? r.value
              : flipped && r.value !== 1 ? r.h / r.w : r.w / r.h
            const isActive = selectedRatio === ratio
            return (
              <button
                key={r.label}
                className={`${styles.ratioBtn} ${isActive ? styles.active : ''}`}
                onClick={() => handlePreset(r)}
              >
                {r.label}
              </button>
            )
          })}
        </div>
        <button className={styles.flipBtn} onClick={handleFlip} title={t('flipOrientation')}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
            {flipped
              ? <rect x="4" y="1" width="8" height="14" rx="1" />
              : <rect x="1" y="4" width="14" height="8" rx="1" />
            }
          </svg>
          {flipped ? t('portrait') : t('landscape')}
        </button>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>{t('customRatio')}</span>
        <div className={styles.customRow}>
          <input
            type="number"
            inputMode="numeric"
            className={styles.input}
            placeholder={t('placeholderW')}
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
            min={1}
            aria-label={t('placeholderW')}
          />
          <span className={styles.separator} aria-hidden="true">:</span>
          <input
            type="number"
            inputMode="numeric"
            className={styles.input}
            placeholder={t('placeholderH')}
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
            min={1}
            aria-label={t('placeholderH')}
          />
          <button type="button" className={styles.applyBtn} onClick={handleCustomApply}>{t('set')}</button>
        </div>
      </div>

      <button type="button" className={styles.doneBtn} onClick={onApply}>
        {t('applyCrop')}
      </button>
    </div>
  )
}
