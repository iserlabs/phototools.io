'use client'

import { useState, useMemo } from 'react'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { calcStackingSequence } from '@/lib/math/dof'
import { getSensor } from '@/lib/data/sensors'
import { useQueryInit, useToolQuerySync } from '@/lib/utils/querySync'
import { PARAM_SCHEMA } from './querySync'
import { StackingSettingsPanel } from './StackingSettingsPanel'
import { StackingResultsPanel } from './StackingResultsPanel'
import { StackingDiagram } from './StackingDiagram'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import s from './FocusStacking.module.css'

export function FocusStacking() {
  const { trackParam } = useToolSession()
  const [focalLength, setFocalLength] = useState(50)
  const [aperture, setAperture] = useState(8)
  const [sensorId, setSensorId] = useState('ff')
  const [nearLimit, setNearLimit] = useState(0.5)
  const [farLimit, setFarLimit] = useState(5)
  const [overlapPct, setOverlapPct] = useState(0.2)

  // -- Query sync --
  useQueryInit(PARAM_SCHEMA, {
    fl: setFocalLength,
    f: setAperture,
    s: setSensorId,
    near: setNearLimit,
    far: setFarLimit,
    overlap: (v: number) => setOverlapPct(v / 100),
  })
  useToolQuerySync({
    fl: focalLength,
    f: aperture,
    s: sensorId,
    near: nearLimit,
    far: farLimit,
    overlap: Math.round(overlapPct * 100),
  }, PARAM_SCHEMA)

  // -- Computed --
  const sensor = getSensor(sensorId)
  const coc = 0.03 / sensor.cropFactor

  const stackingResult = useMemo(
    () => calcStackingSequence({
      focalLength, aperture, coc, nearLimit, farLimit, overlapPct,
    }),
    [focalLength, aperture, coc, nearLimit, farLimit, overlapPct],
  )

  const settingsProps = {
    focalLength, aperture, sensorId, nearLimit, farLimit, overlapPct,
    onFocalLengthChange: (v: number) => { trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' }); setFocalLength(v) },
    onApertureChange: (v: number) => { trackParam({ param_name: 'aperture', param_value: String(v), input_type: 'select' }); setAperture(v) },
    onSensorChange: setSensorId,
    onNearLimitChange: setNearLimit,
    onFarLimitChange: setFarLimit,
    onOverlapChange: setOverlapPct,
  }

  const resultsProps = {
    result: stackingResult,
    focalLength,
    aperture,
    sensorName: sensor.name,
    overlapPct,
  }

  return (
    <div className={s.app}>
      <ToolHeading slug="focus-stacking-calculator" />
      <div className={s.appBody}>
        {/* -- Sidebar -- */}
        <div className={s.sidebar}>
          <ToolActions toolSlug="focus-stacking-calculator" />
          <StackingSettingsPanel {...settingsProps} />
          <StackingResultsPanel {...resultsProps} />
        </div>

        {/* -- Center -- */}
        <div className={s.canvasArea}>
          <StackingDiagram
            result={stackingResult}
            nearLimit={nearLimit}
            farLimit={farLimit}
          />
        </div>

        {/* -- LearnPanel (desktop) -- */}
        <div className={s.desktopOnly}>
          <LearnPanel slug="focus-stacking-calculator" />
        </div>
      </div>

      {/* -- Mobile controls -- */}
      <div className={s.mobileControls}>
        <StackingSettingsPanel {...settingsProps} />
        <StackingResultsPanel {...resultsProps} />
      </div>

      <div className={s.mobileOnly}>
        <LearnPanel slug="focus-stacking-calculator" />
      </div>
    </div>
  )
}
