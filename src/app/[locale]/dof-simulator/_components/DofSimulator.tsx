'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useDofState } from './state/useDofState'
import { getSubjectById } from '@/lib/data/dofSimulator/models'
import { getBackgroundById } from '@/lib/data/dofSimulator/backgrounds'
import type { FramingPresetDef } from '@/lib/data/dofSimulator/types'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { Sidebar } from './Sidebar'
import { CenterStage } from './CenterStage'
import styles from './DofSimulator.module.css'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'

/**
 * Composition root: wires the `useDofState()` facade into the three-column
 * layout (sidebar of Connected panels, center viewport + ruler, right
 * LearnPanel) — see CenterStage.tsx and Sidebar.tsx for the two halves this
 * splits into to stay under the 200-line file limit. FL/aperture/distance/
 * preset edits route through `useToolSession().trackParam`, matching the
 * old build's analytics coverage.
 */
export function DofSimulator() {
  const dofState = useDofState()
  const { trackParam } = useToolSession()
  const { optics, appearance } = dofState

  const subject = getSubjectById(appearance.subjectId)
  const background = getBackgroundById(appearance.backgroundId)

  const handleFocalLengthChange = useCallback(
    (v: number) => {
      trackParam({ param_name: 'focal_length', param_value: String(v), input_type: 'slider' })
      dofState.changeFocalLength(v)
    },
    [dofState, trackParam],
  )

  const handleDistanceChange = useCallback(
    (v: number) => {
      trackParam({ param_name: 'distance', param_value: String(v), input_type: 'slider' })
      dofState.changeDistance(v)
    },
    [dofState, trackParam],
  )

  const handleFocalLengthChangeB = useCallback(
    (v: number) => {
      trackParam({ param_name: 'focal_length_b', param_value: String(v), input_type: 'slider' })
      dofState.changeFocalLengthB(v)
    },
    [dofState, trackParam],
  )

  const handleDistanceChangeB = useCallback(
    (v: number) => {
      trackParam({ param_name: 'distance_b', param_value: String(v), input_type: 'slider' })
      dofState.changeDistanceB(v)
    },
    [dofState, trackParam],
  )

  const handlePreset = useCallback(
    (key: FramingPresetDef['key']) => {
      trackParam({ param_name: 'framing_preset', param_value: key, input_type: 'button' })
      dofState.applyFramingPreset(key)
    },
    [dofState, trackParam],
  )

  // Aperture has no facade-level change handler to route through (LensPanel
  // calls optics.setAperture directly — no lock-FOV concern applies to it),
  // so it's tracked here by watching the resulting state instead, mirroring
  // the "FL/aperture/distance/preset" tracking coverage the old build had.
  const prevApertureRef = useRef(optics.aperture)
  useEffect(() => {
    if (prevApertureRef.current === optics.aperture) return
    prevApertureRef.current = optics.aperture
    trackParam({ param_name: 'aperture', param_value: String(optics.aperture), input_type: 'slider' })
  }, [optics.aperture, trackParam])

  const sidebarProps = {
    dofState, background,
    onFocalLengthChange: handleFocalLengthChange,
    onDistanceChange: handleDistanceChange,
    onFocalLengthChangeB: handleFocalLengthChangeB,
    onDistanceChangeB: handleDistanceChangeB,
    onPreset: handlePreset,
    onReset: dofState.reset,
  }

  return (
    <div className={styles.app}>
      <ToolHeading slug="dof-simulator" />
      <div className={styles.appBody}>
        <aside className={styles.sidebar}>
          <Sidebar {...sidebarProps} />
        </aside>

        <CenterStage dofState={dofState} subject={subject} background={background} onDistanceChange={handleDistanceChange} />

        <div className={styles.desktopOnly}>
          <LearnPanel slug="dof-simulator" />
        </div>
      </div>

      <div className={styles.mobileControls}>
        <Sidebar {...sidebarProps} hideTitle />
      </div>

      <RelatedTools variant="inline" currentSlug="dof-simulator" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="dof-simulator" />
      </div>
    </div>
  )
}
