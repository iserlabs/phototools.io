'use client'

import { useTranslations } from 'next-intl'
import styles from './LightroomCatalogAnalyzer.module.css'

export function PrivacyBadge() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  return (
    <span className={styles.privacyBadge} aria-label={t('privacyBadgeAria')} role="status">
      <span className={styles.privacyBadgeDot} aria-hidden="true" />
      {t('privacyBadge')}
    </span>
  )
}
