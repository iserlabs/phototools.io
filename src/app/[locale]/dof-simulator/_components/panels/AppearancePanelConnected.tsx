'use client'

import { useTranslations } from 'next-intl'
import { AppearancePanel, type AppearanceLabels } from './AppearancePanel'
import type { AppearanceApi } from '../state/useAppearance'
import type { DofSubject, DofBackground } from '@/lib/data/dofSimulator/types'

// The translated entry point for AppearancePanel: calls useTranslations()
// and passes the resulting strings down as the `labels` prop. AppearancePanel
// itself stays presentational (no i18n calls) so it can be unit-tested
// without a NextIntlClientProvider — see AppearancePanel.tsx and
// appearance.test.tsx. Task 24's composition root should render this
// component, not AppearancePanel directly.

interface AppearancePanelConnectedProps {
  appearance: AppearanceApi
  subjects: DofSubject[]
  backgrounds: DofBackground[]
}

export function AppearancePanelConnected({ appearance, subjects, backgrounds }: AppearancePanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: AppearanceLabels = {
    appearance: t('appearance'),
    model: t('model'),
    background: t('background'),
    landscape: t('landscape'),
    portrait: t('portrait'),
    modelPicker: { title: t('chooseModel'), close: t('close') },
    backgroundPicker: { title: t('chooseBackground'), close: t('close') },
  }

  return (
    <AppearancePanel
      appearance={appearance}
      subjects={subjects}
      backgrounds={backgrounds}
      labels={labels}
    />
  )
}
