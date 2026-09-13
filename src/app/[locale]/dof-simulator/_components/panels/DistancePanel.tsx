'use client'

import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { DraftNumberInput } from '@/components/shared/DraftNumberInput'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { toSliderPos, fromSliderPos, SLIDER_STEPS } from './logSlider'
import { getLensById } from '@/lib/data/dofSimulator/lenses'
import { formatDistance } from '../state/formatters'
import { DIST_MIN, DIST_MAX } from '../state/distanceDomain'
import type { OpticsApi } from '../state/useOptics'
import type { DofDerived } from '../state/useDofDerived'
import type { UiPrefsApi } from '../state/useUiPrefs'
import type { DofTooltips } from '../state/useDofTooltips'
import styles from './controls.module.css'

// Presentational — see FramingPanel.tsx for the labels-prop pattern.
export interface DistanceLabels {
  distance: string
  minFocusWarning(value: string): string
  distanceUnit: string
}

const DEFAULT_LABELS: DistanceLabels = {
  distance: 'Distance',
  minFocusWarning: (value) => `Below minimum focus distance (${value})`,
  distanceUnit: 'm',
}

interface DistancePanelProps {
  optics: OpticsApi
  derived: DofDerived
  uiPrefs: UiPrefsApi
  onDistanceChange(v: number): void
  labels?: DistanceLabels
  tooltips?: DofTooltips
}

export function DistancePanel({ optics, derived, uiPrefs, onDistanceChange, labels = DEFAULT_LABELS, tooltips }: DistancePanelProps) {
  const pos = toSliderPos(optics.distanceM, DIST_MIN, DIST_MAX)
  const formatted = formatDistance(optics.distanceM, uiPrefs.imperial, labels.distanceUnit)

  const lens = optics.lensId ? getLensById(optics.lensId) : undefined

  return (
    <ControlPanel title={labels.distance}>
      <div className={cp.fieldRow}>
        <span className={cp.fieldLabel}>
          {labels.distance}
          {tooltips?.subjectDistance && <InfoTooltip tooltip={tooltips.subjectDistance} />}
        </span>
        {/* Draft-tolerant so a sub-metre distance can be typed: a plain
            controlled input clamps the leading "0" to DIST_MIN and React
            snaps the field back before the decimals arrive. */}
        <DraftNumberInput
          className={cp.input}
          value={Number(optics.distanceM.toFixed(2))}
          min={DIST_MIN}
          max={DIST_MAX}
          step={0.01}
          onChange={onDistanceChange}
          aria-label={labels.distance}
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
          {labels.minFocusWarning(formatDistance(lens.minFocusM, uiPrefs.imperial, labels.distanceUnit))}
        </div>
      )}
    </ControlPanel>
  )
}
