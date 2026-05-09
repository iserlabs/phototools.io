'use client'

import { useTranslations } from 'next-intl'
import styles from './DraftBanner.module.css'

export function DraftBanner() {
  const t = useTranslations('common.draft')

  return (
    <div className={styles.banner} role="status">
      {t('banner')}
    </div>
  )
}
