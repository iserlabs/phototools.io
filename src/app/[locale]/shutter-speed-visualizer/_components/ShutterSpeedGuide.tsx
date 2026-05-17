'use client'

import { useState } from 'react'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolActions } from '@/components/shared/ToolActions'
import { SHUTTER_PRESETS } from './shutter-data'
import { MotionCanvas } from './MotionCanvas'
import { ShutterControlsPanel } from './ShutterControlsPanel'
import ss from './ShutterSpeedGuide.module.css'

export function ShutterSpeedGuide() {
  const { trackParam } = useToolSession()
  const [shutterIdx, setShutterIdx] = useState(8)

  function handleShutterChange(v: number) {
    trackParam({ param_name: 'shutter_speed', param_value: String(SHUTTER_PRESETS[v].value), input_type: 'slider' })
    setShutterIdx(v)
  }

  return (
    <div className={ss.app}>
      <div className={ss.appBody}>
        <div className={ss.sidebar}>
          <ToolActions toolSlug="shutter-speed-visualizer" />
          <ShutterControlsPanel shutterIdx={shutterIdx} onShutterChange={handleShutterChange} />
        </div>

        <div className={ss.main}>
          <MotionCanvas shutterSpeed={SHUTTER_PRESETS[shutterIdx].value} />
        </div>

        <div className={ss.desktopOnly}>
          <LearnPanel slug="shutter-speed-visualizer" />
        </div>
      </div>

      <div className={ss.mobileControls}>
        <ShutterControlsPanel shutterIdx={shutterIdx} onShutterChange={handleShutterChange} />
      </div>

      <RelatedTools variant="inline" currentSlug="shutter-speed-visualizer" />
      <div className={ss.mobileOnly}>
        <LearnPanel slug="shutter-speed-visualizer" />
      </div>
    </div>
  )
}
