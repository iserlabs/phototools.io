'use client'

import { useTranslations } from 'next-intl'
import { FilePicker } from './FilePicker'
import { PrivacyBadge } from './PrivacyBadge'
import styles from './LightroomCatalogAnalyzer.module.css'

interface UploaderPanelProps {
  onFile: (file: File) => void
  onDemo: () => void
}

// The catalog uploader as a persistent left-sidebar panel. Living in the idle
// state's sidebar (the same rail that holds catalog meta + Drilldown once a
// catalog is loaded) makes opening a catalog a one-step action — no separate
// landing → dashboard hop. Reuses the very FilePicker/PrivacyBadge the loaded
// dashboard uses, so the affordance is identical before and after parse.
export function UploaderPanel({ onFile, onDemo }: UploaderPanelProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  return (
    <div className={styles.uploaderPanel}>
      <PrivacyBadge />
      <FilePicker onFile={onFile} />
      <button type="button" className={styles.demoButton} onClick={onDemo}>
        {t('desktop.tryDemo')}
      </button>
      <p className={styles.emptyExplainer}>{t('desktop.explainer')}</p>
    </div>
  )
}
