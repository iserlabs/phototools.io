'use client'

import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { SearchCombobox } from './SearchCombobox'
import { toSliderPos, fromSliderPos, SLIDER_STEPS } from './logSlider'
import { DOF_LENSES, getLensById } from '@/lib/data/dofSimulator/lenses'
import { TELECONVERTERS } from '@/lib/data/dofSimulator/teleconverters'
import { APERTURES_THIRD_STOP } from '@/lib/data/camera'
import { snapToThirdStop, formatAperture } from '@/lib/math/aperture'
import { formatMm } from '../state/formatters'
import type { DofLens, TeleconverterId } from '@/lib/data/dofSimulator/types'
import type { OpticsApi } from '../state/useOptics'
import type { DofDerived } from '../state/useDofDerived'
import type { UiPrefsApi } from '../state/useUiPrefs'

const FL_MIN = 8
const FL_MAX = 1200
const AP_MIN = APERTURES_THIRD_STOP[0]
const AP_MAX = APERTURES_THIRD_STOP[APERTURES_THIRD_STOP.length - 1]

// Presentational — see FramingPanel.tsx for the labels-prop pattern.
export interface LensLabels {
  lens: string
  focalLength: string
  aperture: string
  teleconverter: string
  teleconverterNone: string
  searchPlaceholder: string
  clear: string
}

const DEFAULT_LABELS: LensLabels = {
  lens: 'Lens',
  focalLength: 'Focal Length',
  aperture: 'Aperture',
  teleconverter: 'Teleconverter',
  teleconverterNone: 'None',
  searchPlaceholder: 'Search lenses...',
  clear: 'Clear',
}

const lensLabel = (l: DofLens) => `${l.brand} ${l.model}`
const lensGroup = (l: DofLens) => l.brand

interface LensPanelProps {
  optics: OpticsApi
  derived: DofDerived
  uiPrefs: UiPrefsApi
  onFocalLengthChange(v: number): void
  labels?: LensLabels
}

export function LensPanel({ optics, derived, uiPrefs, onFocalLengthChange, labels = DEFAULT_LABELS }: LensPanelProps) {
  const lens = optics.lensId ? getLensById(optics.lensId) : undefined

  const flMin = lens ? lens.flMin : FL_MIN
  const flMax = lens ? lens.flMax : FL_MAX
  const flPos = toSliderPos(optics.focalLength, flMin, flMax)

  // derived.effectiveMaxAperture already folds in the teleconverter's stop
  // loss (maxApertureAt(lens, fl) * tc.flFactor) — reuse it rather than
  // recomputing the lens-only bound and missing the TC correction.
  const apMin = derived.effectiveMaxAperture ?? AP_MIN
  const apPos = toSliderPos(Math.max(optics.aperture, apMin), apMin, AP_MAX)

  return (
    <ControlPanel title={labels.lens}>
      <SearchCombobox
        items={DOF_LENSES}
        groupBy={lensGroup}
        label={lensLabel}
        value={optics.lensId}
        onChange={optics.setLensId}
        placeholder={labels.searchPlaceholder}
        clearLabel={labels.clear}
      />

      <div>
        <div className={cp.fieldRow}>
          <span className={cp.fieldLabel}>{labels.focalLength}</span>
          <span className={cp.fieldValue}>{formatMm(optics.focalLength)}</span>
        </div>
        <div className={cp.sliderWrap}>
          <input
            type="range"
            className={cp.slider}
            min={0}
            max={SLIDER_STEPS}
            step={1}
            value={flPos}
            onChange={(e) => onFocalLengthChange(fromSliderPos(Number(e.target.value), flMin, flMax))}
            aria-label={`${labels.focalLength}: ${formatMm(optics.focalLength)}`}
          />
        </div>
      </div>

      <div>
        <div className={cp.fieldRow}>
          <span className={cp.fieldLabel}>{labels.aperture}</span>
          <span className={cp.fieldValue}>{formatAperture(optics.aperture)}</span>
        </div>
        <div className={cp.sliderWrap}>
          <input
            type="range"
            className={cp.slider}
            min={0}
            max={SLIDER_STEPS}
            step={1}
            value={apPos}
            onChange={(e) => {
              const raw = fromSliderPos(Number(e.target.value), apMin, AP_MAX)
              optics.setAperture(snapToThirdStop(Math.max(raw, apMin)))
            }}
            aria-label={`${labels.aperture}: ${formatAperture(optics.aperture)}`}
          />
        </div>
      </div>

      {uiPrefs.advanced && (
        <div className={cp.fieldRow}>
          <span className={cp.fieldLabel}>{labels.teleconverter}</span>
          <select
            className={cp.select}
            value={optics.teleconverterId}
            onChange={(e) => optics.setTeleconverterId(e.target.value as TeleconverterId)}
          >
            {TELECONVERTERS.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.id === 'none' ? labels.teleconverterNone : `${tc.flFactor}x`}
              </option>
            ))}
          </select>
        </div>
      )}
    </ControlPanel>
  )
}
