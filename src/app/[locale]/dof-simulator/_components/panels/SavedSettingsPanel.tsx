'use client'

import { useState } from 'react'
import { ControlPanel } from '@/components/shared/ControlPanel'
import { formatAperture } from '@/lib/math/aperture'
import { formatDistance, formatMm } from '../state/formatters'
import type { SavedSettingsApi } from '../state/useSavedSettings'
import type { SavedRow } from '../state/savedSettingsStore'
import styles from './panels.module.css'

// Presentational — takes pre-translated strings via the optional `labels`
// prop (same pattern as AppearancePanel.tsx / LensPanel.tsx) so this
// component, and the brief's fixed test which renders it with no
// NextIntlClientProvider, stay provider-free.
export interface SavedSettingsLabels {
  title: string
  columnCamera: string
  columnFocalLength: string
  columnAperture: string
  columnDistance: string
  remove: string
  saveSettings: string
  empty: string
}

const DEFAULT_LABELS: SavedSettingsLabels = {
  title: 'Saved Settings',
  columnCamera: 'Camera',
  columnFocalLength: 'Focal Length',
  columnAperture: 'Aperture',
  columnDistance: 'Distance',
  remove: 'Remove saved setting',
  saveSettings: 'Save settings',
  empty: 'No saved settings yet',
}

type SortableKey = 'cameraLabel' | 'focalLength' | 'aperture' | 'distanceM'

const COLUMNS: { key: SortableKey; label: keyof SavedSettingsLabels }[] = [
  { key: 'cameraLabel', label: 'columnCamera' },
  { key: 'focalLength', label: 'columnFocalLength' },
  { key: 'aperture', label: 'columnAperture' },
  { key: 'distanceM', label: 'columnDistance' },
]

interface SavedSettingsPanelProps {
  saved: SavedSettingsApi
  current: Omit<SavedRow, 'id'>
  onApply(row: SavedRow): void
  labels?: SavedSettingsLabels
}

export function SavedSettingsPanel({ saved, current, onApply, labels = DEFAULT_LABELS }: SavedSettingsPanelProps) {
  const [sortKey, setSortKey] = useState<SortableKey | null>(null)

  function handleSort(key: SortableKey) {
    setSortKey(key)
    saved.sortBy(key)
  }

  return (
    <ControlPanel title={labels.title}>
      {saved.rows.length === 0 ? (
        <p className={styles.savedEmpty}>{labels.empty}</p>
      ) : (
        <table className={styles.savedTable}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} aria-sort={sortKey === col.key ? 'ascending' : 'none'}>
                  <button type="button" className={styles.savedSortBtn} onClick={() => handleSort(col.key)}>
                    {labels[col.label]}
                  </button>
                </th>
              ))}
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {saved.rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                className={styles.savedRow}
                onClick={() => onApply(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onApply(row)
                }}
              >
                <td>{row.cameraLabel}</td>
                <td>{formatMm(row.focalLength)}</td>
                <td>{formatAperture(row.aperture)}</td>
                <td>{formatDistance(row.distanceM, false)}</td>
                <td>
                  <button
                    type="button"
                    className={styles.savedRemoveBtn}
                    aria-label={labels.remove}
                    onClick={(e) => {
                      e.stopPropagation()
                      saved.removeRow(row.id)
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className={styles.savedSaveBtn} onClick={() => saved.addRow(current)}>
        {labels.saveSettings}
      </button>
    </ControlPanel>
  )
}
