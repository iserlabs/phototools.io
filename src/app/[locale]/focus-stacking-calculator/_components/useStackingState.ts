'use client'

import { useMemo, useState, useCallback } from 'react'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { calcStackingSequence } from '@/lib/math/stacking'
import { calcMacroStack, macroShots } from '@/lib/math/macroStack'
import { getSensor } from '@/lib/data/sensors'
import { useQueryInit, useToolQuerySync } from '@/lib/utils/querySync'
import { PARAM_SCHEMA } from './querySync'

export function useStackingState() {
  const { trackParam } = useToolSession()
  const [mode, setModeRaw] = useState<'distance' | 'macro'>('distance')
  const [focalLength, setFocalLength] = useState(50)
  const [aperture, setAperture] = useState(8)
  const [sensorId, setSensorId] = useState('ff')
  const [nearLimit, setNearLimit] = useState(0.5)
  const [farLimit, setFarLimit] = useState(5)
  const [overlapPct, setOverlapPct] = useState(0.2)
  const [magnification, setMagnification] = useState(1)
  const [depthMm, setDepthMm] = useState(10)
  const [hoveredShot, setHoveredShot] = useState<number | null>(null)

  // These two are the invariant-preserving source of truth for nearLimit <=
  // farLimit: they're used both as the panel's onChange handlers AND as the
  // useQueryInit setters below, so the pair stays valid no matter who sets
  // it or in what order (useQueryInit runs both from a single crafted URL
  // in an unspecified order). Each uses a functional updater for the OTHER
  // field so it always reconciles against whatever that field's queue has
  // accumulated so far, converging to a valid pair regardless of order.
  const onNearLimitChange = useCallback((v: number) => {
    setNearLimit(v)
    // raising near to meet/exceed a finite far limit raises far to match;
    // an infinite far limit is left untouched
    setFarLimit((f) => (isFinite(f) && v >= f ? v : f))
  }, [])

  const onFarLimitChange = useCallback((v: number) => {
    if (!isFinite(v)) {
      setFarLimit(Infinity)
      return
    }
    // far can never be lowered past the physical near floor
    const floor = Math.max(0.1, (focalLength / 1000) * 1.05)
    const farNew = Math.max(v, floor)
    setFarLimit(farNew)
    // lowering far below the current near limit lowers near to match,
    // clamped so it never drops below floor (farNew is already >= floor)
    setNearLimit((n) => Math.min(n, farNew))
  }, [focalLength])

  useQueryInit(PARAM_SCHEMA, {
    mode: setModeRaw,
    fl: setFocalLength,
    f: setAperture,
    s: setSensorId,
    near: onNearLimitChange,
    far: onFarLimitChange,
    overlap: (v: number) => setOverlapPct(v / 100),
    m: setMagnification,
    depth: setDepthMm,
  })
  useToolQuerySync({
    mode, fl: focalLength, f: aperture, s: sensorId,
    near: nearLimit, far: farLimit, overlap: Math.round(overlapPct * 100),
    m: magnification, depth: depthMm,
  }, PARAM_SCHEMA)

  const sensor = getSensor(sensorId)
  const coc = 0.03 / sensor.cropFactor

  const stackingResult = useMemo(
    () => calcStackingSequence({ focalLength, aperture, coc, nearLimit, farLimit, overlapPct }),
    [focalLength, aperture, coc, nearLimit, farLimit, overlapPct],
  )
  const macroResult = useMemo(
    () => calcMacroStack({ magnification, aperture, coc, subjectDepthMm: depthMm, overlapPct }),
    [magnification, aperture, coc, depthMm, overlapPct],
  )
  const macroRows = useMemo(() => macroShots(macroResult), [macroResult])

  const setMode = useCallback((m: 'distance' | 'macro') => {
    trackParam({ param_name: 'mode', param_value: m, input_type: 'toggle' })
    setHoveredShot(null)
    setModeRaw(m)
  }, [trackParam])

  // A single call, so unlike the pair above it can just read the current
  // nearLimit/farLimit straight from the closure (kept fresh via deps) and
  // compute explicit values — no cross-updater coupling to reason about.
  const onFocalLengthChange = useCallback((v: number) => {
    trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' })
    setFocalLength(v)
    // near limit must stay physically focusable: just beyond the lens
    const minNear = (v / 1000) * 1.05
    const newNear = nearLimit < minNear ? minNear : nearLimit
    setNearLimit(newNear)
    // keep the range valid in this same batched render: a near limit raised
    // to meet/exceed a *finite* far limit raises far to match; an infinite
    // far limit is left untouched
    setFarLimit(isFinite(farLimit) && newNear >= farLimit ? newNear : farLimit)
  }, [nearLimit, farLimit, trackParam])

  return {
    mode, setMode,
    focalLength, aperture, sensorId, nearLimit, farLimit, overlapPct, magnification, depthMm,
    onFocalLengthChange,
    onApertureChange: (v: number) => { trackParam({ param_name: 'aperture', param_value: String(v), input_type: 'select' }); setAperture(v) },
    onSensorChange: setSensorId,
    onNearLimitChange,
    onFarLimitChange,
    onOverlapChange: setOverlapPct,
    onMagnificationChange: (v: number) => { trackParam({ param_name: 'magnification', param_value: String(v), input_type: 'slider' }); setMagnification(v) },
    onDepthChange: setDepthMm,
    sensor, coc, stackingResult, macroResult, macroRows,
    hoveredShot, setHoveredShot, trackParam,
  }
}

export type StackingState = ReturnType<typeof useStackingState>
