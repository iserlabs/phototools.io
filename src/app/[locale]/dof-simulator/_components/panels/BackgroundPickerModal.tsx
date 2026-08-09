'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import type { DofBackground } from '@/lib/data/dofSimulator/types'
import styles from './panels.module.css'

// See ModelPickerModal.tsx — same constraint: no useTranslations here, this
// component is mounted by Task 19's fixed, non-editable test with no
// NextIntlClientProvider. Text is hardcoded English; see task-19-report.md.

interface BackgroundPickerModalProps {
  open: boolean
  backgrounds: DofBackground[]
  activeId: string
  onSelect(id: string): void
  onClose(): void
}

export function BackgroundPickerModal({ open, backgrounds, activeId, onSelect, onClose }: BackgroundPickerModalProps) {
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
            <h2 id="dof-background-picker-title" className={styles.dialogTitle}>Choose a Background</h2>
            <button type="button" className={styles.dialogClose} onClick={onClose} aria-label="Close">
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
