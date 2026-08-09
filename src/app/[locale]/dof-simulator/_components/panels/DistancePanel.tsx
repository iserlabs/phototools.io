'use client'

import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { toSliderPos, fromSliderPos, SLIDER_STEPS } from './logSlider'
import { getLensById } from '@/lib/data/dofSimulator/lenses'
import { formatDistance } from '../state/formatters'
import type { OpticsApi } from '../state/useOptics'
import type { DofDerived } from '../state/useDofDerived'
import type { UiPrefsApi } from '../state/useUiPrefs'
import styles from './controls.module.css'

const DIST_MIN = 0.3
const DIST_MAX = 50

// Presentational — see FramingPanel.tsx for the labels-prop pattern.
export interface DistanceLabels {
  distance: string
  minFocusWarning(value: string): string
}

const DEFAULT_LABELS: DistanceLabels = {
  distance: 'Distance',
  minFocusWarning: (value) => `Below minimum focus distance (${value})`,
}

interface DistancePanelProps {
  optics: OpticsApi
  derived: DofDerived
  uiPrefs: UiPrefsApi
  onDistanceChange(v: number): void
  labels?: DistanceLabels
}

export function DistancePanel({ optics, derived, uiPrefs, onDistanceChange, labels = DEFAULT_LABELS }: DistancePanelProps) {
  const pos = toSliderPos(optics.distanceM, DIST_MIN, DIST_MAX)
  const formatted = formatDistance(optics.distanceM, uiPrefs.imperial)

  const lens = optics.lensId ? getLensById(optics.lensId) : undefined

  return (
    <ControlPanel title={labels.distance}>
      <div className={cp.fieldRow}>
        <span className={cp.fieldLabel}>{labels.distance}</span>
        <input
          type="number"
          className={cp.input}
          value={Number(optics.distanceM.toFixed(2))}
          min={DIST_MIN}
          max={DIST_MAX}
          step={0.01}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (!isNaN(v)) onDistanceChange(v)
          }}
        />
      </div>
      <div className={cp.sliderWrap}>
        <input
          type="range"
          className={cp.slider}
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={pos}
          onChange={(e) => onDistanceChange(fromSliderPos(Number(e.target.value), DIST_MIN, DIST_MAX))}
          aria-label={`${labels.distance}: ${formatted}`}
        />
      </div>
      <div className={styles.readoutRow}>
        <span>{formatted}</span>
      </div>

      {derived.belowMinFocus && lens?.minFocusM != null && (
        <div className={styles.warningChip}>
          {labels.minFocusWarning(formatDistance(lens.minFocusM, uiPrefs.imperial))}
        </div>
      )}
    </ControlPanel>
  )
}
