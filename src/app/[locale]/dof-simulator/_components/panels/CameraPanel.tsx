'use client'

import { useEffect, useState } from 'react'
import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { SearchCombobox } from './SearchCombobox'
import { DOF_SENSORS } from '@/lib/data/dofSimulator/sensors'
import { DOF_CAMERAS } from '@/lib/data/dofSimulator/cameras'
import type { DofCamera } from '@/lib/data/dofSimulator/types'
import type { OpticsApi } from '../state/useOptics'
import type { DofDerived } from '../state/useDofDerived'

// Presentational — see FramingPanel.tsx / AppearancePanel.tsx for the
// labels-prop pattern this follows (default English literals, translated by
// CameraPanelConnected).
export interface CameraLabels {
  camera: string
  sensor: string
  cropFactor: string
  searchPlaceholder: string
  clear: string
}

const DEFAULT_LABELS: CameraLabels = {
  camera: 'Camera',
  sensor: 'Sensor',
  cropFactor: 'Crop Factor',
  searchPlaceholder: 'Search cameras...',
  clear: 'Clear',
}

const cameraLabel = (c: DofCamera) => `${c.brand} ${c.model}`
const cameraGroup = (c: DofCamera) => c.brand

interface CameraPanelProps {
  optics: OpticsApi
  derived: DofDerived
  labels?: CameraLabels
}

export function CameraPanel({ optics, derived, labels = DEFAULT_LABELS }: CameraPanelProps) {
  const [mode, setMode] = useState<'sensor' | 'camera'>(optics.cameraId ? 'camera' : 'sensor')

  // A camera picked via query-string init (or the combobox) should flip the
  // toggle to reflect it; switching back to 'sensor' is a manual user action
  // handled in the toggle's onChange below.
  useEffect(() => {
    if (optics.cameraId) setMode('camera')
  }, [optics.cameraId])

  const modeOptions = [
    { value: 'sensor' as const, label: labels.sensor },
    { value: 'camera' as const, label: labels.camera },
  ]

  return (
    <ControlPanel title={labels.camera}>
      <ModeToggle
        options={modeOptions}
        value={mode}
        onChange={(v) => {
          setMode(v)
          if (v === 'sensor') optics.setCameraId(null)
        }}
      />

      {mode === 'sensor' ? (
        <select
          className={cp.select}
          value={optics.sensorId}
          onChange={(e) => optics.setSensorId(e.target.value)}
        >
          {DOF_SENSORS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      ) : (
        <SearchCombobox
          items={DOF_CAMERAS}
          groupBy={cameraGroup}
          label={cameraLabel}
          value={optics.cameraId}
          onChange={optics.setCameraId}
          placeholder={labels.searchPlaceholder}
          clearLabel={labels.clear}
        />
      )}

      <div className={cp.fieldRow}>
        <span className={cp.fieldLabel}>{labels.cropFactor}</span>
        <span className={cp.fieldValue}>{derived.sensor.cropFactor.toFixed(2)}x</span>
      </div>
    </ControlPanel>
  )
}
