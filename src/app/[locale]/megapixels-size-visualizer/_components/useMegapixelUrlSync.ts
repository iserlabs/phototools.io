'use client'

import { useMemo } from 'react'
import {
  strParam, idSetParam, useToolQuerySync, useQueryInit,
} from '@/lib/utils/querySync'
import { DEFAULT_VISIBLE_MP_IDS } from '@/lib/data/megapixelVisualizer'
import { ASPECT_RATIOS, DEFAULT_ASPECT_ID } from '@/lib/data/aspectRatios'
import type { DisplayMode } from './megapixelTypes'
import type { ViewingDistance, BitDepth } from '@/lib/math/megapixel'

type SyncableState = {
  visible: Set<string>
  mode: DisplayMode
  aspectId: string
  units: 'metric' | 'imperial'
  viewingDistance: ViewingDistance
  bitDepth: BitDepth
}

type Setters = {
  setVisible: (v: Set<string>) => void
  setMode: (m: DisplayMode) => void
  setAspectId: (a: string) => void
  setUnits: (u: 'metric' | 'imperial') => void
  setViewingDistance: (v: ViewingDistance) => void
  setBitDepth: (b: BitDepth) => void
}

export function useMegapixelUrlSync(state: SyncableState, setters: Setters) {
  const allAspectIds = useMemo(() => [...ASPECT_RATIOS.map(a => a.id), 'custom'], [])

  const schema = useMemo(() => ({
    show: idSetParam(DEFAULT_VISIBLE_MP_IDS),
    mode: strParam<DisplayMode>('overlay', ['overlay', 'side-by-side']),
    aspect: strParam(DEFAULT_ASPECT_ID, allAspectIds as string[]),
    units: strParam<'metric' | 'imperial'>(state.units, ['metric', 'imperial']),
    dist: strParam<ViewingDistance>('arms', ['arms', 'near', 'far']),
    depth: strParam<BitDepth>('raw14', ['jpeg8', 'raw14', 'tiff16']),
  }), [allAspectIds, state.units])

  const hydrated = useQueryInit(schema, {
    show: setters.setVisible,
    mode: setters.setMode,
    aspect: setters.setAspectId,
    units: setters.setUnits,
    dist: setters.setViewingDistance,
    depth: setters.setBitDepth,
  })

  const stateForSync = {
    show: state.visible,
    mode: state.mode,
    aspect: state.aspectId,
    units: state.units,
    dist: state.viewingDistance,
    depth: state.bitDepth,
  }
  useToolQuerySync(stateForSync, schema)

  return hydrated
}
