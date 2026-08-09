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
import { CompareDrawer } from './CompareDrawer'
import { useSensorState } from './useSensorState'
import { useSensorCanvas } from './useSensorCanvas'
import { useCompareEntry } from './useCompareEntry'

export function SensorSize() {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const { trackParam } = useToolSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    visible, setVisible, mode, setMode, resolution, setResolution,
    customSensors, allSensors, visibleSensors,
    comparePair, setComparePair,
    toggleSensor, addCustomSensor, editCustomSensor, removeAllCustomSensors, removeCustomSensor,
  } = useSensorState()

  const { hoveredSensor, setHoveredSensor, expandedId, setExpandedId, handleMouseMove, handleCanvasClick } =
    useSensorCanvas({ canvasRef, mode, resolution, allSensors, visible })

  const { isDesktop, handleCompare, compareA, compareB } =
    useCompareEntry({ allSensors, comparePair, setComparePair, trackParam })

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

  const tableProps = {
    sensors: visibleSensors, expandedId, onToggleExpand: handleToggleExpand,
    hoveredId: hoveredSensor, onHover: setHoveredSensor,
    onCompare: (otherId: string) => handleCompare(expandedId!, otherId),
    compareCandidates: visibleSensors.filter((s) => s.id !== expandedId),
  }

  // Entry point (a): rendered above both tables via `tableProps`. Entry
  // point (b): only when exactly two sensors are visible. Both single JSX
  // values reused at two call sites below — `drawer` only actually mounts
  // at whichever one is gated true by `isDesktop`, so exactly one
  // `CompareDrawer` instance ever lives in the DOM at a time (see
  // useCompareEntry.ts). `compareTwoBtn` has no id/state to collide, so
  // rendering it at both call sites (like `SensorControlsPanel` already
  // does) is harmless.
  const drawer = compareA && compareB
    ? <CompareDrawer a={compareA} b={compareB} onClose={() => setComparePair(null)} />
    : null
  const compareTwoBtn = visibleSensors.length === 2 ? (
    <button type="button" className={ss.compareTwoBtn} onClick={() => handleCompare(visibleSensors[0].id, visibleSensors[1].id)}>
      {t('compare.compareTheseTwo')}
    </button>
  ) : null

  return (
    <div className={ss.app}>
      <ToolHeading slug="sensor-size-comparison" />
      <div className={ss.appBody}>
        <div className={ss.sidebar}>
          <ToolActions toolSlug="sensor-size-comparison" canvasRef={canvasRef} imageFilename="sensor-comparison.png" onReset={() => {
            setVisible(new Set(DEFAULT_VISIBLE_IDS)); setMode('overlay'); setResolution(24); setComparePair(null)
          }} />
          <SensorControlsPanel {...controlsProps} />
        </div>
        <div className={ss.main}>
          <canvas ref={canvasRef} className={ss.canvas} style={{ width: '100%', minHeight: 300, flexShrink: 0 }}
            aria-label={t('canvasAriaLabel', { mode })} role="img" onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredSensor(null)} onClick={handleCanvasClick} />
          {isDesktop && drawer}
          {compareTwoBtn && <div className={ss.desktopOnly}>{compareTwoBtn}</div>}
          <div className={`${ss.tableWrap} ${ss.desktopOnly}`}>
            <SensorTable {...tableProps} variant="desktop" />
          </div>
        </div>
        <div className={ss.desktopOnly}><LearnPanel slug="sensor-size-comparison" /></div>
      </div>
      <div className={ss.mobileControls}>
        <SensorControlsPanel {...controlsProps} />
        {!isDesktop && drawer}
        {compareTwoBtn}
        <div className={ss.tableWrap}>
          <SensorTable {...tableProps} variant="mobile" />
        </div>
      </div>
      <RelatedTools variant="inline" currentSlug="sensor-size-comparison" />
      <div className={ss.mobileOnly}><LearnPanel slug="sensor-size-comparison" /></div>
    </div>
  )
}
