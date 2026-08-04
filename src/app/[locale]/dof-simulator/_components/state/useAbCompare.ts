'use client'

import { useCallback, useEffect, useState } from 'react'
import { useOptics, type OpticsApi } from './useOptics'

export type AbMode = 'off' | 'wipe' | 'split'

export interface AbApi {
  mode: AbMode
  setMode(m: AbMode): void
  activeSet: 'a' | 'b'
  setActiveSet(v: 'a' | 'b'): void
  dividerPos: number
  setDividerPos(v: number): void
  b: OpticsApi // full second optics slice
}

// B's initial focal length / aperture — deliberately different from A's spec
// defaults (85mm f/2.8) so enabling A/B compare shows two distinguishable
// setups immediately. Mirrors PARAM_SCHEMA's b_fl/b_f defaults (paramSchema.ts).
const B_DEFAULT_FOCAL_LENGTH = 50
const B_DEFAULT_APERTURE = 5.6

export function useAbCompare(): AbApi {
  const [mode, setModeState] = useState<AbMode>('off')
  const [activeSet, setActiveSetState] = useState<'a' | 'b'>('a')
  const [dividerPos, setDividerPosState] = useState(0.5)
  const b = useOptics()

  // useOptics() always boots with the A-set spec defaults; nudge the B slice
  // to its own defaults once on mount. useQueryInit (wired in useDofState,
  // called after this hook) runs its own mount effect afterward and will
  // override these if b_fl/b_f are present in the URL.
  useEffect(() => {
    b.setFocalLength(B_DEFAULT_FOCAL_LENGTH)
    b.setAperture(B_DEFAULT_APERTURE)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [])

  const setMode = useCallback((m: AbMode) => setModeState(m), [])
  const setActiveSet = useCallback((v: 'a' | 'b') => setActiveSetState(v), [])
  const setDividerPos = useCallback((v: number) => {
    setDividerPosState(Math.min(Math.max(v, 0.1), 0.9))
  }, [])

  return { mode, setMode, activeSet, setActiveSet, dividerPos, setDividerPos, b }
}
