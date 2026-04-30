'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { rule500, ruleNPF, stackingTime, formatDuration } from '@/lib/math/startrail'
import { pixelPitch } from '@/lib/math/diffraction'
import { SENSORS } from '@/lib/data/sensors'
import { useQueryInit, useToolQuerySync, intParam, numParam, strParam, sensorParam } from '@/lib/utils/querySync'
import { ToolActions } from '@/components/shared/ToolActions'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { StarTrailCanvas, type StarTrailCanvasHandle } from './StarTrailCanvas'
import { LATITUDE_PRESETS } from '@/lib/data/starTrailCalculator'
import { StarTrailControls } from './StarTrailControls'
import { drawInfoOverlay } from './drawInfoOverlay'
import css from './StarTrailCalculator.module.css'

function sensorWidth(cropFactor: number): number {
  return 36 / cropFactor
}

const PARAM_SCHEMA = {
  mode: strParam<'sharp' | 'trails'>('sharp', ['sharp', 'trails']),
  fl: intParam(24, 8, 800),
  s: sensorParam('ff'),
  mp: intParam(24, 1, 200),
  f: numParam(2.8, 1.4, 22),
  lat: intParam(45, 0, 90),
  exp: intParam(30, 1, 300),
  frames: intParam(60, 1, 9999),
  gap: intParam(1, 0, 60),
}

export function StarTrailCalculator() {
  const t = useTranslations('toolUI.star-trail-calculator')
  const { trackParam } = useToolSession()
  const [mode, setMode] = useState<'sharp' | 'trails'>('trails')
  const canvasHandle = useRef<StarTrailCanvasHandle>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const [focalLength, setFocalLength] = useState(24)
  const [sensorId, setSensorId] = useState('ff')
  const [resolution, setResolution] = useState(24)
  const [aperture, setAperture] = useState(2.8)
  const [latitude, setLatitude] = useState(45)

  const [exposurePerFrame, setExposurePerFrame] = useState(30)
  const [numFrames, setNumFrames] = useState(60)
  const [gap, setGap] = useState(1)
  useQueryInit(PARAM_SCHEMA, { mode: setMode, fl: setFocalLength, s: setSensorId, mp: setResolution, f: setAperture, lat: setLatitude, exp: setExposurePerFrame, frames: setNumFrames, gap: setGap })

  useToolQuerySync(
    { mode, fl: focalLength, s: sensorId, mp: resolution, f: aperture, lat: latitude, exp: exposurePerFrame, frames: numFrames, gap },
    PARAM_SCHEMA,
  )

  const sensor = SENSORS.find((s) => s.id === sensorId) ?? SENSORS[1]
  const width = sensorWidth(sensor.cropFactor)
  const pitch = pixelPitch(width, resolution)

  const sharpResults = useMemo(() => {
    const max500 = rule500(focalLength, sensor.cropFactor)
    const maxNPF = ruleNPF(aperture, focalLength, pitch)
    return { max500, maxNPF }
  }, [focalLength, sensor.cropFactor, aperture, pitch])

  const trailResult = useMemo(
    () => stackingTime(exposurePerFrame, numFrames, gap),
    [exposurePerFrame, numFrames, gap],
  )

  const totalExposure = exposurePerFrame * numFrames

  const handleBeforeCopy = useCallback(() => {
    canvasHandle.current?.drawStatic()

    const src = canvasHandle.current?.canvas
    if (!src) return
    if (!exportCanvasRef.current) {
      exportCanvasRef.current = document.createElement('canvas')
    }
    const dest = exportCanvasRef.current
    dest.width = src.width
    dest.height = src.height
    const ctx = dest.getContext('2d')
    if (!ctx) return
    ctx.drawImage(src, 0, 0)

    drawInfoOverlay(dest, {
      mode,
      focalLength,
      sensor: sensor.name,
      aperture,
      latitude,
      resolution,
      sharpResults: mode === 'sharp' ? sharpResults : undefined,
      trailInfo: mode === 'trails' ? {
        exposurePerFrame,
        numFrames,
        totalTime: formatDuration(trailResult),
        totalExposure: formatDuration(totalExposure),
      } : undefined,
    })
  }, [mode, focalLength, sensor.name, aperture, latitude, resolution, sharpResults, exposurePerFrame, numFrames, trailResult, totalExposure])

  const controlsProps = {
    mode, focalLength, sensorId, resolution, aperture, latitude,
    exposurePerFrame, numFrames, gap, sharpResults, trailResult,
    onModeChange: (v: 'sharp' | 'trails') => { trackParam({ param_name: 'mode', param_value: v, input_type: 'toggle' }); setMode(v) },
    onFocalLengthChange: (v: number) => { trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' }); setFocalLength(v) },
    onSensorIdChange: setSensorId, onResolutionChange: setResolution,
    onApertureChange: setAperture, onLatitudeChange: setLatitude,
    onExposurePerFrameChange: setExposurePerFrame,
    onNumFramesChange: setNumFrames, onGapChange: setGap,
  }

  return (
    <div className={css.app}>
      <ToolHeading slug="star-trail-calculator" />
      <div className={css.appBody}>
        <div className={css.sidebar}>
          <ToolActions
            toolSlug="star-trail-calculator"
            canvasRef={exportCanvasRef}
            imageFilename="star-trail-calculator.png"
            onBeforeCopyImage={handleBeforeCopy}
          />
          <StarTrailControls {...controlsProps} />
        </div>

        <div className={css.canvasArea}>
          <div className={css.topbar}>
            <span className={css.presetStripLabel}>{t('latitudeLabel')}</span>
            <div className={css.presetStrip}>
              {LATITUDE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  className={`${css.presetBtn} ${latitude === p.value ? css.presetBtnActive : ''}`}
                  onClick={() => setLatitude(p.value)}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
          </div>
          <div className={css.canvasMain}>
            <StarTrailCanvas
              ref={canvasHandle}
              mode={mode}
              maxExposure500={sharpResults.max500}
              maxExposureNPF={sharpResults.maxNPF}
              totalExposure={totalExposure}
              latitude={latitude}
              exposurePerFrame={exposurePerFrame}
            />
          </div>
        </div>
        <div className={css.desktopOnly}>
          <LearnPanel slug="star-trail-calculator" />
        </div>
      </div>

      <div className={css.mobileControls}>
        <StarTrailControls {...controlsProps} />
      </div>

      <div className={css.mobileOnly}>
        <LearnPanel slug="star-trail-calculator" />
      </div>
    </div>
  )
}
