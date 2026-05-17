'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { calcEquivalentSettings } from '@/lib/math/dof'
import { SENSORS, getSensor } from '@/lib/data/sensors'
import { useQueryInit, useToolQuerySync } from '@/lib/utils/querySync'
import { PARAM_SCHEMA } from './querySync'
import { SourceSettingsPanel } from './SourceSettingsPanel'
import { TargetSensorPanel } from './TargetSensorPanel'
import { EquivalenceCard } from './EquivalenceCard'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import s from './EquivalentSettings.module.css'

export function EquivalentSettings() {
  const t = useTranslations('toolUI.equivalent-settings-calculator')
  const { trackParam } = useToolSession()
  const [focalLength, setFocalLength] = useState(85)
  const [aperture, setAperture] = useState(1.4)
  const [distance, setDistance] = useState(3)
  const [sensorId, setSensorId] = useState('ff')
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set(['apsc_n', 'm43']))

  // -- Query sync --
  useQueryInit(PARAM_SCHEMA, {
    fl: setFocalLength,
    f: setAperture,
    d: setDistance,
    s: setSensorId,
    targets: (v: string) => setTargetIds(new Set(v.split(','))),
  })
  useToolQuerySync({
    fl: focalLength,
    f: aperture,
    d: distance,
    s: sensorId,
    targets: Array.from(targetIds).join(','),
  }, PARAM_SCHEMA)

  // -- Computed --
  const sourceSensor = getSensor(sensorId)
  const targetSensors = useMemo(
    () => SENSORS.filter((sensor) => targetIds.has(sensor.id) && sensor.id !== sensorId),
    [targetIds, sensorId],
  )

  const results = useMemo(
    () => targetSensors.map((target) => ({
      sensor: target,
      ...calcEquivalentSettings({
        focalLength,
        aperture,
        distance,
        sourceCrop: sourceSensor.cropFactor,
        targetCrop: target.cropFactor,
      }),
    })),
    [focalLength, aperture, distance, sourceSensor, targetSensors],
  )

  const handleTargetChange = useCallback((ids: Set<string>) => {
    setTargetIds(ids)
  }, [])

  const settingsProps = {
    focalLength,
    aperture,
    distance,
    sensorId,
    onFocalLengthChange: (v: number) => { trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' }); setFocalLength(v) },
    onApertureChange: (v: number) => { trackParam({ param_name: 'aperture', param_value: String(v), input_type: 'select' }); setAperture(v) },
    onDistanceChange: setDistance,
    onSensorChange: setSensorId,
  }

  const targetProps = {
    selectedIds: targetIds,
    excludeId: sensorId,
    onChange: handleTargetChange,
  }

  return (
    <div className={s.app}>
      <ToolHeading slug="equivalent-settings-calculator" />
      <div className={s.appBody}>
        {/* -- Sidebar -- */}
        <div className={s.sidebar}>
          <ToolActions toolSlug="equivalent-settings-calculator" />
          <SourceSettingsPanel {...settingsProps} />
          <TargetSensorPanel {...targetProps} />
        </div>

        {/* -- Content -- */}
        <div className={s.contentArea}>
          {results.length > 0 ? (
            <div className={s.cardsGrid}>
              {results.map((result) => (
                <EquivalenceCard
                  key={result.sensor.id}
                  sourceSensor={sourceSensor}
                  targetSensor={result.sensor}
                  sourceFocalLength={focalLength}
                  sourceAperture={aperture}
                  sourceDistance={distance}
                  result={result}
                />
              ))}
            </div>
          ) : (
            <div className={s.emptyState}>{t('targetSensors')}</div>
          )}
        </div>

        {/* -- LearnPanel (desktop) -- */}
        <div className={s.desktopOnly}>
          <LearnPanel slug="equivalent-settings-calculator" />
        </div>
      </div>

      {/* -- Mobile controls -- */}
      <div className={s.mobileControls}>
        <SourceSettingsPanel {...settingsProps} />
        <TargetSensorPanel {...targetProps} />
      </div>

      <RelatedTools variant="inline" currentSlug="equivalent-settings-calculator" />
      <div className={s.mobileOnly}>
        <LearnPanel slug="equivalent-settings-calculator" />
      </div>
    </div>
  )
}
