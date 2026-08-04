'use client'

import { useMemo } from 'react'
import { calcDoF, calcDefocusBlur, calcEquivalentSettings, calcAiryDisk } from '@/lib/math/dof'
import { figureFraction, selectCropLevel, type CropLevel } from '@/lib/math/projection'
import { getDofSensor } from '@/lib/data/dofSimulator/sensors'
import { getLensById, maxApertureAt } from '@/lib/data/dofSimulator/lenses'
import { TELECONVERTERS } from '@/lib/data/dofSimulator/teleconverters'
import type { DofSubject, DofBackground, BokehShapeId } from '@/lib/data/dofSimulator/types'
import type { SensorPreset } from '@/lib/types'
import type { OpticsState } from './useOptics'

export interface DerivedInput {
  optics: OpticsState
  subject: DofSubject
  background: DofBackground
  orientation: 'landscape' | 'portrait'
  bokeh: BokehShapeId
}

export interface DofDerived {
  sensor: SensorPreset
  sensorWMm: number
  sensorHMm: number
  effectiveFl: number
  effectiveMaxAperture: number | null
  cocMm: number
  dof: ReturnType<typeof calcDoF>
  backgroundBlurMm: number
  backgroundBlurPct: number
  figureFrac: number
  cropLevel: CropLevel
  equivalent: ReturnType<typeof calcEquivalentSettings> | null
  isDiffractionLimited: boolean
  belowMinFocus: boolean
  inFrontM: number
  behindM: number
  inFrontPct: number
}

/**
 * Pure derived-values engine — every read-only number the viewport, results
 * panel, and ruler need, computed from the raw control-slice state. No React
 * here; `useDofDerived` below is the memoized wrapper components consume.
 */
export function computeDerived(input: DerivedInput): DofDerived {
  const { optics, subject, background, orientation } = input

  const sensor = getDofSensor(optics.sensorId)
  const sensorWMm = (orientation === 'landscape' ? sensor.w : sensor.h) ?? 36
  const sensorHMm = (orientation === 'landscape' ? sensor.h : sensor.w) ?? 24

  const tc = TELECONVERTERS.find((t) => t.id === optics.teleconverterId) ?? TELECONVERTERS[0]
  const effectiveFl = optics.focalLength * tc.flFactor

  const lens = optics.lensId ? getLensById(optics.lensId) : undefined
  // TC stops applied via the same flFactor used for effectiveFl: at a fixed entrance
  // pupil diameter, the f-number scales with the effective focal length increase.
  const effectiveMaxAperture = lens ? maxApertureAt(lens, optics.focalLength) * tc.flFactor : null

  const cocMm = optics.customCocMm ?? 0.03 / sensor.cropFactor

  const dof = calcDoF({ focalLength: effectiveFl, aperture: optics.aperture, distance: optics.distanceM, coc: cocMm })

  const bgDistanceM = optics.backgroundDistanceM ?? background.distanceM
  const backgroundBlurMm = calcDefocusBlur({
    focalLength: effectiveFl,
    aperture: optics.aperture,
    focusDistance: optics.distanceM,
    targetDistance: bgDistanceM,
  })
  const backgroundBlurPct = sensorWMm > 0 ? (backgroundBlurMm / sensorWMm) * 100 : 0

  const figureFrac = figureFraction(subject.heightM, optics.distanceM, effectiveFl, sensorHMm)
  const cropLevel = selectCropLevel(figureFrac)

  const equivalent =
    sensor.cropFactor === 1
      ? null
      : calcEquivalentSettings({
          focalLength: effectiveFl,
          aperture: optics.aperture,
          distance: optics.distanceM,
          sourceCrop: sensor.cropFactor,
          targetCrop: 1,
        })

  const isDiffractionLimited = calcAiryDisk(optics.aperture) > cocMm

  const belowMinFocus = lens != null && lens.minFocusM != null && lens.minFocusM > optics.distanceM

  // DOF split around the subject. The "behind" span is capped at the background's
  // distance so it never claims sharpness past the scene object actually drawn
  // there — except when focus sits at/beyond the hyperfocal distance, where far
  // focus (and thus total DoF) is genuinely infinite and reporting that truth
  // (rather than an artificial background-distance cap) is correct.
  const inFrontM = optics.distanceM - dof.nearFocus
  const behindM =
    dof.totalDoF === Infinity ? dof.totalDoF - inFrontM : Math.min(dof.farFocus, bgDistanceM) - optics.distanceM
  const inFrontPct = inFrontM + behindM > 0 ? (inFrontM / (inFrontM + behindM)) * 100 : 0

  return {
    sensor,
    sensorWMm,
    sensorHMm,
    effectiveFl,
    effectiveMaxAperture,
    cocMm,
    dof,
    backgroundBlurMm,
    backgroundBlurPct,
    figureFrac,
    cropLevel,
    equivalent,
    isDiffractionLimited,
    belowMinFocus,
    inFrontM,
    behindM,
    inFrontPct,
  }
}

export function useDofDerived(input: DerivedInput): DofDerived {
  const { optics, subject, background, orientation, bokeh } = input
  return useMemo(
    () => computeDerived({ optics, subject, background, orientation, bokeh }),
    [optics, subject, background, orientation, bokeh]
  )
}
