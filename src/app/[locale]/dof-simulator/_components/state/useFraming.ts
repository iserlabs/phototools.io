'use client'

import { useCallback, useState } from 'react'
import type { FramingPresetDef } from '@/lib/data/dofSimulator/types'

export interface FramingApi {
  activePreset: FramingPresetDef['key'] | null
  lockFov: boolean
  lockedFrameHeightMm: number | null
  setActivePreset(v: FramingPresetDef['key'] | null): void
  setLockFov(v: boolean): void
  setLockedFrameHeightMm(v: number | null): void
}

export function useFraming(): FramingApi {
  const [activePreset, setActivePreset] = useState<FramingPresetDef['key'] | null>(null)
  const [lockFov, setLockFov] = useState<boolean>(false)
  const [lockedFrameHeightMm, setLockedFrameHeightMm] = useState<number | null>(null)

  return {
    activePreset,
    lockFov,
    lockedFrameHeightMm,
    setActivePreset: useCallback((v: FramingPresetDef['key'] | null) => setActivePreset(v), []),
    setLockFov: useCallback((v: boolean) => setLockFov(v), []),
    setLockedFrameHeightMm: useCallback((v: number | null) => setLockedFrameHeightMm(v), []),
  }
}
