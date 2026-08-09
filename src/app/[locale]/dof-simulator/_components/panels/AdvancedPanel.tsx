'use client'

import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { toSliderPos, fromSliderPos, SLIDER_STEPS } from './logSlider'
import { getDofSensor } from '@/lib/data/dofSimulator/sensors'
import type { OpticsApi } from '../state/useOptics'
import type { DofBackground } from '@/lib/data/dofSimulator/types'
import type { UiPrefsApi } from '../state/useUiPrefs'
import styles from './controls.module.css'

const BG_DIST_MIN = 0.3
const BG_DIST_MAX = 50

/**
 * Seed value for the custom-CoC override. Mirrors useDofDerived's own default
 * CoC formula (0.03mm 35mm-equivalent baseline / sensor crop factor) so
 * checking the box doesn't jump the effective CoC on non-FF sensors (e.g. a
 * flat 0.03mm on APS-C would nearly double the derived-engine's ~0.0196mm
 * default, producing a visible DOF discontinuity). Rounded to 4 decimals to
 * match how DofResultsPanel displays CoC (`coc.toFixed(4)`).
 */
function defaultCocMm(sensorId: string): number {
  const cropFactor = getDofSensor(sensorId).cropFactor
  return Math.round((0.03 / cropFactor) * 10000) / 10000
}

// Presentational — see FramingPanel.tsx for the labels-prop pattern.
export interface AdvancedLabels {
  advanced: string
  customCoc: string
  backgroundDistance: string
}

const DEFAULT_LABELS: AdvancedLabels = {
  advanced: 'Advanced',
  customCoc: 'Custom CoC',
  backgroundDistance: 'Background Distance',
}

interface AdvancedPanelProps {
  optics: OpticsApi
  background: DofBackground
  uiPrefs: UiPrefsApi
  labels?: AdvancedLabels
}

export function AdvancedPanel({ optics, background, uiPrefs, labels = DEFAULT_LABELS }: AdvancedPanelProps) {
  if (!uiPrefs.advanced) return null

  const cocOn = optics.customCocMm !== null
  const bgDistOn = optics.backgroundDistanceM !== null
  const bgDistValue = optics.backgroundDistanceM ?? background.distanceM
  const bgDistPos = toSliderPos(bgDistValue, BG_DIST_MIN, BG_DIST_MAX)
  const cocSeed = defaultCocMm(optics.sensorId)

  return (
    <ControlPanel title={labels.advanced}>
      <div className={styles.overrideField}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={cocOn}
            onChange={(e) => optics.setCustomCocMm(e.target.checked ? cocSeed : null)}
          />
          {labels.customCoc}
        </label>
        {cocOn && (
          <input
            type="number"
            className={cp.input}
            value={optics.customCocMm ?? cocSeed}
            min={0.005}
            max={0.2}
            step={0.001}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!isNaN(v)) optics.setCustomCocMm(v)
            }}
          />
        )}
      </div>

      <div className={styles.overrideField}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={bgDistOn}
            onChange={(e) => optics.setBackgroundDistanceM(e.target.checked ? background.distanceM : null)}
          />
          {labels.backgroundDistance}
        </label>
        {bgDistOn && (
          <div className={cp.sliderWrap}>
            <input
              type="range"
              className={cp.slider}
              min={0}
              max={SLIDER_STEPS}
              step={1}
              value={bgDistPos}
              onChange={(e) => optics.setBackgroundDistanceM(fromSliderPos(Number(e.target.value), BG_DIST_MIN, BG_DIST_MAX))}
              aria-label={labels.backgroundDistance}
            />
          </div>
        )}
      </div>
    </ControlPanel>
  )
}
