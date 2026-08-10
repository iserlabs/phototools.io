'use client'

import { useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import styles from './overlays.module.css'

export interface AbDividerProps {
  pos: number
  onChange(pos: number): void
}

const MIN_POS = 0.1
const MAX_POS = 0.9
const NUDGE = 0.02

function clampPos(v: number): number {
  return Math.min(MAX_POS, Math.max(MIN_POS, v))
}

/**
 * Draggable A/B split-view divider overlaid on the viewport. The outer layer
 * spans the full viewport (its width is what `pos` is a fraction of); the
 * bar itself owns pointer capture so drags keep tracking even if the pointer
 * leaves the bar. Also focusable and keyboard-nudgeable with the arrow keys
 * for users who can't drag.
 */
export function AbDivider({ pos, onChange }: AbDividerProps) {
  const t = useTranslations('toolUI.dof-simulator')
  const layerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const posFromClientX = useCallback(
    (clientX: number): number => {
      const el = layerRef.current
      if (!el) return pos
      const rect = el.getBoundingClientRect()
      if (rect.width === 0) return pos
      return clampPos((clientX - rect.left) / rect.width)
    },
    [pos],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      onChange(posFromClientX(e.clientX))
    },
    [onChange, posFromClientX],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      onChange(posFromClientX(e.clientX))
    },
    [onChange, posFromClientX],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onChange(clampPos(pos - NUDGE))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onChange(clampPos(pos + NUDGE))
      }
    },
    [onChange, pos],
  )

  return (
    <div ref={layerRef} className={styles.dividerLayer}>
      <div
        className={styles.divider}
        style={{ left: `${pos * 100}%` }}
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={MIN_POS * 100}
        aria-valuemax={MAX_POS * 100}
        aria-valuenow={Math.round(pos * 100)}
        aria-label={t('dividerLabel')}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.dividerHandle} />
      </div>
    </div>
  )
}
