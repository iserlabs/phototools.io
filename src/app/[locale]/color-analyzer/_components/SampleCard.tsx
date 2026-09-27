'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { rgbToHex } from '@/lib/math/color-fit'
import type { FitResult } from '@/lib/math/color-fit'
import type { Sample } from './analyzerState'
import styles from './ColorAnalyzer.module.css'

export interface SampleCardLabels { lock: string; unlock: string; remove: string; copied: string; neutral: string; labelPlaceholder: string; suggested: string }

export interface SampleCardProps {
  index: number
  sample: Sample
  colorName: string
  result: FitResult | null
  nudge: string | null
  selected: boolean
  showGuide: boolean
  labels: SampleCardLabels
  onSelect: () => void
  onLabelChange: (label: string) => void
  onLock: (locked: boolean) => void
  onRemove: () => void
  onNudgePosition: (dx: number, dy: number) => void
}

export function SampleCard(p: SampleCardProps) {
  const { sample, labels } = p
  const hex = rgbToHex(sample.rgb.r, sample.rgb.g, sample.rgb.b)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }, [hex])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLLIElement>) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault(); p.onRemove(); break
      case 'ArrowLeft':
        e.preventDefault(); p.onNudgePosition(-1, 0); break
      case 'ArrowRight':
        e.preventDefault(); p.onNudgePosition(1, 0); break
      case 'ArrowUp':
        e.preventDefault(); p.onNudgePosition(0, -1); break
      case 'ArrowDown':
        e.preventDefault(); p.onNudgePosition(0, 1); break
    }
  }, [p])

  return (
    <li
      className={`${styles.sampleCard} ${p.selected ? styles.sampleCardSelected : ''}`}
      tabIndex={0}
      onFocus={p.onSelect}
      onClick={p.onSelect}
      onKeyDown={onKeyDown}
    >
      <div className={styles.sampleRow}>
        <span className={styles.sampleIndex}>{p.index}</span>
        <span className={styles.sampleSwatch} style={{ backgroundColor: hex }} aria-hidden="true" />
        <input
          className={styles.sampleLabel}
          value={sample.label}
          placeholder={labels.labelPlaceholder}
          onChange={(e) => p.onLabelChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        {!sample.neutral && (
          <button
            type="button"
            className={`${styles.iconBtn} ${sample.locked ? styles.iconBtnActive : ''}`}
            aria-label={sample.locked ? labels.unlock : labels.lock}
            aria-pressed={sample.locked}
            onClick={(e) => { e.stopPropagation(); p.onLock(!sample.locked) }}
          >
            🔒
          </button>
        )}
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={labels.remove}
          onClick={(e) => { e.stopPropagation(); p.onRemove() }}
        >
          ×
        </button>
      </div>
      <div className={styles.sampleRow}>
        <button type="button" className={styles.hexBtn} onClick={(e) => { e.stopPropagation(); void copy() }} aria-label={hex}>
          {copied ? labels.copied : hex}
        </button>
        <span className={styles.sampleName}>· <span>{p.colorName}</span></span>
      </div>
      <div className={styles.sampleMeta}>{`H ${sample.hsl.h}° · S ${sample.hsl.s}% · L ${sample.hsl.l}%`}</div>
      {p.showGuide && sample.neutral && <div className={styles.sampleNeutral}>{labels.neutral}</div>}
      {p.showGuide && !sample.neutral && p.result && (
        <div className={styles.sampleNudge} data-band={p.result.band}>
          <span>{p.nudge}</span>
          {p.result.band !== 'aligned' && (
            <span className={styles.suggested}>
              {labels.suggested}: <span className={styles.suggestedSwatch} style={{ backgroundColor: p.result.suggestedHex }} /> <span>{p.result.suggestedHex}</span>
            </span>
          )}
        </div>
      )}
    </li>
  )
}
