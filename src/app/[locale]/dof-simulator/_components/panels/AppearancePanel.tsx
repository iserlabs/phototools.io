'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ControlPanel } from '@/components/shared/ControlPanel'
import { ModeToggle } from '@/components/shared/ModeToggle'
import type { AppearanceApi } from '../state/useAppearance'
import type { DofSubject, DofBackground } from '@/lib/data/dofSimulator/types'
import { ModelPickerModal, type PickerLabels } from './ModelPickerModal'
import { BackgroundPickerModal } from './BackgroundPickerModal'
import styles from './panels.module.css'

// This component takes pre-translated strings via the optional `labels`
// prop rather than calling useTranslations() itself — the same
// presentational pattern FramingPanel.tsx uses for ModeToggle's
// options[].label. That keeps this component (and appearance.test.tsx,
// which renders it with no NextIntlClientProvider) provider-free, while
// AppearancePanelConnected.tsx supplies real translations for production
// use. `labels` defaults to the English literals so callers that don't
// pass it (like the fixed test) still render correct English chrome.
export interface AppearanceLabels {
  appearance: string
  model: string
  background: string
  landscape: string
  portrait: string
  modelPicker: PickerLabels
  backgroundPicker: PickerLabels
}

const DEFAULT_LABELS: AppearanceLabels = {
  appearance: 'Appearance',
  model: 'Model',
  background: 'Background',
  landscape: 'Landscape',
  portrait: 'Portrait',
  modelPicker: { title: 'Choose a Model', close: 'Close' },
  backgroundPicker: { title: 'Choose a Background', close: 'Close' },
}

type PickerName = 'model' | 'background' | null

interface AppearancePanelProps {
  appearance: AppearanceApi
  subjects: DofSubject[]
  backgrounds: DofBackground[]
  labels?: AppearanceLabels
}

export function AppearancePanel({ appearance, subjects, backgrounds, labels = DEFAULT_LABELS }: AppearancePanelProps) {
  const [openPicker, setOpenPicker] = useState<PickerName>(null)

  const subject = subjects.find((s) => s.id === appearance.subjectId) ?? subjects[0]
  const background = backgrounds.find((b) => b.id === appearance.backgroundId) ?? backgrounds[0]

  const orientationOptions = [
    { value: 'landscape' as const, label: labels.landscape },
    { value: 'portrait' as const, label: labels.portrait },
  ]

  return (
    <ControlPanel title={labels.appearance}>
      <div className={styles.pickerRow}>
        <span className={styles.pickerLabel}>{labels.model}</span>
        <button type="button" className={styles.pickerOpener} onClick={() => setOpenPicker('model')}>
          <Image src={subject.crops.full.src} alt="" width={32} height={32} className={styles.pickerThumb} />
          <span className={styles.pickerName}>{subject.name}</span>
        </button>
      </div>

      <div className={styles.pickerRow}>
        <span className={styles.pickerLabel}>{labels.background}</span>
        <button type="button" className={styles.pickerOpener} onClick={() => setOpenPicker('background')}>
          <Image src={background.srcLandscape} alt="" width={32} height={32} className={styles.pickerThumb} />
          <span className={styles.pickerName}>{background.name}</span>
        </button>
      </div>

      <ModeToggle
        options={orientationOptions}
        value={appearance.orientation}
        onChange={appearance.setOrientation}
      />

      <ModelPickerModal
        open={openPicker === 'model'}
        subjects={subjects}
        activeId={appearance.subjectId}
        onSelect={appearance.setSubjectId}
        onClose={() => setOpenPicker(null)}
        labels={labels.modelPicker}
      />
      <BackgroundPickerModal
        open={openPicker === 'background'}
        backgrounds={backgrounds}
        activeId={appearance.backgroundId}
        onSelect={appearance.setBackgroundId}
        onClose={() => setOpenPicker(null)}
        labels={labels.backgroundPicker}
      />
    </ControlPanel>
  )
}
