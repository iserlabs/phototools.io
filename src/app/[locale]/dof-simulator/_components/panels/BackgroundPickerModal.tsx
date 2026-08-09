'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import type { DofBackground } from '@/lib/data/dofSimulator/types'
import type { PickerLabels } from './ModelPickerModal'
import styles from './panels.module.css'

// See ModelPickerModal.tsx — same `labels` prop pattern, defaulted to the
// English literals so it stays mountable (via AppearancePanel) inside
// appearance.test.tsx's fixed render with no NextIntlClientProvider.
const DEFAULT_LABELS: PickerLabels = { title: 'Choose a Background', close: 'Close' }

interface BackgroundPickerModalProps {
  open: boolean
  backgrounds: DofBackground[]
  activeId: string
  onSelect(id: string): void
  onClose(): void
  labels?: PickerLabels
}

export function BackgroundPickerModal({ open, backgrounds, activeId, onSelect, onClose, labels = DEFAULT_LABELS }: BackgroundPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      closedby="any"
      aria-labelledby="dof-background-picker-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose() }}
    >
      {open && (
        <>
          <div className={styles.dialogHeader}>
            <h2 id="dof-background-picker-title" className={styles.dialogTitle}>{labels.title}</h2>
            <button type="button" className={styles.dialogClose} onClick={onClose} aria-label={labels.close}>
              &times;
            </button>
          </div>
          <div className={styles.grid}>
            {backgrounds.map((background) => (
              <button
                key={background.id}
                type="button"
                className={`${styles.gridItem} ${background.id === activeId ? styles.gridItemActive : ''}`}
                onClick={() => { onSelect(background.id); onClose() }}
                aria-pressed={background.id === activeId}
              >
                <Image
                  src={background.srcLandscape}
                  alt=""
                  width={180}
                  height={120}
                  className={styles.gridThumbBackground}
                />
                <span className={styles.gridLabel}>{background.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </dialog>
  )
}
