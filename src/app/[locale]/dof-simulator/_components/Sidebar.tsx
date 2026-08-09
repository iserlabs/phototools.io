'use client'

import { useTranslations } from 'next-intl'
import { ToolActions } from '@/components/shared/ToolActions'
import { ControlPanel } from '@/components/shared/ControlPanel'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { InterfacePanel } from './panels/InterfacePanel'
import { AppearancePanelConnected } from './panels/AppearancePanelConnected'
import { CameraPanelConnected } from './panels/CameraPanelConnected'
import { LensPanelConnected } from './panels/LensPanelConnected'
import { DistancePanelConnected } from './panels/DistancePanelConnected'
import { FramingPanelConnected } from './panels/FramingPanelConnected'
import { AdvancedPanelConnected } from './panels/AdvancedPanelConnected'
import { SavedSettingsPanelConnected } from './panels/SavedSettingsPanelConnected'
import { ResultsPanelConnected } from './panels/ResultsPanelConnected'
import { DOF_SUBJECTS } from '@/lib/data/dofSimulator/models'
import { DOF_BACKGROUNDS } from '@/lib/data/dofSimulator/backgrounds'
import { getCameraById } from '@/lib/data/dofSimulator/cameras'
import type { DofStateApi } from './state/useDofState'
import type { DofBackground, FramingPresetDef } from '@/lib/data/dofSimulator/types'
import type { SavedRow } from './state/savedSettingsStore'
import styles from './DofSimulator.module.css'

interface SidebarProps {
  dofState: DofStateApi
  background: DofBackground
  onFocalLengthChange(v: number): void // tracked + lock-FOV aware, set A only
  onDistanceChange(v: number): void // tracked + lock-FOV aware, set A only
  onPreset(key: FramingPresetDef['key']): void // tracked, set A only
  onReset(): void
  hideTitle?: boolean
}

/**
 * The full ordered panel stack, mounted twice by DofSimulator.tsx (desktop
 * sidebar + mobile controls section — see CLAUDE.md's duplicate-DOM-elements
 * convention). Camera/Lens/Distance/Advanced/Results read and edit whichever
 * optics set the A/B "Comparison" block's active-set toggle currently points
 * at; Framing and Saved Settings always operate on set A, since `framing`
 * (lock-FOV) and the saved-rows store aren't duplicated per A/B set in the
 * state facade.
 */
export function Sidebar({ dofState, background, onFocalLengthChange, onDistanceChange, onPreset, onReset, hideTitle }: SidebarProps) {
  const t = useTranslations('toolUI.dof-simulator')
  const { optics, appearance, framing, uiPrefs, ab, saved, derived, derivedB, bokeh, setBokeh } = dofState

  const activeIsB = ab.mode !== 'off' && ab.activeSet === 'b'
  const activeOptics = activeIsB ? ab.b : optics
  const activeDerived = activeIsB ? (derivedB ?? derived) : derived
  const handleFocalLengthChange = activeIsB ? ab.b.setFocalLength : onFocalLengthChange
  const handleDistanceChange = activeIsB ? ab.b.setDistanceM : onDistanceChange

  const camera = optics.cameraId ? getCameraById(optics.cameraId) : undefined
  const currentRow: Omit<SavedRow, 'id'> = {
    cameraLabel: camera ? `${camera.brand} ${camera.model}` : derived.sensor.name,
    focalLength: optics.focalLength,
    aperture: optics.aperture,
    distanceM: optics.distanceM,
    bokeh,
  }

  const abModeOptions = [
    { value: 'off' as const, label: t('modeSingle') },
    { value: 'wipe' as const, label: t('modeWipe') },
    { value: 'split' as const, label: t('modeSplit') },
  ]
  const abSetOptions = [
    { value: 'a' as const, label: t('setA') },
    { value: 'b' as const, label: t('setB') },
  ]

  return (
    <>
      <ToolActions toolSlug="dof-simulator" onReset={onReset} hideTitle={hideTitle} />
      {hideTitle && <div className={styles.mobileDivider} />}
      <InterfacePanel uiPrefs={uiPrefs} />
      <ControlPanel title={t('compare')}>
        <ModeToggle options={abModeOptions} value={ab.mode} onChange={ab.setMode} />
        {ab.mode !== 'off' && <ModeToggle options={abSetOptions} value={ab.activeSet} onChange={ab.setActiveSet} />}
      </ControlPanel>
      <AppearancePanelConnected appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />
      <CameraPanelConnected optics={activeOptics} derived={activeDerived} />
      <LensPanelConnected optics={activeOptics} derived={activeDerived} uiPrefs={uiPrefs} onFocalLengthChange={handleFocalLengthChange} />
      <DistancePanelConnected optics={activeOptics} derived={activeDerived} uiPrefs={uiPrefs} onDistanceChange={handleDistanceChange} />
      <FramingPanelConnected framing={framing} onPreset={onPreset} />
      <AdvancedPanelConnected optics={activeOptics} background={background} uiPrefs={uiPrefs} />
      <SavedSettingsPanelConnected
        saved={saved}
        current={currentRow}
        onApply={(row) => {
          optics.setFocalLength(row.focalLength)
          optics.setAperture(row.aperture)
          optics.setDistanceM(row.distanceM)
          setBokeh(row.bokeh)
        }}
      />
      <ResultsPanelConnected derived={activeDerived} imperial={uiPrefs.imperial} bokeh={bokeh} />
    </>
  )
}
