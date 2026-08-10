'use client'

import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { FRAMING_PRESETS } from '@/lib/data/dofSimulator/framing'
import type { FramingPresetDef } from '@/lib/data/dofSimulator/types'
import type { FramingApi } from '../state/useFraming'
import styles from './controls.module.css'

// Presentational — takes pre-translated strings via the optional `labels`
// prop (same pattern as AppearancePanel.tsx) so this component, and the
// brief's fixed test which renders it with no NextIntlClientProvider, stay
// provider-free. `labels` defaults to the English literals.
export interface FramingLabels {
  framing: string
  presetFace: string
  presetPortrait: string
  presetMedium: string
  presetAmerican: string
  presetFull: string
  lockFov: string
}

const DEFAULT_LABELS: FramingLabels = {
  framing: 'Framing',
  presetFace: 'Face',
  presetPortrait: 'Portrait',
  presetMedium: 'Medium Shot',
  presetAmerican: 'American Shot',
  presetFull: 'Full Body',
  lockFov: 'Lock field of view',
}

const PRESET_LABEL_KEYS: Record<FramingPresetDef['key'], keyof FramingLabels> = {
  face: 'presetFace',
  portrait: 'presetPortrait',
  medium: 'presetMedium',
  american: 'presetAmerican',
  full: 'presetFull',
}

interface FramingPanelProps {
  framing: FramingApi
  onPreset(key: FramingPresetDef['key']): void
  labels?: FramingLabels
}

export function FramingPanel({ framing, onPreset, labels = DEFAULT_LABELS }: FramingPanelProps) {
  return (
    <ControlPanel title={labels.framing}>
      <div className={cp.presets}>
        {FRAMING_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`${cp.preset} ${framing.activePreset === preset.key ? cp.presetActive : ''}`}
            aria-pressed={framing.activePreset === preset.key}
            onClick={() => onPreset(preset.key)}
          >
            {labels[PRESET_LABEL_KEYS[preset.key]]}
          </button>
        ))}
      </div>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={framing.lockFov}
          onChange={(e) => framing.setLockFov(e.target.checked)}
        />
        {labels.lockFov}
      </label>
    </ControlPanel>
  )
}
