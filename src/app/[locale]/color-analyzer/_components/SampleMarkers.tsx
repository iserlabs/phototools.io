'use client'

import { Fragment } from 'react'
import type { Sample } from './analyzerState'
import styles from './PhotoPane.module.css'

export interface SampleMarkersProps {
  samples: Sample[]
  selectedId: string | null
  width: number
  height: number
  markerLabel: (n: number, label: string) => string
  removeLabel: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onDragStart: (id: string, e: React.PointerEvent) => void
}

export function SampleMarkers({ samples, selectedId, width, height, markerLabel, removeLabel, onSelect, onRemove, onDragStart }: SampleMarkersProps) {
  return (
    <div className={styles.markers} style={{ width, height }}>
      {samples.map((s, i) => {
        const selected = s.id === selectedId
        const left = s.x * width
        const top = s.y * height
        return (
          <Fragment key={s.id}>
            <button
              type="button"
              className={`${styles.marker} ${selected ? styles.markerSelected : ''}`}
              style={{ left, top, backgroundColor: `rgb(${s.rgb.r}, ${s.rgb.g}, ${s.rgb.b})` }}
              aria-label={markerLabel(i + 1, s.label)}
              aria-pressed={selected}
              onClick={() => onSelect(s.id)}
              onPointerDown={(e) => onDragStart(s.id, e)}
            >
              {i + 1}
            </button>
            {selected && (
              <button
                type="button"
                className={styles.markerRemove}
                style={{ left, top }}
                aria-label={removeLabel}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRemove(s.id)}
              >
                ×
              </button>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
