'use client'

import { useTranslations } from 'next-intl'
import { DistancePanel, type DistanceLabels } from './DistancePanel'
import type { OpticsApi } from '../state/useOptics'
import type { DofDerived } from '../state/useDofDerived'
import type { UiPrefsApi } from '../state/useUiPrefs'

interface DistancePanelConnectedProps {
  optics: OpticsApi
  derived: DofDerived
  uiPrefs: UiPrefsApi
  onDistanceChange(v: number): void
}

export function DistancePanelConnected({ optics, derived, uiPrefs, onDistanceChange }: DistancePanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: DistanceLabels = {
    distance: t('distance'),
    minFocusWarning: (value) => t('minFocusWarning', { value }),
  }

  return (
    <DistancePanel
      optics={optics}
      derived={derived}
      uiPrefs={uiPrefs}
      onDistanceChange={onDistanceChange}
      labels={labels}
    />
  )
}
