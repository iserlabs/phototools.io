'use client'

import { useTranslations } from 'next-intl'
import { LensPanel, type LensLabels } from './LensPanel'
import { useDofTooltips } from '../state/useDofTooltips'
import type { OpticsApi } from '../state/useOptics'
import type { DofDerived } from '../state/useDofDerived'
import type { UiPrefsApi } from '../state/useUiPrefs'

interface LensPanelConnectedProps {
  optics: OpticsApi
  derived: DofDerived
  uiPrefs: UiPrefsApi
  onFocalLengthChange(v: number): void
}

export function LensPanelConnected({ optics, derived, uiPrefs, onFocalLengthChange }: LensPanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')
  const tooltips = useDofTooltips()

  const labels: LensLabels = {
    lens: t('lens'),
    focalLength: t('focalLength'),
    aperture: t('aperture'),
    teleconverter: t('teleconverter'),
    teleconverterNone: t('teleconverterNone'),
    searchPlaceholder: t('lensSearchPlaceholder'),
    clear: t('clear'),
  }

  return (
    <LensPanel
      optics={optics}
      derived={derived}
      uiPrefs={uiPrefs}
      onFocalLengthChange={onFocalLengthChange}
      labels={labels}
      tooltips={tooltips}
    />
  )
}
