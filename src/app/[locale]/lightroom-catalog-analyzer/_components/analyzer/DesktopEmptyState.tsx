'use client'

import { useTranslations } from 'next-intl'
import { FilePicker, type FilePickerMeta } from './FilePicker'
import { PrivacyBadge } from './PrivacyBadge'
import styles from './LightroomCatalogAnalyzer.module.css'

interface DesktopEmptyStateProps {
  onFile: (buffer: ArrayBuffer, meta: FilePickerMeta) => void
  onDemo: () => void
}

export function DesktopEmptyState({ onFile, onDemo }: DesktopEmptyStateProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  return (
    <section className={styles.desktopEmpty} data-testid="desktop-empty">
      <header className={styles.emptyHeader}>
        <h1 className={styles.emptyHeadline}>{t('desktop.headline')}</h1>
        <PrivacyBadge />
      </header>
      <p className={styles.emptySubhead}>{t('desktop.subhead')}</p>
      <FilePicker onFile={onFile} />
      <p className={styles.emptyExplainer}>{t('desktop.explainer')}</p>
      <button type="button" className={styles.demoButton} onClick={onDemo}>
        {t('desktop.tryDemo')}
      </button>
    </section>
  )
}
