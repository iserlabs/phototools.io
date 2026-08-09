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

  useQueryInit(PARAM_SCHEMA, {
    mode: setModeRaw,
    fl: setFocalLength,
    f: setAperture,
    s: setSensorId,
    near: setNearLimit,
    far: setFarLimit,
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

  const onFocalLengthChange = useCallback((v: number) => {
    trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' })
    setFocalLength(v)
    // near limit must stay physically focusable: just beyond the lens
    const minNear = (v / 1000) * 1.05
    let newNear = minNear
    setNearLimit((n) => {
      newNear = n < minNear ? minNear : n
      return newNear
    })
    // Keep the depth range valid in this same batched render: a near limit
    // raised above (or equal to) a *finite* far limit would otherwise paint
    // a negative totalDepth for one frame. Leave an infinite far limit
    // alone. (Relies on nearLimit's useState above being declared before
    // farLimit's, so its updater runs first and sets `newNear` before this
    // one reads it — both updaters are applied during the same render.)
    setFarLimit((f) => (isFinite(f) && newNear >= f ? newNear : f))
  }, [trackParam])

  return {
    mode, setMode,
    focalLength, aperture, sensorId, nearLimit, farLimit, overlapPct, magnification, depthMm,
    onFocalLengthChange,
    onApertureChange: (v: number) => { trackParam({ param_name: 'aperture', param_value: String(v), input_type: 'select' }); setAperture(v) },
    onSensorChange: setSensorId,
    onNearLimitChange: setNearLimit,
    onFarLimitChange: setFarLimit,
    onOverlapChange: setOverlapPct,
    onMagnificationChange: (v: number) => { trackParam({ param_name: 'magnification', param_value: String(v), input_type: 'slider' }); setMagnification(v) },
    onDepthChange: setDepthMm,
    sensor, coc, stackingResult, macroResult, macroRows,
    hoveredShot, setHoveredShot, trackParam,
  }
}

export type StackingState = ReturnType<typeof useStackingState>
