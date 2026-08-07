'use client'

import { useTranslations } from 'next-intl'
import styles from './DraftBanner.module.css'

interface DraftBannerProps {
  messageKey?: 'banner' | 'guideBanner'
}

export function DraftBanner({ messageKey = 'banner' }: DraftBannerProps) {
  const t = useTranslations('common.draft')

  return (
    <div className={styles.banner} role="status">
      {t(messageKey)}
    </div>
  )
}
