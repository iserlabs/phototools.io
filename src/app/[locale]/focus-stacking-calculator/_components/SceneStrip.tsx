'use client'

import { useTranslations } from 'next-intl'
import type { StackingState } from './useStackingState'
import type { DiagramScale } from './diagramScale'
import { VB_W } from './diagramScale'
import { DistanceScene } from './diagram/DistanceScene'
import { MacroScene } from './diagram/MacroScene'
import s from './FocusStacking.module.css'

interface SceneStripProps {
  state: StackingState
  scale: DiagramScale
}

const SCENE_H = 80

/**
 * A compact illustrated "scene" rendered above the main diagram, sharing
 * the diagram's exact `DiagramScale` instance (built once in
 * FocusStacking.tsx) so its markers land at the same x as the chart below —
 * same value, same `scale.toX(value)`, no independent mapping to drift out
 * of sync. Makes the abstract chart legible: a camera, a ground/rail line,
 * and either a depth-of-field wedge (distance mode) or a subject blob with
 * slice planes (macro mode).
 */
export function SceneStrip({ state, scale }: SceneStripProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')

  return (
    <div className={`${s.diagramWrap} ${s.sceneStripWrap}`}>
      <svg viewBox={`0 0 ${VB_W} ${SCENE_H}`} width="100%"
        style={{ maxWidth: 900, height: 'auto' }} role="img" aria-label={t('diagram')}>
        <rect x={0} y={0} width={VB_W} height={SCENE_H} fill="var(--bg-surface)" rx={8} />
        {state.mode === 'distance'
          ? <DistanceScene state={state} scale={scale} />
          : <MacroScene state={state} scale={scale} />}
      </svg>
    </div>
  )
}
