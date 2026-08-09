'use client'

import { useTranslations } from 'next-intl'
import { FramingPanel, type FramingLabels } from './FramingPanel'
import type { FramingApi } from '../state/useFraming'
import type { FramingPresetDef } from '@/lib/data/dofSimulator/types'

interface FramingPanelConnectedProps {
  framing: FramingApi
  onPreset(key: FramingPresetDef['key']): void
}

export function FramingPanelConnected({ framing, onPreset }: FramingPanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: FramingLabels = {
    framing: t('framing'),
    presetFace: t('framingPresetFace'),
    presetPortrait: t('framingPresetPortrait'),
    presetMedium: t('framingPresetMedium'),
    presetAmerican: t('framingPresetAmerican'),
    presetFull: t('framingPresetFull'),
    lockFov: t('lockFov'),
  }

  return <FramingPanel framing={framing} onPreset={onPreset} labels={labels} />
}
