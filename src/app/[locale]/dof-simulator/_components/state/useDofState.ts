'use client'

import { useCallback, useState } from 'react'
import { useQueryInit, useToolQuerySync } from '@/lib/utils/querySync'
import { useOptics, type OpticsApi } from './useOptics'
import { useAppearance, type AppearanceApi } from './useAppearance'
import { useFraming, type FramingApi } from './useFraming'
import { useUiPrefs, type UiPrefsApi } from './useUiPrefs'
import { useAbCompare, type AbApi } from './useAbCompare'
import { useSavedSettings, type SavedSettingsApi } from './useSavedSettings'
import { useDofDerived, type DofDerived } from './useDofDerived'
import { applyFramingPreset as applyFramingPresetAction, changeFocalLength as changeFocalLengthAction, changeDistance as changeDistanceAction } from './framingActions'
import { PARAM_SCHEMA } from './paramSchema'
import { getSubjectById, DOF_SUBJECTS } from '@/lib/data/dofSimulator/models'
import { getBackgroundById, DOF_BACKGROUNDS } from '@/lib/data/dofSimulator/backgrounds'
import type { BokehShapeId, FramingPresetDef } from '@/lib/data/dofSimulator/types'

export interface DofStateApi {
  optics: OpticsApi
  appearance: AppearanceApi
  framing: FramingApi
  uiPrefs: UiPrefsApi
  ab: AbApi
  saved: SavedSettingsApi
  derived: DofDerived
  derivedB: DofDerived | null // null when ab off
  bokeh: BokehShapeId
  setBokeh(v: BokehShapeId): void
  changeFocalLength(v: number): { clamped: boolean }
  changeDistance(v: number): { clamped: boolean }
  applyFramingPreset(key: FramingPresetDef['key']): void
  reset(): void
}

/** The state facade DofSimulator.tsx consumes — composes every control slice,
 *  derives read-only DOF metrics for both A and B sets, wires URL query sync,
 *  and hosts the framing-lock-aware focal-length/distance/preset actions. */
export function useDofState(): DofStateApi {
  const optics = useOptics()
  const appearance = useAppearance()
  const framing = useFraming()
  const uiPrefs = useUiPrefs()
  const ab = useAbCompare()
  const saved = useSavedSettings()
  const [bokeh, setBokehState] = useState<BokehShapeId>('disc')
  const setBokeh = useCallback((v: BokehShapeId) => setBokehState(v), [])

  const subject = getSubjectById(appearance.subjectId)
  const background = getBackgroundById(appearance.backgroundId)

  const derived = useDofDerived({ optics, subject, background, orientation: appearance.orientation, bokeh })
  const derivedBRaw = useDofDerived({ optics: ab.b, subject, background, orientation: appearance.orientation, bokeh })
  const derivedB = ab.mode === 'off' ? null : derivedBRaw

  const changeFocalLength = useCallback(
    (v: number) => changeFocalLengthAction(v, optics, framing, derived.sensorHMm),
    [optics, framing, derived.sensorHMm]
  )
  const changeDistance = useCallback(
    (v: number) => changeDistanceAction(v, optics, framing, derived.sensorHMm),
    [optics, framing, derived.sensorHMm]
  )
  const applyFramingPreset = useCallback(
    (key: FramingPresetDef['key']) => applyFramingPresetAction(key, optics, framing, derived.effectiveFl, derived.sensorHMm),
    [optics, framing, derived.effectiveFl, derived.sensorHMm]
  )

  useQueryInit(PARAM_SCHEMA, {
    fl: optics.setFocalLength,
    f: optics.setAperture,
    d: optics.setDistanceM,
    s: optics.setSensorId,
    cam: optics.setCameraId,
    lens: optics.setLensId,
    tc: optics.setTeleconverterId,
    subj: appearance.setSubjectId,
    bg: appearance.setBackgroundId,
    orient: appearance.setOrientation,
    bokeh: setBokeh,
    ab: ab.setMode,
    b_fl: ab.b.setFocalLength,
    b_f: ab.b.setAperture,
    b_d: ab.b.setDistanceM,
    b_s: ab.b.setSensorId,
  })

  useToolQuerySync(
    {
      fl: optics.focalLength,
      f: optics.aperture,
      d: optics.distanceM,
      s: optics.sensorId,
      cam: optics.cameraId,
      lens: optics.lensId,
      tc: optics.teleconverterId,
      subj: appearance.subjectId,
      bg: appearance.backgroundId,
      orient: appearance.orientation,
      bokeh,
      ab: ab.mode,
      b_fl: ab.b.focalLength,
      b_f: ab.b.aperture,
      b_d: ab.b.distanceM,
      b_s: ab.b.sensorId,
    },
    PARAM_SCHEMA
  )

  const reset = useCallback(() => {
    optics.setFocalLength(85)
    optics.setAperture(2.8)
    optics.setDistanceM(3)
    optics.setSensorId('ff')
    optics.setCameraId(null)
    optics.setLensId(null)
    optics.setTeleconverterId('none')
    optics.setCustomCocMm(null)
    optics.setBackgroundDistanceM(null)

    appearance.setSubjectId(DOF_SUBJECTS[0].id)
    appearance.setBackgroundId(DOF_BACKGROUNDS[0].id)
    appearance.setOrientation('landscape')

    framing.setActivePreset(null)
    framing.setLockFov(false)
    framing.setLockedFrameHeightMm(null)

    uiPrefs.setAdvanced(false)
    uiPrefs.setImperial(false)

    ab.setMode('off')
    ab.setActiveSet('a')
    ab.setDividerPos(0.5)
    ab.b.setFocalLength(50)
    ab.b.setAperture(5.6)
    ab.b.setDistanceM(3)
    ab.b.setSensorId('ff')
    ab.b.setCameraId(null)
    ab.b.setLensId(null)
    ab.b.setTeleconverterId('none')
    ab.b.setCustomCocMm(null)
    ab.b.setBackgroundDistanceM(null)

    setBokeh('disc')

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [optics, appearance, framing, uiPrefs, ab, setBokeh])

  return {
    optics, appearance, framing, uiPrefs, ab, saved,
    derived, derivedB, bokeh, setBokeh,
    changeFocalLength, changeDistance, applyFramingPreset, reset,
  }
}
