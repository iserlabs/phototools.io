'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import type { DofSubject } from '@/lib/data/dofSimulator/types'
import styles from './panels.module.css'

// Takes pre-translated chrome via the optional `labels` prop instead of
// calling useTranslations() itself, so it stays mountable (via
// AppearancePanel) inside appearance.test.tsx's fixed render with no
// NextIntlClientProvider. `labels` defaults to the English literals;
// AppearancePanelConnected.tsx supplies real translations for production.
export interface PickerLabels {
  title: string
  close: string
}

const DEFAULT_LABELS: PickerLabels = { title: 'Choose a Model', close: 'Close' }

interface ModelPickerModalProps {
  open: boolean
  subjects: DofSubject[]
  activeId: string
  onSelect(id: string): void
  onClose(): void
  labels?: PickerLabels
}

export function ModelPickerModal({ open, subjects, activeId, onSelect, onClose, labels = DEFAULT_LABELS }: ModelPickerModalProps) {
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
      aria-labelledby="dof-model-picker-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose() }}
    >
      {open && (
        <>
          <div className={styles.dialogHeader}>
            <h2 id="dof-model-picker-title" className={styles.dialogTitle}>{labels.title}</h2>
            <button type="button" className={styles.dialogClose} onClick={onClose} aria-label={labels.close}>
              &times;
            </button>
          </div>
          <div className={styles.grid}>
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className={`${styles.gridItem} ${subject.id === activeId ? styles.gridItemActive : ''}`}
                onClick={() => { onSelect(subject.id); onClose() }}
                aria-pressed={subject.id === activeId}
              >
                <Image
                  src={subject.crops.full.src}
                  alt=""
                  width={120}
                  height={180}
                  className={styles.gridThumbSubject}
                />
                <span className={styles.gridLabel}>{`${subject.name} (${subject.heightM.toFixed(2)}m)`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </dialog>
  )
}
