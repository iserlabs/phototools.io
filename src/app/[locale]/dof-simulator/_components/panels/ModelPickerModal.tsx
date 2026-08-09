'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import type { DofSubject } from '@/lib/data/dofSimulator/types'
import styles from './panels.module.css'

// This component intentionally does not call useTranslations: Task 19's
// fixed test (appearance.test.tsx, from the task brief) mounts it — via
// AppearancePanel — with no NextIntlClientProvider, and next-intl's
// useTranslations() throws synchronously without one. See task-19-report.md
// for the full rationale (the same constraint task-18 hit on BokehInset).

interface ModelPickerModalProps {
  open: boolean
  subjects: DofSubject[]
  activeId: string
  onSelect(id: string): void
  onClose(): void
}

export function ModelPickerModal({ open, subjects, activeId, onSelect, onClose }: ModelPickerModalProps) {
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
            <h2 id="dof-model-picker-title" className={styles.dialogTitle}>Choose a Model</h2>
            <button type="button" className={styles.dialogClose} onClick={onClose} aria-label="Close">
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
