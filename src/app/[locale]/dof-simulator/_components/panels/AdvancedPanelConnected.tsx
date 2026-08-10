'use client'

import { useTranslations } from 'next-intl'
import { AdvancedPanel, type AdvancedLabels } from './AdvancedPanel'
import type { OpticsApi } from '../state/useOptics'
import type { DofBackground } from '@/lib/data/dofSimulator/types'
import type { UiPrefsApi } from '../state/useUiPrefs'

interface AdvancedPanelConnectedProps {
  optics: OpticsApi
  background: DofBackground
  uiPrefs: UiPrefsApi
}

export function AdvancedPanelConnected({ optics, background, uiPrefs }: AdvancedPanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: AdvancedLabels = {
    advanced: t('advanced'),
    customCoc: t('customCoc'),
    backgroundDistance: t('backgroundDistance'),
  }

  return <AdvancedPanel optics={optics} background={background} uiPrefs={uiPrefs} labels={labels} />
}
