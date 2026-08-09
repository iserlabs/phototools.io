'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useStackingState } from './useStackingState'
import { StackingSettingsPanel } from './StackingSettingsPanel'
import { StackingResultsPanel } from './StackingResultsPanel'
import { MacroSettingsPanel } from './MacroSettingsPanel'
import { MacroResultsPanel } from './MacroResultsPanel'
import { StackingDiagram } from './StackingDiagram'
import { SceneStrip } from './SceneStrip'
import { ShotTable } from './ShotTable'
import { useStackSweep } from './useStackSweep'
import { buildDistanceScale, buildMacroScale, VB_W, DIAGRAM_PAD } from './diagramScale'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import s from './FocusStacking.module.css'

const DRAW_W = VB_W - DIAGRAM_PAD.left - DIAGRAM_PAD.right

export function FocusStacking() {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const st = useStackingState()
  const shotCount = st.mode === 'distance' ? st.stackingResult.shots.length : st.macroRows.length
  const { playing, toggle } = useStackSweep(shotCount, st.setHoveredShot)

  // Built once here and passed down to both SceneStrip and StackingDiagram —
  // sharing this exact instance is what keeps the scene strip's markers and
  // the diagram's bands/axis from ever drifting out of sync on x-mapping.
  const scale = useMemo(() => st.mode === 'distance'
    ? buildDistanceScale(st.stackingResult.shots, st.nearLimit, st.farLimit, DIAGRAM_PAD.left, DRAW_W)
    : buildMacroScale(st.depthMm, st.macroRows.at(-1)?.sliceEndMm ?? st.depthMm, DIAGRAM_PAD.left, DRAW_W),
    [st.mode, st.stackingResult, st.nearLimit, st.farLimit, st.depthMm, st.macroRows])

  const modeToggle = (
    <ModeToggle
      title={t('modeTitle')}
      options={[
        { value: 'distance' as const, label: t('distanceMode') },
        { value: 'macro' as const, label: t('macroMode') },
      ]}
      value={st.mode}
      onChange={st.setMode}
    />
  )
  const settings = st.mode === 'distance'
    ? <StackingSettingsPanel state={st} />
    : <MacroSettingsPanel state={st} />
  const results = st.mode === 'distance'
    ? <StackingResultsPanel state={st} />
    : <MacroResultsPanel state={st} />

  return (
    <div className={s.app}>
      <ToolHeading slug="focus-stacking-calculator" />
      <div className={s.appBody}>
        <div className={s.sidebar}>
          <ToolActions toolSlug="focus-stacking-calculator" />
          {modeToggle}
          {settings}
          {results}
        </div>
        <div className={s.canvasArea}>
          <button
            type="button"
            className={s.playBtn}
            onClick={() => {
              st.trackParam({ param_name: 'animate_stack', param_value: playing ? 'pause' : 'play', input_type: 'button' })
              toggle()
            }}
          >
            {playing ? t('pauseStack') : t('animateStack')}
          </button>
          <SceneStrip state={st} scale={scale} />
          <StackingDiagram state={st} scale={scale} playing={playing} />
          <ShotTable state={st} playing={playing} />
        </div>
        <div className={s.desktopOnly}>
          <LearnPanel slug="focus-stacking-calculator" />
        </div>
      </div>
      <div className={s.mobileControls}>
        {modeToggle}
        {settings}
        {results}
      </div>
      <RelatedTools variant="inline" currentSlug="focus-stacking-calculator" />
      <div className={s.mobileOnly}>
        <LearnPanel slug="focus-stacking-calculator" />
      </div>
    </div>
  )
}
