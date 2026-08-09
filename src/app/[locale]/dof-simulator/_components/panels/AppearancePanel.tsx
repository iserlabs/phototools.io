'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ControlPanel } from '@/components/shared/ControlPanel'
import { ModeToggle } from '@/components/shared/ModeToggle'
import type { AppearanceApi } from '../state/useAppearance'
import type { DofSubject, DofBackground } from '@/lib/data/dofSimulator/types'
import { ModelPickerModal } from './ModelPickerModal'
import { BackgroundPickerModal } from './BackgroundPickerModal'
import styles from './panels.module.css'

// This component intentionally does not call useTranslations: Task 19's
// fixed test (appearance.test.tsx, from the task brief) renders it with no
// NextIntlClientProvider, and next-intl's useTranslations() throws
// synchronously without one. Chrome text below is hardcoded English as a
// result — see task-19-report.md for the full rationale (the same
// constraint task-18 hit on BokehInset, scaled up to this component).
const ORIENTATION_OPTIONS = [
  { value: 'landscape' as const, label: 'Landscape' },
  { value: 'portrait' as const, label: 'Portrait' },
]

type PickerName = 'model' | 'background' | null

interface AppearancePanelProps {
  appearance: AppearanceApi
  subjects: DofSubject[]
  backgrounds: DofBackground[]
}

export function AppearancePanel({ appearance, subjects, backgrounds }: AppearancePanelProps) {
  const [openPicker, setOpenPicker] = useState<PickerName>(null)

  const subject = subjects.find((s) => s.id === appearance.subjectId) ?? subjects[0]
  const background = backgrounds.find((b) => b.id === appearance.backgroundId) ?? backgrounds[0]

  return (
    <ControlPanel title="Appearance">
      <div className={styles.pickerRow}>
        <span className={styles.pickerLabel}>Model</span>
        <button type="button" className={styles.pickerOpener} onClick={() => setOpenPicker('model')}>
          <Image src={subject.crops.full.src} alt="" width={32} height={32} className={styles.pickerThumb} />
          <span className={styles.pickerName}>{subject.name}</span>
        </button>
      </div>

      <div className={styles.pickerRow}>
        <span className={styles.pickerLabel}>Background</span>
        <button type="button" className={styles.pickerOpener} onClick={() => setOpenPicker('background')}>
          <Image src={background.srcLandscape} alt="" width={32} height={32} className={styles.pickerThumb} />
          <span className={styles.pickerName}>{background.name}</span>
        </button>
      </div>

      <ModeToggle
        options={ORIENTATION_OPTIONS}
        value={appearance.orientation}
        onChange={appearance.setOrientation}
      />

      <ModelPickerModal
        open={openPicker === 'model'}
        subjects={subjects}
        activeId={appearance.subjectId}
        onSelect={appearance.setSubjectId}
        onClose={() => setOpenPicker(null)}
      />
      <BackgroundPickerModal
        open={openPicker === 'background'}
        backgrounds={backgrounds}
        activeId={appearance.backgroundId}
        onSelect={appearance.setBackgroundId}
        onClose={() => setOpenPicker(null)}
      />
    </ControlPanel>
  )
}
