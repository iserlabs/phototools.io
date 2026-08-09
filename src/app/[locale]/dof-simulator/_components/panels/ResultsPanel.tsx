'use client'

import type { ReactNode } from 'react'
import { ControlPanel, controlPanelStyles as cp } from '@/components/shared/ControlPanel'
import { ngonVertices, type BokehShapeId } from '@/lib/math/bokehKernel'
import { formatAperture } from '@/lib/math/aperture'
import { formatDistance, formatMm, formatPreciseMm } from '../state/formatters'
import type { DofDerived } from '../state/useDofDerived'
import panelStyles from './panels.module.css'
import controlStyles from './controls.module.css'

// Presentational — takes pre-translated strings via the optional `labels`
// prop (same pattern as LensPanel.tsx / DistancePanel.tsx) so this component,
// and the brief's fixed test which renders it with no NextIntlClientProvider,
// stay provider-free. `equivalentLink` defaults to a no-op wrapper (plain
// text) rather than a real <a>: next-intl's Link (used by
// ResultsPanelConnected) calls useLocale(), which throws outside a
// NextIntlClientProvider — see ResultsPanelConnected.tsx.
export interface ResultsLabels {
  results: string
  totalDoF: string
  nearFocus: string
  farFocus: string
  inFront: string
  behind: string
  hyperfocal: string
  coc: string
  backgroundBlur: string
  equivalentSettings: string
  equivalentLink(children: ReactNode): ReactNode
  effectiveFocalLength: string
  fullFrameEquivalentFocalLength: string
  diffractionWarning: string
  belowMinFocusWarning: string
}

const DEFAULT_LABELS: ResultsLabels = {
  results: 'Results',
  totalDoF: 'Total Depth of Field',
  nearFocus: 'Near Focus',
  farFocus: 'Far Focus',
  inFront: 'In Front',
  behind: 'Behind',
  hyperfocal: 'Hyperfocal',
  coc: 'Circle of Confusion',
  backgroundBlur: 'Background Blur',
  equivalentSettings: 'Equivalent on Full Frame',
  equivalentLink: (children) => children,
  effectiveFocalLength: 'Effective Focal Length',
  fullFrameEquivalentFocalLength: '35mm Equivalent Focal Length',
  diffractionWarning: 'Diffraction softening may reduce sharpness at this aperture',
  belowMinFocusWarning: "Focus distance is below this lens's minimum focus distance",
}

// Phone main-camera presets (see lib/data/dofSimulator/sensors.ts) plus any
// sensor small enough to carry an equally extreme crop factor.
const PHONE_SENSOR_IDS = new Set(['iphone16pro', 'pixel9pro'])

function isPhoneSensor(sensor: DofDerived['sensor']): boolean {
  return PHONE_SENSOR_IDS.has(sensor.id) || sensor.cropFactor > 3
}

const GLYPH_CENTER = 7
const GLYPH_RADIUS = 6

/** Tiny decorative preview of the active aperture-blade shape, echoing the
 * corner preview the viewport draws (BokehInset.tsx) next to the mm/% blur
 * readout it corresponds to. Purely visual (aria-hidden) — no i18n text. */
function BokehGlyph({ shape }: { shape: BokehShapeId }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className={panelStyles.bokehGlyph}>
      {shape === 'disc' || shape === 'cata' ? (
        <>
          <circle cx={GLYPH_CENTER} cy={GLYPH_CENTER} r={GLYPH_RADIUS} />
          {shape === 'cata' && (
            <circle cx={GLYPH_CENTER} cy={GLYPH_CENTER} r={GLYPH_RADIUS / 2} className={panelStyles.bokehGlyphHole} />
          )}
        </>
      ) : (
        <polygon
          points={ngonVertices(Number(shape.slice(5)))
            .map((v) => `${GLYPH_CENTER + v.x * GLYPH_RADIUS},${GLYPH_CENTER - v.y * GLYPH_RADIUS}`)
            .join(' ')}
        />
      )}
    </svg>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={cp.fieldRow}>
      <dt className={cp.fieldLabel}>{label}</dt>
      <dd className={cp.fieldValue}>{value}</dd>
    </div>
  )
}

interface ResultsPanelProps {
  derived: DofDerived
  imperial: boolean
  bokeh: BokehShapeId
  labels?: ResultsLabels
}

export function ResultsPanel({ derived, imperial, bokeh, labels = DEFAULT_LABELS }: ResultsPanelProps) {
  const behindPct = 100 - derived.inFrontPct
  const eq = derived.equivalent
  const equivalentText = eq
    ? `${formatMm(eq.equivalentFL)} ${formatAperture(eq.equivalentAperture)} @ ${formatDistance(eq.equivalentDistance, imperial)}`
    : ''

  return (
    <ControlPanel title={labels.results}>
      <dl className={panelStyles.resultsList}>
        <Row label={labels.totalDoF} value={formatDistance(derived.dof.totalDoF, imperial)} />
        <Row label={labels.nearFocus} value={formatDistance(derived.dof.nearFocus, imperial)} />
        <Row label={labels.farFocus} value={formatDistance(derived.dof.farFocus, imperial)} />
        <Row
          label={labels.inFront}
          value={`${formatDistance(derived.inFrontM, imperial)} (${Math.round(derived.inFrontPct)}%)`}
        />
        <Row label={labels.behind} value={`${formatDistance(derived.behindM, imperial)} (${Math.round(behindPct)}%)`} />
        <Row label={labels.hyperfocal} value={formatDistance(derived.dof.hyperfocal, imperial)} />
        <Row label={labels.coc} value={formatPreciseMm(derived.cocMm)} />
        <Row
          label={labels.backgroundBlur}
          value={
            <>
              <BokehGlyph shape={bokeh} />
              {formatPreciseMm(derived.backgroundBlurMm)} ({derived.backgroundBlurPct.toFixed(1)}%)
            </>
          }
        />

        {eq && <Row label={labels.equivalentSettings} value={labels.equivalentLink(equivalentText)} />}
        {derived.teleconverterActive && (
          <Row label={labels.effectiveFocalLength} value={formatMm(derived.effectiveFl)} />
        )}
        {eq && isPhoneSensor(derived.sensor) && (
          <Row label={labels.fullFrameEquivalentFocalLength} value={formatMm(eq.equivalentFL)} />
        )}
      </dl>

      {derived.isDiffractionLimited && (
        <div className={controlStyles.warningChip}>{labels.diffractionWarning}</div>
      )}
      {derived.belowMinFocus && (
        <div className={controlStyles.warningChip}>{labels.belowMinFocusWarning}</div>
      )}
    </ControlPanel>
  )
}
