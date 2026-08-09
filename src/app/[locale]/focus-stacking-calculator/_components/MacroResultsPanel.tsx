'use client'

import { useTranslations } from 'next-intl'
import type { StackingState } from './useStackingState'
import s from './FocusStacking.module.css'

interface MacroResultsPanelProps {
  state: StackingState
}

// Placeholder — full macro results UI (shot count, rail travel, diffraction
// warning, exports) lands in Task 8. This stub only needs to render without
// crashing so mode switching compiles end-to-end.
export function MacroResultsPanel({ state: _state }: MacroResultsPanelProps) {
  const t = useTranslations('toolUI.focus-stacking-calculator')

  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>{t('results')}</h3>
    </div>
  )
}
