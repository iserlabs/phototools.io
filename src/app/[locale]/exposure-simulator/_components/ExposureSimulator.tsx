'use client'

import { useState, useMemo, useCallback } from 'react'
import { calcEV } from '@/lib/math/exposure'
import { useQueryInit, useToolQuerySync, intParam, strParam } from '@/lib/utils/querySync'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import { APERTURES, SHUTTER_SPEEDS, ISOS } from '@/lib/data/camera'
import { ExposurePreview } from './ExposurePreview'
import { ExposureControlsPanel } from './ExposureControlsPanel'
import type { LockTarget } from './exposure-helpers'
import { findNearest } from './exposure-helpers'
import sim from './ExposureSimulator.module.css'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'

const PARAM_SCHEMA = {
  ai: intParam(APERTURES.indexOf(5.6), 0, 8),
  si: intParam(SHUTTER_SPEEDS.indexOf(1 / 125), 0, 18),
  ii: intParam(0, 0, 8),
  lock: strParam<LockTarget>('iso', ['aperture', 'shutter', 'iso']),
}

export function ExposureSimulator() {
  const { trackParam } = useToolSession()
  const [apertureIdx, setApertureIdx] = useState(APERTURES.indexOf(5.6))
  const [shutterIdx, setShutterIdx] = useState(SHUTTER_SPEEDS.indexOf(1/125))
  const [isoIdx, setIsoIdx] = useState(0)
  const [lock, setLock] = useState<LockTarget>('iso')
  useQueryInit(PARAM_SCHEMA, { ai: setApertureIdx, si: setShutterIdx, ii: setIsoIdx, lock: setLock })

  const aperture = APERTURES[apertureIdx]
  const shutter = SHUTTER_SPEEDS[shutterIdx]
  const iso = ISOS[isoIdx]

  useToolQuerySync({ ai: apertureIdx, si: shutterIdx, ii: isoIdx, lock }, PARAM_SCHEMA)

  const ev100 = useMemo(() => calcEV(aperture, shutter), [aperture, shutter])
  const totalEV = ev100 + Math.log2(iso / 100)

  const handleApertureChange = useCallback((newIdx: number) => {
    const newAperture = APERTURES[newIdx]
    if (lock === 'aperture') return
    trackParam({ param_name: 'aperture', param_value: String(newAperture), input_type: 'slider' })
    setApertureIdx(newIdx)

    if (lock === 'shutter') {
      const ev100New = calcEV(newAperture, shutter)
      const neededIsoLog = totalEV - ev100New
      const neededIso = 100 * Math.pow(2, neededIsoLog)
      setIsoIdx(ISOS.indexOf(findNearest(ISOS, neededIso)))
    } else if (lock === 'iso') {
      const targetEV100 = totalEV - Math.log2(iso / 100)
      const neededShutter = (newAperture * newAperture) / Math.pow(2, targetEV100)
      setShutterIdx(SHUTTER_SPEEDS.indexOf(findNearest(SHUTTER_SPEEDS, neededShutter)))
    }
  }, [lock, shutter, iso, totalEV, trackParam])

  const handleShutterChange = useCallback((newIdx: number) => {
    const newShutter = SHUTTER_SPEEDS[newIdx]
    if (lock === 'shutter') return
    trackParam({ param_name: 'shutter', param_value: String(newShutter), input_type: 'slider' })
    setShutterIdx(newIdx)

    if (lock === 'aperture') {
      const ev100New = calcEV(aperture, newShutter)
      const neededIsoLog = totalEV - ev100New
      const neededIso = 100 * Math.pow(2, neededIsoLog)
      setIsoIdx(ISOS.indexOf(findNearest(ISOS, neededIso)))
    } else if (lock === 'iso') {
      const targetEV100 = totalEV - Math.log2(iso / 100)
      const neededAperture = Math.sqrt(newShutter * Math.pow(2, targetEV100))
      setApertureIdx(APERTURES.indexOf(findNearest(APERTURES, neededAperture)))
    }
  }, [lock, aperture, iso, totalEV, trackParam])

  const handleIsoChange = useCallback((newIdx: number) => {
    const newIso = ISOS[newIdx]
    if (lock === 'iso') return
    setIsoIdx(newIdx)

    if (lock === 'aperture') {
      const targetEV100 = totalEV - Math.log2(newIso / 100)
      const neededShutter = (aperture * aperture) / Math.pow(2, targetEV100)
      setShutterIdx(SHUTTER_SPEEDS.indexOf(findNearest(SHUTTER_SPEEDS, neededShutter)))
    } else if (lock === 'shutter') {
      const targetEV100 = totalEV - Math.log2(newIso / 100)
      const neededAperture = Math.sqrt(shutter * Math.pow(2, targetEV100))
      setApertureIdx(APERTURES.indexOf(findNearest(APERTURES, neededAperture)))
    }
  }, [lock, aperture, shutter, totalEV])

  const controlsProps = {
    aperture, apertureIdx, shutter, shutterIdx, iso, isoIdx, lock, totalEV,
    onLockChange: setLock,
    onApertureChange: handleApertureChange,
    onShutterChange: handleShutterChange,
    onIsoChange: handleIsoChange,
  }

  return (
    <div className={sim.app}>
      <ToolHeading slug="exposure-simulator" />
      <div className={sim.appBody}>
        <div className={sim.sidebar}>
          <ToolActions toolSlug="exposure-simulator" />
          <ExposureControlsPanel {...controlsProps} />
        </div>

        <ExposurePreview aperture={aperture} shutterSpeed={shutter} iso={iso} />
        <div className={sim.desktopOnly}>
          <LearnPanel slug="exposure-simulator" />
        </div>
      </div>

      <div className={sim.mobileControls}>
        <ExposureControlsPanel {...controlsProps} />
      </div>

      <div className={sim.mobileOnly}>
        <LearnPanel slug="exposure-simulator" />
      </div>
    </div>
  )
}
