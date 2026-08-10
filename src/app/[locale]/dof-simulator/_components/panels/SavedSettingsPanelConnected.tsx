'use client'

import { useTranslations } from 'next-intl'
import { SavedSettingsPanel, type SavedSettingsLabels } from './SavedSettingsPanel'
import type { SavedSettingsApi } from '../state/useSavedSettings'
import type { SavedRow } from '../state/savedSettingsStore'

// The translated entry point for SavedSettingsPanel: calls useTranslations()
// and passes the resulting strings down as the `labels` prop. SavedSettingsPanel
// itself stays presentational (no i18n calls) — see SavedSettingsPanel.tsx and
// results.test.tsx. Task 24's composition root should render this component,
// not SavedSettingsPanel directly.

interface SavedSettingsPanelConnectedProps {
  saved: SavedSettingsApi
  current: Omit<SavedRow, 'id'>
  onApply(row: SavedRow): void
  imperial?: boolean
}

export function SavedSettingsPanelConnected({ saved, current, onApply, imperial }: SavedSettingsPanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: SavedSettingsLabels = {
    title: t('savedSettings'),
    columnCamera: t('camera'),
    columnFocalLength: t('focalLength'),
    columnAperture: t('aperture'),
    columnDistance: t('distance'),
    remove: t('removeSaved'),
    saveSettings: t('saveSettings'),
    empty: t('noSavedSettings'),
    distanceUnit: t('distanceUnit'),
  }

  return <SavedSettingsPanel saved={saved} current={current} onApply={onApply} imperial={imperial} labels={labels} />
}
