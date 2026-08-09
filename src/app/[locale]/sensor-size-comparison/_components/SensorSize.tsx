'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import type { DisplayMode } from './sensorSizeTypes'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import ss from './SensorSize.module.css'
import { DEFAULT_VISIBLE_IDS } from './sensorSizeTypes'
import { SensorControlsPanel } from './SensorControlsPanel'
import { SensorTable } from './SensorTable'
import { useSensorState } from './useSensorState'
import { useSensorCanvas } from './useSensorCanvas'

export function SensorSize() {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const { trackParam } = useToolSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    visible, setVisible, mode, setMode, resolution, setResolution,
    customSensors, allSensors, visibleSensors,
    toggleSensor, addCustomSensor, editCustomSensor, removeAllCustomSensors, removeCustomSensor,
  } = useSensorState()

  const { hoveredSensor, setHoveredSensor, expandedId, setExpandedId, handleMouseMove, handleCanvasClick } =
    useSensorCanvas({ canvasRef, mode, resolution, allSensors, visible })

  const handleToggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  const controlsProps = {
    visible, mode, customSensors,
    onToggleSensor: (id: string) => { trackParam({ param_name: 'sensor', param_value: id, input_type: 'toggle' }); toggleSensor(id) },
    onModeChange: (m: DisplayMode) => { trackParam({ param_name: 'mode', param_value: m, input_type: 'select' }); setMode(m) },
    onAddCustom: addCustomSensor, onRemoveCustom: removeCustomSensor,
    onRemoveAllCustom: removeAllCustomSensors, onEditCustom: editCustomSensor,
    onHoverSensor: setHoveredSensor,
    onApplyPreset: (ids: string[]) => {
      trackParam({ param_name: 'preset', param_value: ids.join('+'), input_type: 'button' })
      setVisible(new Set(ids))
    },
  }

  return (
    <div className={ss.app}>
      <ToolHeading slug="sensor-size-comparison" />
      <div className={ss.appBody}>
        <div className={ss.sidebar}>
          <ToolActions toolSlug="sensor-size-comparison" canvasRef={canvasRef} imageFilename="sensor-comparison.png" onReset={() => {
            setVisible(new Set(DEFAULT_VISIBLE_IDS)); setMode('overlay'); setResolution(24)
          }} />
          <SensorControlsPanel {...controlsProps} />
        </div>
        <div className={ss.main}>
          <canvas ref={canvasRef} className={ss.canvas} style={{ width: '100%', minHeight: 300, flexShrink: 0 }}
            aria-label={t('canvasAriaLabel', { mode })} role="img" onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredSensor(null)} onClick={handleCanvasClick} />
          <div className={`${ss.tableWrap} ${ss.desktopOnly}`}>
            <SensorTable sensors={visibleSensors} expandedId={expandedId} onToggleExpand={handleToggleExpand} hoveredId={hoveredSensor} onHover={setHoveredSensor} variant="desktop" />
          </div>
        </div>
        <div className={ss.desktopOnly}><LearnPanel slug="sensor-size-comparison" /></div>
      </div>
      <div className={ss.mobileControls}>
        <SensorControlsPanel {...controlsProps} />
        <div className={ss.tableWrap}>
          <SensorTable sensors={visibleSensors} expandedId={expandedId} onToggleExpand={handleToggleExpand} hoveredId={hoveredSensor} onHover={setHoveredSensor} variant="mobile" />
        </div>
      </div>
      <RelatedTools variant="inline" currentSlug="sensor-size-comparison" />
      <div className={ss.mobileOnly}><LearnPanel slug="sensor-size-comparison" /></div>
    </div>
  )
}
