'use client'

import { useTranslations } from 'next-intl'
import type { StackingState } from './useStackingState'
import s from './FocusStacking.module.css'

interface MacroSettingsPanelProps {
  state: StackingState
}

// Placeholder — full macro settings UI (magnification/depth fields, ∞ toggle)
// lands in Task 7. This stub only needs to render without crashing so mode
// switching compiles end-to-end.
export function MacroSettingsPanel({ state: _state }: MacroSettingsPanelProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')

  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>{t('settings')}</h3>
    </div>
  )
}
