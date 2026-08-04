'use client'

import { useCallback, useState } from 'react'
import type { TeleconverterId } from '@/lib/data/dofSimulator/types'
import { getCameraById } from '@/lib/data/dofSimulator/cameras'
import { getLensById, maxApertureAt } from '@/lib/data/dofSimulator/lenses'

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

export function useOptics(): OpticsApi {
  const [state, setState] = useState<OpticsState>(DEFAULT_STATE)

  const setFocalLength = useCallback((v: number) => {
    setState((prev) => ({ ...prev, focalLength: v }))
  }, [])

  const setAperture = useCallback((v: number) => {
    setState((prev) => ({ ...prev, aperture: v }))
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
      const minAperture = maxApertureAt(lens, clampedFl)
      const clampedAperture = Math.max(prev.aperture, minAperture)
      return { ...prev, lensId: v, focalLength: clampedFl, aperture: clampedAperture }
    })
  }, [])

  const setTeleconverterId = useCallback((v: TeleconverterId) => {
    setState((prev) => ({ ...prev, teleconverterId: v }))
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
