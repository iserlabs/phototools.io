'use client'

import { useDofState } from './useDofState'
import { DofSettingsPanel } from './DofSettingsPanel'
import { DofResultsPanel } from './DofResultsPanel'
import { FramingPanel } from './FramingPanel'
import { BokehPanel } from './BokehPanel'
import { DofToolbar } from './DofToolbar'
import { DofViewport } from './DofViewport'
import { DofDiagramBar } from './DofDiagramBar'
import { BlurProfileGraph } from './BlurProfileGraph'
import { ABComparison } from './ABComparison'
import { SubjectFigure } from './SubjectFigure'
import { FocusTarget } from './FocusTarget'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import { ModeToggle } from '@/components/shared/ModeToggle'
import s from './DofSimulator.module.css'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'

export function DofSimulator() {
  const { trackParam } = useToolSession()
  const {
    focalLength, aperture, subjectDistance, sensorWidth, sensorHeight, coc,
    scene, sceneKey, setSceneKey, subjectMode, setSubjectMode,
    abMode, setAbMode, bokehShape, setBokehShape,
    useDiffraction, setUseDiffraction,
    bFocalLength, setBAperture, bAperture, setBFocalLength,
    bSubjectDistance, setBSubjectDistance, bSensorId, setBSensorId, bSensorWidth,
    activeSet, setActiveSet, dividerPos, setDividerPos,
    activeFramingPreset, setActiveFramingPreset,
    framingLockMode, setFramingLockMode,
    orientation, setOrientation,
    dofResult, backgroundBlurPct, setSubjectDistance,
    settingsProps, resultsProps,
    abSetOptions, isInFocus,
  } = useDofState()

  return (
    <div className={s.app}>
      <ToolHeading slug="dof-simulator" />
      <div className={s.appBody}>
        {/* ── Sidebar ── */}
        <div className={s.sidebar}>
          <ToolActions toolSlug="dof-simulator" />

          {abMode !== 'off' && (
            <ModeToggle options={abSetOptions} value={activeSet} onChange={setActiveSet} />
          )}

          {activeSet === 'a' || abMode === 'off' ? (
            <DofSettingsPanel {...settingsProps}
              onFocalLengthChange={(v) => { trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' }); settingsProps.onFocalLengthChange(v) }}
              onApertureChange={(v) => { trackParam({ param_name: 'aperture', param_value: String(v), input_type: 'select' }); settingsProps.onApertureChange(v) }}
            />
          ) : (
            <DofSettingsPanel
              focalLength={bFocalLength} aperture={bAperture}
              subjectDistance={bSubjectDistance} sensorId={bSensorId}
              orientation={orientation} sweetSpot={null}
              onFocalLengthChange={setBFocalLength} onApertureChange={setBAperture}
              onDistanceChange={setBSubjectDistance} onSensorChange={setBSensorId}
              onOrientationChange={setOrientation}
            />
          )}

          <FramingPanel
            activePreset={activeFramingPreset}
            lockMode={framingLockMode}
            onPresetClick={setActiveFramingPreset}
            onLockModeChange={setFramingLockMode}
          />

          <BokehPanel
            bokehShape={bokehShape}
            useDiffraction={useDiffraction}
            onBokehShapeChange={setBokehShape}
            onDiffractionChange={setUseDiffraction}
          />

          <DofResultsPanel {...resultsProps} />
        </div>

        {/* ── Center ── */}
        <div className={s.canvasArea}>
          <DofToolbar
            sceneKey={sceneKey}
            onSceneChange={setSceneKey}
            subjectMode={subjectMode}
            onSubjectModeChange={setSubjectMode}
            abMode={abMode}
            onABModeChange={setAbMode}
            blurPct={backgroundBlurPct}
          />

          <div className={s.canvasMain}>
            <ABComparison
              mode={abMode}
              dividerPosition={dividerPos}
              onDividerChange={setDividerPos}
              settingsLabelA={`A: f/${aperture} \u00b7 ${focalLength}mm`}
              settingsLabelB={`B: f/${bAperture} \u00b7 ${bFocalLength}mm`}
              viewportA={
                <DofViewport
                  scene={scene} focalLength={focalLength} aperture={aperture}
                  subjectDistance={subjectDistance} sensorWidth={sensorWidth}
                  useDiffraction={useDiffraction}
                />
              }
              viewportB={
                <DofViewport
                  scene={scene} focalLength={bFocalLength} aperture={bAperture}
                  subjectDistance={bSubjectDistance} sensorWidth={bSensorWidth}
                  useDiffraction={useDiffraction}
                />
              }
            />

            {subjectMode === 'figure' && (
              <SubjectFigure
                subjectDistance={subjectDistance}
                focalLength={focalLength}
                sensorHeight={sensorHeight}
                viewportHeight={400}
                focalResult={{ nearFocus: dofResult.nearFocus, farFocus: dofResult.farFocus }}
              />
            )}
            {subjectMode === 'target' && (
              <FocusTarget isInFocus={isInFocus} distance={subjectDistance} />
            )}
          </div>

          <DofDiagramBar
            distance={subjectDistance}
            nearFocus={dofResult.nearFocus}
            farFocus={dofResult.farFocus}
            onDistanceChange={setSubjectDistance}
          />

          <BlurProfileGraph
            focalLength={focalLength}
            aperture={aperture}
            subjectDistance={subjectDistance}
            coc={coc}
          />
        </div>

        {/* ── LearnPanel (desktop) ── */}
        <div className={s.desktopOnly}>
          <LearnPanel slug="dof-simulator" />
        </div>
      </div>

      {/* ── Mobile controls ── */}
      <div className={s.mobileControls}>
        <DofSettingsPanel {...settingsProps} />
        <DofResultsPanel {...resultsProps} />
      </div>

      <div className={s.mobileOnly}>
        <LearnPanel slug="dof-simulator" />
      </div>
    </div>
  )
}
