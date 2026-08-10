'use client'

import { useCallback, useState } from 'react'
import type { TeleconverterId } from '@/lib/data/dofSimulator/types'
import { getCameraById } from '@/lib/data/dofSimulator/cameras'
import { getLensById, effectiveMaxApertureAt } from '@/lib/data/dofSimulator/lenses'

export interface OpticsState {
  focalLength: number
  aperture: number
  distanceM: number
  sensorId: string
  cameraId: string | null
  lensId: string | null
  teleconverterId: TeleconverterId
  customCocMm: number | null // advanced override
  backgroundDistanceM: number | null // advanced override (null = scene default)
}

export interface OpticsApi extends OpticsState {
  setFocalLength(v: number): void
  setAperture(v: number): void
  setDistanceM(v: number): void
  setSensorId(v: string): void
  setCameraId(v: string | null): void
  setLensId(v: string | null): void
  setTeleconverterId(v: TeleconverterId): void
  setCustomCocMm(v: number | null): void
  setBackgroundDistanceM(v: number | null): void
}

const DEFAULT_STATE: OpticsState = {
  focalLength: 85,
  aperture: 2.8,
  distanceM: 3,
  sensorId: 'ff',
  cameraId: null,
  lensId: null,
  teleconverterId: 'none',
  customCocMm: null,
  backgroundDistanceM: null,
}

/**
 * Floors `aperture` at the attached lens's max-aperture envelope (widened by
 * the teleconverter's stop loss) for the given `focalLength` -- the same
 * `effectiveMaxApertureAt` useDofDerived uses for its read-only
 * `effectiveMaxAperture` display value, so the two never disagree. No-op
 * without a lens (the envelope is unbounded). Enforced here, in the state
 * layer, so every writer of aperture/focalLength/teleconverterId respects it
 * -- not just LensPanel's slider, which used to be the only place clamping
 * (dof-simulator-rebuild final fix wave, B3).
 */
function clampApertureToLens(
  aperture: number,
  lensId: string | null,
  focalLength: number,
  teleconverterId: TeleconverterId
): number {
  const lens = lensId ? getLensById(lensId) : undefined
  if (!lens) return aperture
  return Math.max(aperture, effectiveMaxApertureAt(lens, focalLength, teleconverterId))
}

export function useOptics(): OpticsApi {
  const [state, setState] = useState<OpticsState>(DEFAULT_STATE)

  const setFocalLength = useCallback((v: number) => {
    setState((prev) => ({
      ...prev,
      focalLength: v,
      aperture: clampApertureToLens(prev.aperture, prev.lensId, v, prev.teleconverterId),
    }))
  }, [])

  const setAperture = useCallback((v: number) => {
    setState((prev) => ({
      ...prev,
      aperture: clampApertureToLens(v, prev.lensId, prev.focalLength, prev.teleconverterId),
    }))
  }, [])

  const setDistanceM = useCallback((v: number) => {
    setState((prev) => ({ ...prev, distanceM: v }))
  }, [])

  const setSensorId = useCallback((v: string) => {
    setState((prev) => ({ ...prev, sensorId: v }))
  }, [])

  const setCameraId = useCallback((v: string | null) => {
    setState((prev) => {
      if (v === null) return { ...prev, cameraId: null }
      const camera = getCameraById(v)
      if (!camera) return { ...prev, cameraId: v }
      return { ...prev, cameraId: v, sensorId: camera.sensorId }
    })
  }, [])

  const setLensId = useCallback((v: string | null) => {
    setState((prev) => {
      if (v === null) return { ...prev, lensId: null }
      const lens = getLensById(v)
      if (!lens) return { ...prev, lensId: v }
      const clampedFl = Math.min(Math.max(prev.focalLength, lens.flMin), lens.flMax)
      // Includes the teleconverter factor (effectiveMaxApertureAt), matching
      // useDofDerived's effectiveMaxAperture -- this used to call the
      // TC-unaware maxApertureAt directly, so a lens picked while a
      // teleconverter was already attached could seed an aperture the
      // envelope didn't actually allow (B3).
      const clampedAperture = clampApertureToLens(prev.aperture, v, clampedFl, prev.teleconverterId)
      return { ...prev, lensId: v, focalLength: clampedFl, aperture: clampedAperture }
    })
  }, [])

  const setTeleconverterId = useCallback((v: TeleconverterId) => {
    setState((prev) => ({
      ...prev,
      teleconverterId: v,
      aperture: clampApertureToLens(prev.aperture, prev.lensId, prev.focalLength, v),
    }))
  }, [])

  const setCustomCocMm = useCallback((v: number | null) => {
    setState((prev) => ({ ...prev, customCocMm: v }))
  }, [])

  const setBackgroundDistanceM = useCallback((v: number | null) => {
    setState((prev) => ({ ...prev, backgroundDistanceM: v }))
  }, [])

  return {
    ...state,
    setFocalLength,
    setAperture,
    setDistanceM,
    setSensorId,
    setCameraId,
    setLensId,
    setTeleconverterId,
    setCustomCocMm,
    setBackgroundDistanceM,
  }
}
