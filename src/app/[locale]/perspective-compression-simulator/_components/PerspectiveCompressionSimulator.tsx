'use client'

import { useReducer, useState, useEffect, useCallback } from 'react'
import { ToolActions } from '@/components/shared/ToolActions'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { reducer, DEFAULT_STATE, parseQueryParams, useQuerySync } from './compressionState'
import type { Action } from './compressionState'
import { CompressionControls } from './CompressionControls'
import { CompressionScene } from './CompressionScene'
import styles from './PerspectiveCompressionSimulator.module.css'

export function PerspectiveCompressionSimulator() {
  const { trackParam } = useToolSession()
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  const trackedDispatch = useCallback((action: Action) => {
    if (action.type === 'SET_FOCAL_LENGTH') {
      trackParam({ param_name: 'focal_length', param_value: String(action.payload), input_type: 'slider' })
    } else if (action.type === 'SET_SENSOR') {
      trackParam({ param_name: 'sensor', param_value: action.payload, input_type: 'select' })
    }
    dispatch(action)
  }, [trackParam])

  useQuerySync(state)

  useEffect(() => {
    if (hydrated) return
    setHydrated(true)
    const queryOverrides = parseQueryParams()
    if (Object.keys(queryOverrides).length > 0) {
      dispatch({ type: 'HYDRATE', payload: queryOverrides })
    }
  }, [hydrated])

  return (
    <div className={styles.app}>
      <ToolHeading slug="perspective-compression-simulator" />
      <div className={styles.appBody}>
        <aside className={styles.sidebar}>
          <ToolActions
            toolSlug="perspective-compression-simulator"
            onReset={() => dispatch({ type: 'RESET' })}
          />
          <CompressionControls state={state} dispatch={trackedDispatch} />
        </aside>

        <main className={styles.canvasArea}>
          <section className={styles.canvasMain}>
            <CompressionScene
              focalLength={state.focalLength}
              sensorId={state.sensorId}
              distance={state.distance}
            />
          </section>
        </main>

        <div className={styles.desktopOnly}>
          <LearnPanel slug="perspective-compression-simulator" />
        </div>
      </div>

      <div className={styles.mobileControls}>
        <CompressionControls state={state} dispatch={trackedDispatch} />
      </div>

      <RelatedTools variant="inline" currentSlug="perspective-compression-simulator" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="perspective-compression-simulator" />
      </div>
    </div>
  )
}
