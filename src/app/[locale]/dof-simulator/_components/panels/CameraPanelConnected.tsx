'use client'

import { useTranslations } from 'next-intl'
import { CameraPanel, type CameraLabels } from './CameraPanel'
import type { OpticsApi } from '../state/useOptics'
import type { DofDerived } from '../state/useDofDerived'

interface CameraPanelConnectedProps {
  optics: OpticsApi
  derived: DofDerived
}

export function CameraPanelConnected({ optics, derived }: CameraPanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: CameraLabels = {
    camera: t('camera'),
    sensor: t('sensor'),
    cropFactor: t('cropFactor'),
    searchPlaceholder: t('cameraSearchPlaceholder'),
    clear: t('clear'),
  }

  return <CameraPanel optics={optics} derived={derived} labels={labels} />
}
