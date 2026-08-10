'use client'

import { useTranslations } from 'next-intl'
import { ControlPanel } from '@/components/shared/ControlPanel'
import { ModeToggle } from '@/components/shared/ModeToggle'
import type { UiPrefsApi } from '../state/useUiPrefs'

interface InterfacePanelProps {
  uiPrefs: UiPrefsApi
}

export function InterfacePanel({ uiPrefs }: InterfacePanelProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const modeOptions = [
    { value: 'basic' as const, label: t('basic') },
    { value: 'advanced' as const, label: t('advanced') },
  ]
  const unitOptions = [
    { value: 'metric' as const, label: t('metric') },
    { value: 'imperial' as const, label: t('imperial') },
  ]

  return (
    <ControlPanel>
      <ModeToggle
        options={modeOptions}
        value={uiPrefs.advanced ? 'advanced' : 'basic'}
        onChange={(v) => uiPrefs.setAdvanced(v === 'advanced')}
      />
      <ModeToggle
        options={unitOptions}
        value={uiPrefs.imperial ? 'imperial' : 'metric'}
        onChange={(v) => uiPrefs.setImperial(v === 'imperial')}
      />
    </ControlPanel>
  )
}
