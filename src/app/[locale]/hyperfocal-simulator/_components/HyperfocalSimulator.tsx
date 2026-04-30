'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { calcDoF } from '@/lib/math/dof'
import { SENSORS } from '@/lib/data/sensors'
import { useQueryInit, useToolQuerySync, intParam, numParam, strParam, sensorParam } from '@/lib/utils/querySync'
import { ToolActions } from '@/components/shared/ToolActions'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { DoFDiagram } from '@/components/shared/DoFDiagram'
import { DoFCanvas } from '@/components/shared/DoFCanvas'
import type { SceneKey } from '@/components/shared/DoFCanvas'
import { HyperfocalResults } from './HyperfocalResults'
import { HyperfocalMiniTable } from './HyperfocalMiniTable'
import { HyperfocalBadge } from './HyperfocalBadge'
import { HYPERFOCAL_SCENE_PRESETS, type HyperfocalScene } from '@/lib/data/hyperfocalSimulator'
import { HyperfocalSettingsPanel } from './HyperfocalSettingsPanel'
import s from './HyperfocalSimulator.module.css'

const PARAM_SCHEMA = {
  fl: intParam(24, 8, 800),
  f: numParam(8, 1.4, 22),
  d: numParam(3, 0.3, 100),
  s: sensorParam('ff'),
  scene: strParam<HyperfocalScene>('landscape', ['landscape', 'street']),
}

function sliderToDistance(val: number): number {
  const minLog = Math.log(0.3)
  const maxLog = Math.log(100)
  return Math.exp(minLog + val * (maxLog - minLog))
}

function distanceToSlider(dist: number): number {
  const minLog = Math.log(0.3)
  const maxLog = Math.log(100)
  return (Math.log(dist) - minLog) / (maxLog - minLog)
}

export function HyperfocalSimulator() {
  const t = useTranslations('toolUI.hyperfocal-simulator')
  const { trackParam } = useToolSession()
  const [focalLength, setFocalLength] = useState(24)
  const [aperture, setAperture] = useState(8)
  const [sliderVal, setSliderVal] = useState(distanceToSlider(3))
  const [sensorId, setSensorId] = useState('ff')
  const [scene, setScene] = useState<HyperfocalScene>('landscape')

  const distance = sliderToDistance(sliderVal)

  useQueryInit(PARAM_SCHEMA, {
    fl: setFocalLength, f: setAperture,
    d: (v: number) => setSliderVal(distanceToSlider(v)),
    s: setSensorId, scene: setScene,
  })
  useToolQuerySync({ fl: focalLength, f: aperture, d: distance, s: sensorId, scene }, PARAM_SCHEMA)

  const sensor = SENSORS.find((sen) => sen.id === sensorId) ?? SENSORS[1]
  const coc = 0.03 / sensor.cropFactor

  const result = useMemo(
    () => calcDoF({ focalLength, aperture, distance, coc }),
    [focalLength, aperture, distance, coc],
  )

  const focusNormalized = distanceToSlider(distance)
  const isAtHyperfocal = distance >= result.hyperfocal

  const handleDiagramDistanceChange = useCallback((meters: number) => {
    setSliderVal(distanceToSlider(meters))
  }, [])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const normalizedY = (e.clientY - rect.top) / rect.height
    setSliderVal(Math.max(0, Math.min(1, 1 - normalizedY)))
  }, [])

  const settingsProps = {
    focalLength, aperture, sliderVal, sensorId, distance,
    onFocalLengthChange: (v: number) => { trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' }); setFocalLength(v) },
    onApertureChange: (v: number) => { trackParam({ param_name: 'aperture', param_value: String(v), input_type: 'select' }); setAperture(v) },
    onSliderChange: setSliderVal, onSensorChange: setSensorId,
  }

  return (
    <div className={s.app}>
      <ToolHeading slug="hyperfocal-simulator" />
      <div className={s.appBody}>
        <div className={s.sidebar}>
          <ToolActions toolSlug="hyperfocal-simulator" />
          <HyperfocalSettingsPanel {...settingsProps} />
          <div className={s.panel}>
            <HyperfocalResults result={result} distance={distance} isAtHyperfocal={isAtHyperfocal} />
          </div>
          <div className={s.panel}>
            <HyperfocalMiniTable focalLength={focalLength} aperture={aperture} coc={coc} />
          </div>
        </div>

        <div className={s.canvasArea}>
          <div className={s.canvasTopbar}>
            <span className={s.presetLabel}>{t('scene')}</span>
            {HYPERFOCAL_SCENE_PRESETS.map((preset) => (
              <button key={preset.key}
                className={`${s.presetBtn} ${scene === preset.key ? s.presetBtnActive : ''}`}
                onClick={() => setScene(preset.key)} aria-pressed={scene === preset.key}>
                {t(preset.tKey)}
              </button>
            ))}
          </div>
          <div className={s.canvasMain} onPointerDown={handleCanvasPointerDown}>
            <DoFCanvas focusDistance={focusNormalized} aperture={aperture} scene={scene as SceneKey} className={s.canvas} />
            <HyperfocalBadge isAtHyperfocal={isAtHyperfocal} nearLimit={result.nearFocus} />
          </div>
          <div className={s.depthBar}>
            <DoFDiagram result={result} distance={distance} onDistanceChange={handleDiagramDistanceChange} />
          </div>
        </div>
      </div>

      <div className={s.mobileControls}>
        <HyperfocalSettingsPanel {...settingsProps} />
        <div className={s.panel}>
          <HyperfocalResults result={result} distance={distance} isAtHyperfocal={isAtHyperfocal} />
        </div>
      </div>
    </div>
  )
}
